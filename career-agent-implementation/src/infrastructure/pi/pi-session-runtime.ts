export interface PiSessionHandle {
  id: string;
  prompt(message: string): Promise<string>;
  close(): Promise<void>;
}

export interface CreatePiSessionSpec {
  cwd: string;
  systemPrompt: string;
  tools: string[];
  name?: string;
}

export interface PiSessionRuntime {
  createSession(spec: CreatePiSessionSpec): Promise<PiSessionHandle>;
  runOneShot(spec: CreatePiSessionSpec, prompt: string): Promise<string>;
  runStructured<T>(spec: CreatePiSessionSpec, prompt: string): Promise<{ output: T; rawText: string }>;
}
