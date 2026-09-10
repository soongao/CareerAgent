import type { SourceRef } from "../../domain/types.js";

export interface StructuredLLMRequest {
  name: string;
  system: string;
  input: unknown;
  promptVersion: string;
  allowedValues?: Record<string, string[]>;
  sourceRefs?: SourceRef[];
}

export interface StructuredLLMResponse<T> {
  output: T;
  rawText: string;
  model?: string;
  promptVersion: string;
  recorded?: boolean;
}

export interface StructuredLLM {
  complete<T>(request: StructuredLLMRequest): Promise<StructuredLLMResponse<T>>;
}
