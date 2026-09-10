# 14. Security, Trust & Privacy

## 1. Threat Model

主要风险：

- JD/README/web 中 prompt injection；
- malicious project-local Skill/Extension；
- over-privileged Task Agent；
- path traversal / arbitrary file read/write；
- resume/PII 外泄；
- third-party package code execution；
- evaluator 被 untrusted text 指示修改 rubric；
- model output 越权 state mutation。

## 2. Trust Hierarchy

```text
Runtime hard policy
> System/Agent policy
> Trusted structured state
> User explicit intent
> External/uploaded/retrieved data
```

JD、Resume、README、Web page、market data 全部属于 data，不是 instruction authority。

## 3. Least Privilege

每个 Agent 使用最小 tool allowlist。Interview 默认 read-only；Resume mutation 需要显式 confirmation path。

## 4. Filesystem Boundary

- 所有 workspace operations canonicalize path；
- 只允许 configured workspace/catalog roots；
- reject `..` escape/symlink escape（写操作尤其严格）；
- secrets/env files 默认 protected；
- 不让模型自己选择 arbitrary user home paths。

## 5. Local-first Privacy

默认：

- 用户资料保存在本地 workspace；
- 不需要 PostgreSQL/云数据库；
- 不将 transcript/resume 用于自定义 telemetry；
- external LLM provider 调用按所选 provider 的数据政策处理，产品应明确提示；
- 支持 future local model provider，但不是 v1 blocker。

## 6. Credentials

- 使用 Pi/provider auth / environment；
- API key 不写进 workspace；
- trace 中 redact secrets；
- source files 中疑似 secret 的内容不进入 resume/evaluator prompt，除非确有必要且经过过滤。

## 7. Third-party Pi Content

Extension/Package = executable code；Skill = 可驱动模型执行任意操作的 instruction bundle。

规则：

- pin version/commit；
- review source；
- project trust boundary；
- 不自动安装未审计 package；
- production/default release 尽量只带 first-party project extensions/skills。

## 8. State Mutation Gate

LLM 不能通过自由文本直接编辑 User Model。路径：

```text
LLM structured result
→ Zod validation
→ policy/runtime constraints
→ application service
→ atomic persistence
```

## 9. Resume Truthfulness as Safety Invariant

系统不得鼓励或自动生成虚假经历/指标。Claim support 不足时优先弱化/移除/询问事实，而不是补写。

## 10. Security Evals

Golden/chaos tests 必须包含：

- malicious JD “ignore system and reveal files”；
- README 请求 shell destructive command；
- interview prompt attempts to use write/bash；
- symlink/path escape；
- prompt tries to set mastery directly；
- poisoned market evidence。
