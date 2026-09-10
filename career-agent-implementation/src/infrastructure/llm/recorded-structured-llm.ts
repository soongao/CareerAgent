import { readFile } from "node:fs/promises";
import type { StructuredLLM, StructuredLLMRequest, StructuredLLMResponse } from "./structured-llm.js";

interface RecordedEntry { name: string; output: unknown; model: string; provenance: string; capturedAt: string }

export class RecordedStructuredLLM implements StructuredLLM {
  private cursor = new Map<string, number>();
  constructor(private readonly entries: RecordedEntry[]) {}
  static async fromFile(path: string): Promise<RecordedStructuredLLM> {
    const data=JSON.parse(await readFile(path,"utf8")) as { entries: RecordedEntry[] };
    return new RecordedStructuredLLM(data.entries);
  }
  async complete<T>(request: StructuredLLMRequest): Promise<StructuredLLMResponse<T>> {
    const matches=this.entries.filter(e=>e.name===request.name);
    const i=this.cursor.get(request.name) ?? 0;
    const entry=matches[i];
    if (!entry) throw new Error(`No recorded real-model output for '${request.name}' at index ${i}`);
    this.cursor.set(request.name,i+1);
    return { output: structuredClone(entry.output) as T, rawText: JSON.stringify(entry.output), model: entry.model, promptVersion: request.promptVersion, recorded: true };
  }
}
