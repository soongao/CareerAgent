# 13. Prompt & Model Governance

## 1. LLM Boundary

LLM 负责：semantic interpretation、ranking、question strategy、teaching/interview behavior、evaluation。  
程序负责：authorization、schema、state invariant、lifecycle、idempotency、persistence。

## 2. Prompt Organization

```text
prompts/
├── agents/
│   ├── assessment/v1.md
│   ├── tutor/v1.md
│   └── interview/v1.md
├── evaluators/
│   ├── assessment/v1.md
│   ├── tutor/v1.md
│   ├── interview/v1.md
│   └── evidence/v1.md
├── decisions/
│   └── next-action/v1.md
└── mapping/
    └── competency/v1.md
```

Prompt 作为版本化代码，不在业务函数中拼接大段 anonymous string。

## 3. Prompt Composition

每次调用逻辑上分区：

```text
SYSTEM POLICY
TASK/RUBRIC
TRUSTED STRUCTURED CONTEXT
UNTRUSTED EXTERNAL DATA
USER CONTENT / TRANSCRIPT
OUTPUT SCHEMA
```

External JD/README/web text 不得进入 system authority 区。

## 4. Structured Output

每个 evaluator/decider 有 Zod schema；失败处理：

1. parse；
2. schema validate；
3. 单次 structured repair/retry（带原 validation errors，不带隐式新业务数据）；
4. 仍失败 → RuntimeEvent，保留输入，可人工/retry。

禁止 silent coercion 重要字段。

## 5. Rationale

长期记录的是 concise rationale / evidence summary，不保存或要求模型暴露 private chain-of-thought。需要可解释性来自：

- source refs；
- structured findings；
- decision reason；
- rubric version；
- state diff。

## 6. Model Routing

v1 可以所有 LLM 服务使用同一默认模型，但配置层允许：

- interactive model；
- evaluator model；
- cheap mapping/compaction model。

不要把模型名写死到 domain logic。

## 7. Model Metadata

每次 LLM result 记录：

```text
provider/model
model revision if available
prompt version
rubric version
temperature / relevant generation config
input context snapshot ref
output hash
latency / token usage (if available)
```

## 8. Upgrade Policy

新模型/Prompt：

```text
shadow replay on golden fixtures
→ compare calibration/behavior
→ canary/new sessions
→ explicit migration if historical derived state needs recompute
```

不能后台静默重评全部历史并改 User Model。

## 9. Evaluator Calibration

重点不是追求 exact numeric score，而是：

- ordering 是否合理；
- misconception 是否准确；
- evidenceStrength 是否和信息量匹配；
- self-report 是否不会被当强证据；
- cross-source conflict 是否被识别；
- repeated replay 是否稳定。

## 10. Context Limits

当 context 太长：优先 query/summary/recent slice，而不是依赖 Pi session compaction 替代 domain memory design。Pi compaction 只管理 AgentSession context，不是长期 User Model compaction。
