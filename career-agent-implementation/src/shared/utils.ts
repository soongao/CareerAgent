import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir, appendFile, access, rename, copyFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

export const nowIso = (): string => new Date().toISOString();
export const newId = (prefix = "id"): string => `${prefix}_${randomUUID()}`;
export const clamp = (n: number, min = 0, max = 1): number => Math.max(min, Math.min(max, n));
export const daysBetween = (fromIso: string, to = new Date()): number => Math.max(0, (to.getTime() - new Date(fromIso).getTime()) / 86400000);
export const uniq = <T>(xs: T[]): T[] => [...new Set(xs)];
export const sortBy = <T>(xs: T[], score: (x: T) => number): T[] => [...xs].sort((a,b)=>score(b)-score(a));
export const stableJson = (value: unknown): string => JSON.stringify(value, null, 2) + "\n";

export async function fileExists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

export async function readJson<T>(path: string, fallback: T): Promise<T> {
  if (!(await fileExists(path))) return fallback;
  return JSON.parse(await readFile(path, "utf8")) as T;
}

export async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, stableJson(value), "utf8");
  await rename(tmp, path);
}

export async function appendJsonl(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, JSON.stringify(value) + "\n", "utf8");
}

export async function readJsonl<T>(path: string): Promise<T[]> {
  if (!(await fileExists(path))) return [];
  const text = await readFile(path, "utf8");
  const out: T[] = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line) as T); }
    catch (error) { throw new Error(`Invalid JSONL at ${path}:${index+1}: ${(error as Error).message}`); }
  }
  return out;
}

export function safeResolve(root: string, relativePath: string): string {
  const resolvedRoot = resolve(root);
  const candidate = resolve(resolvedRoot, relativePath);
  if (candidate !== resolvedRoot && !candidate.startsWith(resolvedRoot + sep)) throw new Error(`Path escapes workspace root: ${relativePath}`);
  return candidate;
}

export async function copyIfExists(source: string, dest: string): Promise<boolean> {
  if (!(await fileExists(source))) return false;
  await mkdir(dirname(dest), { recursive: true });
  await copyFile(source, dest);
  return true;
}

export function parseJsonFromModel(text: string): unknown {
  const trimmed = text.trim();
  try { return JSON.parse(trimmed); } catch {}
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return JSON.parse(fenced[1]);
  const start = Math.min(...[trimmed.indexOf("{"), trimmed.indexOf("[")].filter(i=>i>=0));
  if (Number.isFinite(start)) {
    const opener = trimmed[start];
    const closer = opener === "{" ? "}" : "]";
    const end = trimmed.lastIndexOf(closer);
    if (end > start) return JSON.parse(trimmed.slice(start, end + 1));
  }
  throw new Error("Model response did not contain valid JSON");
}

export function lexicalTokens(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9._+#\-\u4e00-\u9fff]+/g, " ").split(/\s+/).filter(Boolean);
}

export function similarity(query: string, text: string): number {
  const q = lexicalTokens(query); const t = new Set(lexicalTokens(text));
  if (!q.length) return 0;
  let score = 0;
  for (const token of q) if (t.has(token)) score += 1;
  return score / q.length;
}
