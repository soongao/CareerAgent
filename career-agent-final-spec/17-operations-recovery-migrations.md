# 17. Operations, Recovery & Migrations

## 1. Runtime Model

v1 假设：single local process / single active user workspace writer。若未来并发多进程，再引入锁/DB，不提前复杂化。

## 2. Crash Cases

### Task Agent crash

- append runtime error；
- task `failed` 或可恢复 `paused`；
- transcript 已写部分保留；
- 不产生自动 negative observation。

### Evaluator crash

- Task completed result/transcript 保留；
- evaluation 可用同 `evaluationId/executionId` retry；
- no state mutation before valid structured result。

### State update crash

- Observation append 与 state derivation 分离；
- retry state updater 从 active observations recompute；
- derived state 可重建。

## 3. Bootstrap Recovery

Bootstrap 按可恢复 stage 持久化（workspace created / resume ingested / target mapped / initial observations applied / baseline resume created）。失败后从最后成功 stage 继续，不重复制造 Observation/Evidence。

## 4. Logical Exactly-once

文件系统没有分布式 transaction，采用 idempotency：

- `executionId`；
- deterministic/unique `evaluationId`；
- Observation uniqueness index；
- state updater rebuildable；
- artifact version IDs。

## 5. Paused Task Recovery

```text
load task metadata
→ validate context binding
→ check measurement contamination
→ reconstruct context snapshot + transcript
→ create new live AgentSession handle
→ continue only if eligible
```

不依赖完整 Pi AgentSession object serialization。

## 6. Workspace Migration

每个 workspace 有 schemaVersion。migration：

- backup；
- dry-run diff；
- migrate derived structured files；
- preserve raw logs/sources；
- record migration event；
- run invariant checks。

## 7. Model/Prompt Migration

不是 workspace schema migration。历史 LLM judgment 变更必须：

```text
shadow evaluation
→ comparison report
→ explicit approval/versioned migration
→ create replacement observations/amendments
```

不覆写 raw observation。

## 8. Semantic Compaction

Compaction 失败不影响原数据；summary 是 rebuildable cache/semantic layer。

默认 threshold 见 `06-memory-context-persistence.md`。

## 9. Backup

建议：

- workspace manual/export archive；
- optional Git for user-visible versioning；
- source artifacts immutable copies；
- no secrets in backup。

## 10. Maintenance Commands / Use Cases

可以有 application-level maintenance：

```text
validate-workspace
rebuild-derived-state
rebuild-observation-index
compact-memory
replay-evaluation
migrate-workspace
export-user-data
```

是否暴露为 CLI 或 UI 是实现选择；不一定注册给 LLM Tool。

## 11. Corruption Strategy

- JSONL 单行 parse error：隔离坏行并告警，不 silently skip；
- structured YAML invalid：从 last backup/derived rebuild；
- missing source ref：标 dangling provenance，不能自动提升 claim；
- catalog missing competency ID：migration/proposal required，不能 silently rename。
