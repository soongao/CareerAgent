# 10. Pi Runtime & Tooling Integration

## 1. Selection

- 主 runtime：TypeScript / Node.js；
- Agent runtime：Pi coding-agent SDK/Core；
- 策略：**extension-first**；
- Pi Core 只在现有 extension/SDK contract 无法表达必要行为时修改；
- Python 仅作为个别 CLI/tool implementation，不成为 orchestration runtime。

## 2. Why Pi Fits

当前上游 Pi 提供：

- SDK embedding / `createAgentSession`；
- TypeScript Extensions；
- Agent Skills / `SKILL.md`；
- built-in file/shell tools；
- JSONL session persistence/compaction；
- 可通过 extensions 构建 sub-agent / permission / custom UI 等行为。

项目不依赖 Pi 自带一个完整 workflow framework，而使用这些 primitives 构建自己的 Career workflow。

## 3. Runtime Adapter

Domain/Application 层不能直接依赖具体 Pi package API。

```ts
interface AgentRuntimeAdapter {
  createSession(spec: AgentSessionSpec): Promise<AgentSessionHandle>;
  prompt(sessionId: string, message: string): Promise<void>;
  abort(sessionId: string): Promise<void>;
  close(sessionId: string): Promise<void>;
  subscribe(sessionId: string, handler: AgentEventHandler): Unsubscribe;
}
```

`PiRuntimeAdapter` 是唯一知道具体 `createAgentSession`、resource loader、tool registration 的实现。

原因：Pi API/包名可能演进；系统只需替换 adapter，不改变 workflow/domain。

## 4. Same-process Task Sessions

v1 选择：Assessment/Tutor/Interview 使用同一 Node process 内的独立 Pi AgentSession，而不是官方 subagent 示例的 child process 模式。

每个 session：

- 独立 system policy；
- 独立 transcript/context；
- 独立 tool allowlist；
- 独立 task ID；
- 共享底层 model/runtime infrastructure 可选。

如果 pinned Pi SDK 无法满足该模式，优先 extension/adapter 解决；最后才修改 Core。

## 5. Skills

Agent Skill 用 `SKILL.md` 表达适合 progressive disclosure 的领域能力，例如：

```text
skills/
├── role-analysis/SKILL.md
├── evidence-analysis/SKILL.md
└── resume/SKILL.md
```

Assessment/Tutor/Interview 不实现为 Skill，因为它们需要长期独立多轮 session policy。

## 6. Built-in Tool First

若本质是基础操作，使用 Pi 内置工具：

```text
read / write / edit / bash / grep / find / ls (按 pinned version 实际能力)
```

不要重新发明：

```text
read_user_profile
read_resume_file
write_profile
search_workspace_text
```

## 7. When Custom Tools Are Justified

至少满足一项：

- domain operation；
- strong schema；
- lifecycle/authorization；
- atomic invariant；
- structured query over domain index；
- idempotent state mutation。

候选：

```text
record_observation
query_observations
start_task
pause_task
complete_task
switch_active_target_job
apply_state_update
```

其中有些更适合作为 application service 而非暴露给 LLM Tool；只有模型需要主动调用时才注册成 Tool。

## 8. Tool Allowlists

示例原则：

| Agent | Default tools |
|---|---|
| Assessment | read/search relevant context；通常无需 write/bash |
| Tutor | read/search；必要时受控 web/docs tool；通常无需 workspace write |
| Interview | read relevant resume/context；尽量 read-only |
| Role/Evidence Skill | read/search；只通过 structured result 写 domain state |
| Resume Skill | read + controlled artifact write/patch，需 user confirmation |

Built-in tool first ≠ all tools for every agent。

## 9. Version Pinning

必须：

- package-lock/pnpm-lock/yarn lock；
- exact Pi package/version or git commit；
- `config/pi-runtime-version.json`；
- CI 中检查 adapter tests；
- 升级先跑 Golden Journeys / shadow eval。

## 10. Upstream Subagent Example

Pi 的上游 subagent example 使用独立 `pi` process 进行 isolated context delegation。它证明 extension 能表达 subagent behavior，但本项目的 interactive handoff 语义不同，因此不直接照搬；只借鉴 isolation/tool-config/event patterns。
