# 19. ADR, Invariants & Rejected Alternatives

## 1. Accepted Architectural Decisions

| ADR | Decision |
|---|---|
| ADR-001 | Custom lightweight outer Workflow，不使用 fully agent-driven orchestrator |
| ADR-002 | One action then replan |
| ADR-003 | One active interactive task per user |
| ADR-004 | No task nesting |
| ADR-005 | Assessment/Tutor/Interview 独立 Agent Definitions，共享 runtime |
| ADR-006 | Task Agent 与 Evaluator 分离 |
| ADR-007 | File workspace 为 source of truth；runtime recoverable |
| ADR-008 | Local-first，无 DB v1 |
| ADR-009 | Competency 命名替代用户领域 Skill |
| ADR-010 | Canonical Competency DAG + hybrid retrieval/mapping |
| ADR-011 | Global competency state + target-specific requirements |
| ADR-012 | Evidence only existing materials；不主动制造 evidence |
| ADR-013 | Claim-level Resume support |
| ADR-014 | Pi extension-first / built-in tool first |
| ADR-015 | Same-process independent Pi AgentSession v1 |
| ADR-016 | All executable units structured output |
| ADR-017 | Observation append-only + amendment semantics |
| ADR-018 | Runtime event 与 user observation 分离 |
| ADR-019 | Readiness multidimensional, blocker-based, no overall percent |
| ADR-020 | User controls active Career Target/Target Job |
| ADR-021 | Career Mode works without JD |
| ADR-022 | Real outcome feedback but outcome itself is not mastery evidence |
| ADR-023 | Current market evidence supplements but does not override JD |
| ADR-024 | `stale ≠ weak` |
| ADR-025 | Model/prompt upgrade cannot silently rewrite history |

## 2. Architecture Invariants

| ID | Invariant |
|---|---|
| INV-01 | Task Agent cannot directly mutate long-term User Model. |
| INV-02 | Runtime Error cannot become negative user Observation. |
| INV-03 | Resume Claim cannot be strengthened without factual/evidence provenance. |
| INV-04 | Learning cannot automatically become project/work Evidence. |
| INV-05 | Interview completion does not auto-update Resume. |
| INV-06 | At most one active interactive Task. |
| INV-07 | Tasks do not nest. |
| INV-08 | Workflow commits one Action then replans. |
| INV-09 | User intent cannot bypass runtime/policy constraints. |
| INV-10 | Agent cannot switch Career Target / Target Job without user authorization. |
| INV-11 | Raw Observation is not silently overwritten/deleted. |
| INV-12 | Persisted history is not equivalent to active LLM context. |
| INV-13 | Stale cannot be treated as weak. |
| INV-14 | Rejection/Offer by itself does not change mastery. |
| INV-15 | External content is data, never policy authority. |
| INV-16 | Model/prompt upgrade cannot silently rewrite long-term state. |
| INV-17 | Taught/feedback-contaminated Assessment/Interview cannot continue as original measurement. |
| INV-18 | Supported Evidence does not support every Claim. |

## 3. Explicitly Rejected / Deprecated

### Fully Agent-driven outer loop

Rejected: harder lifecycle/recovery/invariant control; current design retains agentic behavior inside tasks and semantic decision nodes.

### Third-party workflow framework v1

Rejected: current workflow state is simple; avoids dual source of truth. Can revisit only when requirements demonstrate need.

### Fixed source weights

Rejected: `Assessment=1.0`, `Interview=.75` etc. replaced by evaluator semantic evidenceStrength/confidence + runtime caps.

### BUILD_EVIDENCE

Rejected: system does not create new evidence projects; `ANALYZE_EVIDENCE` only analyzes existing materials.

### Resume update after every Interview

Rejected: only update on evidence/target/mismatch/user request.

### Custom read_xxx/write_xxx wrappers

Rejected when built-in Pi tools already provide the primitive operation.

### Parent competency mastery propagation

Rejected: taxonomy node has no user mastery; readiness aggregates children at query time.

### Vector DB as default memory

Rejected: local file + lexical retrieval sufficient until measured need.

## 4. Change Review Checklist

Any architectural change must answer：

- Does it introduce a new source of truth?
- Does it blur Competency/Evidence/Interview/Resume?
- Does it preserve one-action-replan?
- Does it require a new AgentSession, or should it be Skill/service?
- Can built-in Pi tooling do the primitive work?
- What is the provenance and replay story?
- How is it evaluated?
- Does it weaken truthfulness or target isolation?
