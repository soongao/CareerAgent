import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { newId, parseJsonFromModel } from "../../shared/utils.js";
import type { CreatePiSessionSpec, PiSessionHandle, PiSessionRuntime } from "./pi-session-runtime.js";
export type { CreatePiSessionSpec, PiSessionHandle, PiSessionRuntime } from "./pi-session-runtime.js";

type PiModule = {
  createAgentSession: (options: Record<string, unknown>) => Promise<{ session: any }>;
  DefaultResourceLoader: new (options: Record<string, unknown>) => any;
  SessionManager: { inMemory: (cwd?: string) => any };
  getAgentDir: () => string;
  ModelRuntime: { create: (options?: Record<string, unknown>) => Promise<any> };
};

async function loadPi(): Promise<PiModule> {
  const vendoredDist = resolve(process.cwd(), "vendor/pi/source/packages/coding-agent/dist/index.js");
  const moduleName = process.env.PI_CODING_AGENT_MODULE
    || (existsSync(vendoredDist) ? pathToFileURL(vendoredDist).href : "@earendil-works/pi-coding-agent");
  try {
    const dynamicImport = new Function("m", "return import(m)") as (m: string) => Promise<unknown>;
    return await dynamicImport(moduleName) as PiModule;
  } catch (error) {
    throw new Error(`Unable to load Pi coding-agent module '${moduleName}'. Install Pi, run scripts/fetch-pi-source.sh, or set PI_CODING_AGENT_MODULE to an importable module. ${(error as Error).message}`);
  }
}

export class PiRuntimeAdapter implements PiSessionRuntime {
  async createSession(spec: CreatePiSessionSpec): Promise<PiSessionHandle> {
    const pi = await loadPi();
    const modelRuntime = await pi.ModelRuntime.create();
    const loader = new pi.DefaultResourceLoader({
      cwd: spec.cwd,
      agentDir: pi.getAgentDir(),
      noExtensions: true,
      noSkills: true,
      noPromptTemplates: true,
      noThemes: true,
      noContextFiles: true,
      systemPromptOverride: () => spec.systemPrompt,
      appendSystemPromptOverride: () => [],
      agentsFilesOverride: () => ({ agentsFiles: [] }),
    });
    await loader.reload();
    const { session } = await pi.createAgentSession({
      cwd: spec.cwd,
      resourceLoader: loader,
      tools: spec.tools,
      noTools: spec.tools.length === 0 ? "all" : undefined,
      sessionManager: pi.SessionManager.inMemory(spec.cwd),
      modelRuntime,
    });
    const id = newId("pi");
    return {
      id,
      prompt: async (message: string) => {
        await session.prompt(message);
        const text = typeof session.getLastAssistantText === "function" ? session.getLastAssistantText() : undefined;
        const resolved = text instanceof Promise ? await text : text;
        if (!resolved || !String(resolved).trim()) throw new Error("Pi session produced no assistant text");
        return String(resolved);
      },
      close: async () => { if (typeof session.dispose === "function") session.dispose(); },
    };
  }

  async runOneShot(spec: CreatePiSessionSpec, prompt: string): Promise<string> {
    const session = await this.createSession(spec);
    try { return await session.prompt(prompt); }
    finally { await session.close(); }
  }

  async runStructured<T>(spec: CreatePiSessionSpec, prompt: string): Promise<{ output: T; rawText: string }> {
    const rawText = await this.runOneShot(spec, prompt);
    return { output: parseJsonFromModel(rawText) as T, rawText };
  }
}
