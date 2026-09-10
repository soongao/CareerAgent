# 18. Roadmap, Scope & Release Plan

## 1. Core

必须展示完整 Agent Engineering 主线：

- persistent career state；
- Career/Target Job modes；
- readiness/blocker；
- explainable one-action replan；
- canonical competency mapping；
- observation/evaluator/state updater；
- Assessment/Tutor/Interview；
- curated context；
- local persistence/recovery；
- evidence/resume truthfulness；
- eval/replay/golden journeys。

## 2. Important after Core

- richer real-world outcome；
- material-change UX；
- correction/challenge；
- freshness tuning；
- semantic compaction；
- current market evidence；
- goal fit；
- richer resume optimization。

## 3. Deferred

- multi-active targets/jobs；
- auto application/JobOps；
- proactive evidence project generation；
- Vector DB / Graph DB；
- automatic ontology self-modification；
- single readiness percentage；
- always-on monitoring；
- SaaS/multi-tenant；
- voice/avatar。

## 4. Release Stages

### Stage A — Longitudinal Agent Kernel

```text
Bootstrap
→ State v0
→ Readiness
→ Next Action
→ Assessment
→ Evaluator
→ Observation
→ State v1
→ Replan
```

Gate：GJ-01/02/03/08/11 + deterministic recovery。

### Stage B — Measure / Improve / Perform

加入 Tutor + Interview。  
Gate：能区分 uncertain / weak / knowledge-strong-interview-weak；GJ-04/05/06。

### Stage C — Truthfulness & Career Artifacts

加入 claim-level Evidence + Resume。  
Gate：GJ-07，unsupported claim rate close to zero in golden set。

### Stage D — Real-world Longitudinal Loop

加入 Outcome / Career Experience。  
Gate：GJ-10/12，outcome 不被错误当 competency evidence。

## 5. MVP Definition

MVP 不是“有聊天、有简历、有面试”。MVP 必须证明：

> 用户状态能跨 Task 演化，系统能基于变化重新选择下一行动，而且每个判断有 provenance、可 replay、不会破坏真实性边界。

## 6. Scope Filter

任何新需求进入前问：

1. 是否强化 8 个核心展示点？
2. 是否必须改变 source of truth？
3. 是否引入新的 Agent，真的需要独立多轮 context 吗？
4. Pi built-in/Skill/service 是否已能完成？
5. 是否可 eval/replay？
6. 是否违反不变量？

如果主要是 demo feature 且不强化主线，推迟。
