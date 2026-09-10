import { newId, parseJsonFromModel } from "../../shared/utils.js";
import type { CreatePiSessionSpec, PiSessionHandle, PiSessionRuntime } from "./pi-session-runtime.js";

export interface CapturedPiTurn {
  sessionName?: string;
  promptContains?: string;
  response: string;
  provenance: string;
  capturedAt: string;
  model: string;
}

export interface CapturedPiTraceSink {
  onSessionCreated?(event: { sessionId: string; spec: CreatePiSessionSpec }): Promise<void> | void;
  onPrompt?(event: { sessionId: string; sessionName?: string; prompt: string; response: string; turn: CapturedPiTurn }): Promise<void> | void;
  onSessionClosed?(event: { sessionId: string; sessionName?: string }): Promise<void> | void;
}

/**
 * Deterministic runtime used only for trace campaigns.
 * The responses are captured outputs authored by a real LLM (the assistant running
 * the campaign), not expected-value mocks. Production never instantiates this class.
 */
export class AssistantCapturedPiRuntime implements PiSessionRuntime {
  private cursor = 0;
  constructor(private readonly turns: CapturedPiTurn[], private readonly sink?: CapturedPiTraceSink) {}

  async createSession(spec: CreatePiSessionSpec): Promise<PiSessionHandle> {
    const id = newId("captured-pi");
    await this.sink?.onSessionCreated?.({ sessionId: id, spec });
    return {
      id,
      prompt: async (message: string) => {
        const turn = this.next(spec, message);
        await this.sink?.onPrompt?.({ sessionId: id, sessionName: spec.name, prompt: message, response: turn.response, turn });
        return turn.response;
      },
      close: async () => { await this.sink?.onSessionClosed?.({ sessionId: id, sessionName: spec.name }); },
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

  remaining(): number { return this.turns.length - this.cursor; }

  private next(spec: CreatePiSessionSpec, prompt: string): CapturedPiTurn {
    const turn = this.turns[this.cursor];
    if (!turn) throw new Error(`No assistant-captured Pi response remains for session '${spec.name ?? "unnamed"}'`);
    if (turn.sessionName && spec.name && !spec.name.startsWith(turn.sessionName)) {
      throw new Error(`Captured Pi session mismatch: expected '${turn.sessionName}', got '${spec.name}' at turn ${this.cursor}`);
    }
    if (turn.promptContains && !prompt.includes(turn.promptContains)) {
      throw new Error(`Captured Pi prompt mismatch at turn ${this.cursor}: expected prompt to contain '${turn.promptContains}'`);
    }
    this.cursor += 1;
    return turn;
  }
}
