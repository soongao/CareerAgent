# 12. Contracts, Events & File Layout

## 1. Structured Execution Envelope

所有 Tool / Skill / Task Agent 对 application 层返回结构化 envelope：

```ts
interface ExecutionResult<T> {
  executionId: string;
  sourceType: "tool" | "skill" | "subagent" | "service";
  sourceName: string;
  status: "completed" | "paused" | "failed" | "cancelled";
  summary?: string;
  observations?: Observation[];
  artifacts?: ArtifactRef[];
  payload?: T;
  error?: { code: string; message: string; retryable?: boolean };
}
```

统一 envelope，不统一业务 payload。

## 2. Task Inputs

```ts
interface AssessmentTaskInput {
  competencyId: string;
  targetJobId?: string;
}

interface TutorTaskInput {
  competencyIds: string[];
  learningGoal?: string;
  targetJobId?: string;
}

interface InterviewTaskInput {
  mode: InterviewMode;
  targetJobId?: string;
}
```

Input 创建后 immutable。修改目标 = 新 task。`paused` 表示可恢复，`cancelled` 表示用户明确放弃、默认不恢复。Task 完成后仍保留 task metadata、localState、transcript、result 与 events，用于 replay/eval。

## 3. Task Local State

使用 discriminated union，不用 `Record<string, unknown>` 作为核心业务 state。

示例：

```ts
interface AssessmentLocalState {
  coveredAreas: string[];
  probeCount: number;
  measurementStatus: "clean" | "contaminated";
}

interface TutorLocalState {
  objectives: string[];
  coveredTopics: string[];
}

interface InterviewLocalState {
  coveredTopics: string[];
  mode: InterviewMode;
  feedbackRequested: boolean;
}
```

Agent 自己复杂的临时推理无需全部结构化持久化；只保存恢复和审计需要的 minimal local state。

## 4. Transcript JSONL

每行：

```json
{"id":"msg-1","ts":"...","role":"assistant","content":"...","taskId":"task-1"}
{"id":"msg-2","ts":"...","role":"user","content":"...","taskId":"task-1"}
```

如包含 tool calls，可使用 typed event variant；不要依赖模型供应商原始 event 作为唯一长期格式。

## 5. Runtime Trace Event

建议统一 trace correlation：

```ts
interface TraceContext {
  traceId: string;
  executionId?: string;
  taskId?: string;
  evaluationId?: string;
  decisionId?: string;
}
```

关键 event：

```text
workflow.run.started
workflow.decision.created
task.started
task.message
task.paused
task.completed
evaluator.started
evaluator.completed
observation.appended
observation.amended
state.updated
resume.updated
target.changed
runtime.error
```

## 6. Version Fields

所有长期 machine-readable entity 包含：

- `schemaVersion`；
- prompt/model/rubric version（LLM output）；
- catalog version（role mapping）；
- state aggregator version（derived state）。

## 7. Workspace Schema Version

`workspace/users/<id>/meta.yaml`：

```yaml
schema_version: 1
created_at: ...
last_migrated_at: ...
```

migration 只修改 derived/structured representations；raw source/transcript/observation 不破坏性重写。

## 8. File Naming

- IDs 使用 UUIDv7/ULID/UUID（实现统一一种）；
- human-readable slug 只作展示，不作唯一身份；
- timestamp 使用 ISO 8601 UTC 存储；UI 再本地化。

## 9. ArtifactRef / SourceRef

```ts
interface ArtifactRef {
  id: string;
  kind: "file" | "resume" | "learning_note" | "report";
  path: string;
  version?: string;
}

interface SourceRef {
  id: string;
  kind: "user_input" | "file" | "transcript" | "web" | "market";
  locator: string;
  capturedAt?: string;
}
```

所有重要 semantic judgment 必须可反向定位 source/evidence。
