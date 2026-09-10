# 11. Implementation Architecture

## 1. Technology Choices

| Area | v1 Choice | Reason |
|---|---|---|
| Main language/runtime | TypeScript + Node.js | 与 Pi SDK/Extensions 一致 |
| Workflow | Custom lightweight runner | 状态简单，避免框架状态重复 |
| Runtime agent | Pi SDK/Core through adapter | 独立 AgentSession + extension ecosystem |
| Schema validation | Zod | TS typed structured LLM boundaries |
| Durable state | Local files | local-first、debuggable、可 Git/replay |
| Semantic docs | Markdown + YAML frontmatter | human/LLM readable |
| Events/transcripts | JSONL | append-only、stream/replay friendly |
| YAML | `yaml` package | stable parsing |
| Test | Vitest | TS unit/integration |
| Retrieval | lexical/metadata + LLM rerank | no Vector DB for v1 |
| Logging | structured JSONL + console adapter | same provenance model |

Avoid v1 dependencies: PostgreSQL, Redis, vector DB, Temporal, LangGraph, XState, Mastra workflow framework。

## 2. Repository Layout

```text
career-agent/
├── src/
│   ├── domain/
│   │   ├── competency/
│   │   ├── targets/
│   │   ├── evidence/
│   │   ├── resume/
│   │   ├── interview/
│   │   ├── observations/
│   │   └── common/
│   ├── application/
│   │   ├── bootstrap/
│   │   ├── workflow/
│   │   ├── readiness/
│   │   ├── state-update/
│   │   └── context/
│   ├── agents/
│   │   ├── runtime/
│   │   ├── assessment/
│   │   ├── tutor/
│   │   └── interview/
│   ├── evaluators/
│   ├── skills/
│   ├── infrastructure/
│   │   ├── pi/
│   │   ├── filesystem/
│   │   ├── retrieval/
│   │   └── tracing/
│   ├── tools/
│   └── cli-or-ui/
├── skills/
│   ├── role-analysis/SKILL.md
│   ├── evidence-analysis/SKILL.md
│   └── resume/SKILL.md
├── competency-catalog/
├── prompts/
│   ├── agents/
│   ├── evaluators/
│   └── decisions/
├── evals/
│   ├── fixtures/
│   ├── golden/
│   └── runners/
├── tests/
├── config/
├── workspace/             # gitignored user runtime state by default
└── docs/                  # this specification
```

## 3. Module Rules

### domain

纯类型、domain invariants、无 Pi/fs/LLM import。

### application

use cases / orchestration；依赖抽象 ports，不直接依赖 Pi concrete API。

### agents/evaluators

prompt + policy + typed output；通过 runtime/LLM adapter。

### infrastructure

实现 filesystem、Pi、retrieval、trace adapters。

## 4. Recommended Ports

```ts
interface WorkspaceRepository { /* facts/state/tasks */ }
interface ObservationRepository { /* append/query/amend */ }
interface RuntimeEventRepository { /* append/query */ }
interface AgentRuntimeAdapter { /* Pi sessions */ }
interface LLMStructuredService { /* typed model call */ }
interface CompetencyRetriever { /* canonical retrieval */ }
interface Clock { now(): Date }
interface IdGenerator { next(): string }
```

这使 deterministic tests 不需要启动 Pi/LLM。

## 5. Bootstrap Implementation Flow

```text
create workspace
→ ingest original resume/source
→ parse facts/claims
→ create career target
→ optional target job/JD analysis
→ map role competencies
→ extract weak resume competency observations
→ discover evidence candidates
→ deterministic state update
→ baseline master/target resume snapshots
→ build readiness
→ recommend diagnostic assessment
```

Diagnostic assessment 推荐但可跳过。

## 6. State Update v1 Algorithm

### 6.1 Active observations

- remove superseded；
- contested excluded from primary estimate by default；
- target match；
- schema valid。

### 6.2 Weight

```text
rawWeight = evidenceStrength * confidence
weight = min(rawWeight, sourceEvidenceCap[source])
```

v1 caps（configurable，不是固定 sourceWeight）：

```yaml
self_report: 0.30
resume: 0.25
tutor: 0.70
assessment: 1.00
interview: 1.00
evidence: 1.00
real_feedback: 1.00
```

这些 cap 只防止“自述/简历单独产生高确定性”；Assessment/Interview 实际强弱仍由 Evaluator 自己给 evidenceStrength。

### 6.3 Mastery

```text
mastery = Σ(weight_i * masterySignal_i) / Σ(weight_i)
```

如果总有效 evidence mass `< minEvidenceMass`，mastery 可仍为 estimate 但 status `unknown/low-confidence`；UI 不展示伪精确数字。

### 6.4 Base confidence

v1 使用明确、可替换的公式：

```text
evidenceMass = Σ weight_i
quantityConfidence = 1 - exp(-evidenceMass / 2.5)
weightedVariance = Σ(weight_i * (signal_i - mastery)^2) / evidenceMass
consistency = clamp(1 - weightedVariance / 0.25, 0, 1)
baseConfidence = clamp(quantityConfidence * (0.5 + 0.5 * consistency), 0, 1)
```

因为 `[0,1]` signal 的最大方差为 `0.25`，该 consistency 映射可解释且易测试。冲突 observation 会降低 confidence，但不会让历史 mastery 被单条 observation 覆盖。

默认：`minEvidenceMass=0.5`。低于该值时仍可保存 provisional mastery estimate，但 domain status 为 `unknown`，Readiness 不把它当稳定强/弱结论。

### 6.5 Freshness

定义 strong observation：`adjustedWeight >= 0.5`；若没有 strong observation，则使用最近任一有效 observation。

```text
freshness = exp(-ln(2) * ageDays / 180)
effectiveConfidence = baseConfidence * freshness
```

当 `freshness < 0.5` 时 domain status 标记 `stale`（阈值 configurable）。mastery 本身不 decay。

Interview dimension state 可以复用同一个 `WeightedSignalAggregator`，只把 `masterySignal` 换成对应 dimension signal。

## 7. Idempotency

所有有副作用 use case 接受 `executionId`；Observation 使用 `(evaluationId, semanticKey)` 去重或 unique constraint-in-file index，避免 evaluator 成功、state update 失败后 retry 产生重复。

## 8. Configuration

参数集中：

```text
config/
├── state-update.yaml
├── compaction.yaml
├── action-policy.yaml
├── pi-runtime-version.json
└── models.yaml
```

不散落 magic numbers。

## 9. No Premature Infrastructure

性能瓶颈出现前：

- 不引入 DB；
- 不引入 distributed locks；
- 不引入 queue；
- 不引入 vector infra；
- 不引入 workflow engine。

通过 repository/adapter abstraction 保留替换空间。
