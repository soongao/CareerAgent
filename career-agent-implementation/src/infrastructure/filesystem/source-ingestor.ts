import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);

export class SourceIngestor {
  async toText(path: string): Promise<string> {
    const ext=extname(path).toLowerCase();
    if ([".md",".txt",".json",".yaml",".yml",".csv"].includes(ext)) return readFile(path,"utf8");
    if (ext === ".pdf") {
      try { const { stdout }=await exec("pdftotext", ["-layout", path, "-"]); return stdout; }
      catch { throw new Error("PDF ingestion requires `pdftotext` on PATH. Install poppler-utils, or normalize the resume to .md/.txt first."); }
    }
    if (ext === ".docx") {
      try { const { stdout }=await exec("pandoc", [path,"-t","plain"]); return stdout; }
      catch { throw new Error("DOCX ingestion requires `pandoc` on PATH, or normalize the resume to .md/.txt first."); }
    }
    throw new Error(`Unsupported source type: ${ext || "(none)"}`);
  }
}
