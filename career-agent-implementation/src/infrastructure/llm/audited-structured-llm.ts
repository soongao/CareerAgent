import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { StructuredLLM, StructuredLLMRequest, StructuredLLMResponse } from "./structured-llm.js";
import { newId, nowIso } from "../../shared/utils.js";

/**
 * Optional local audit decorator for real StructuredLLM calls.
 * It does not alter model outputs. Because inputs may contain resume/JD/private data,
 * enable it deliberately (CAREER_AGENT_TRACE_LLM=1) and protect the workspace accordingly.
 */
export class AuditedStructuredLLM implements StructuredLLM {
  constructor(private readonly delegate: StructuredLLM, private readonly jsonlPath: string) {}

  async complete<T>(request: StructuredLLMRequest): Promise<StructuredLLMResponse<T>> {
    const callId = newId("llmcall");
    await this.append({
      schemaVersion: 1,
      id: newId("llmevt"),
      callId,
      type: "llm.request",
      timestamp: nowIso(),
      name: request.name,
      promptVersion: request.promptVersion,
      allowedValues: request.allowedValues,
      sourceRefs: request.sourceRefs,
      system: request.system,
      input: request.input,
    });
    try {
      const response = await this.delegate.complete<T>(request);
      await this.append({
        schemaVersion: 1,
        id: newId("llmevt"),
        callId,
        type: "llm.response",
        timestamp: nowIso(),
        name: request.name,
        model: response.model,
        promptVersion: response.promptVersion,
        recorded: response.recorded ?? false,
        output: response.output,
        rawText: response.rawText,
      });
      return response;
    } catch (error) {
      await this.append({
        schemaVersion: 1,
        id: newId("llmevt"),
        callId,
        type: "llm.error",
        timestamp: nowIso(),
        name: request.name,
        promptVersion: request.promptVersion,
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
      });
      throw error;
    }
  }

  private async append(value: unknown): Promise<void> {
    await mkdir(dirname(this.jsonlPath), { recursive: true });
    await appendFile(this.jsonlPath, JSON.stringify(value) + "\n", "utf8");
  }
}
