# 05. Task Agents & Evaluators

## 1. Shared Runtime, Independent Definitions

```text
BaseTaskRuntime
├── AssessmentAgent Definition
├── TutorAgent Definition
└── InterviewAgent Definition
```

共享：session lifecycle、transcript、trace、context injection、tool allowlist、structured result、abort/pause、recovery hooks。Task Agent 在不需要用户输入时可以继续自主 reasoning/tool calls，直到 completion、pause 或 Human Boundary。  
独立：system policy、task input、local state、completion rubric、allowed tools、evaluator rubric。

## 2. AssessmentAgent

### Objective

用尽可能少的交互减少目标 Competency 的不确定性并获取高信息量表现。

### Behavior

- adaptive，不是固定试卷；
- 根据回答选择下一 probe；
- 可以从基础机制跳到 scenario / edge case；
- 不即时告诉答对/答错；
- 不教学；
- 允许澄清题意；
- 足够信息后主动结束；
- runtime 只设置 turn/token budget，不把“必须 5 题”写死。

### Contamination

用户要求知识讲解：

```text
Assessment paused/terminated
→ measurement marked contaminated
→ return Workflow
→ user may start Tutor
```

教学后不能恢复同一个 Assessment 继续作为有效测量；应创建新的 Assessment Task。

### Output

TaskResult 只描述 task completion、covered areas、transcript，不直接输出长期 mastery state。

## 3. TutorAgent

### Objective

围绕目标 Competency 提升理解，允许解释、例子、对比、用户追问、练习、纠错、review。

### Behavior

- 自主决定 teaching path；
- formative checks；
- 用户局部跨 competency 问题可回答；
- 明显转向新的长期主题时应结束/暂停并回 Workflow；
- 可以使用官方文档/搜索等资料；
- 外部资料本身不构成用户 competency evidence；
- 用户实际回答/练习表现才可产生 Observation。

### Learning Artifact

Task 结束生成轻量 artifact：

- learning summary；
- corrected misconceptions；
- key examples；
- review prompts；
- next suggested topics。

Learning Artifact ≠ User Model ≠ Evidence。

## 4. InterviewAgent

### Objective

模拟当前 Target Job 的真实面试，而不是另一种 Assessment/Tutor。

### Context

- Target Job / Role requirements；
- Target Resume snapshot；
- relevant Evidence summary；
- competency state summary；
- interview history summary。

### Behavior

- 自主 planning agenda；
- 不由 Workflow 规定“2 Java + 2 MySQL”；
- 真实 follow-up；
- resume/project deep dive；
- claim consistency probing；
- 不教学、不即时反馈；
- 用户要求 feedback → 结束/暂停原 interview 并标记测量边界。

### Modes

```ts
type InterviewMode =
  | "full_mock"
  | "technical_focus"
  | "resume_deep_dive"
  | "system_design"
  | "behavioral";
```

仍然是一个 InterviewAgent Definition，不拆五个 Agent。

## 5. Independent Evaluators

```mermaid
flowchart LR
    AT[Assessment transcript] --> AE[AssessmentEvaluator]
    TT[Tutor transcript] --> TE[TutorInteractionEvaluator]
    IT[Interview transcript] --> IE[InterviewEvaluator]
    AE --> O[Observation[]]
    TE --> O
    IE --> O
```

Evaluator 是 typed LLM service，不是独立用户对话 AgentSession。Task Agent 可以为了“下一题怎么问/下一步怎么教”形成 session-local 临时判断，但这些判断没有长期状态写权限；长期评价只认 Evaluator 产出的结构化 Observation。

## 6. Evaluator Contract

Evaluator 先判断是否存在足够长期信息：

```ts
interface EvaluationDecision<TObservation> {
  emitObservation: boolean;
  reason: string;
  observations: TObservation[];
}
```

Competency signal 示例字段：

- masterySignal；
- evidenceStrength；
- confidence；
- strengths；
- weaknesses；
- misconceptions；
- evidenceRefs。

“用户说懂了”通常 `emitObservation=false`；用户能独立解释/解决 scenario 才是更强信号。

## 7. Partial / Interrupted Task Evaluation

- completed task：完整 evaluator rubric；
- paused/cancelled：只有明确可评价片段才生成 observation；
- contaminated measurement：不能把污染后的回答当独立 assessment evidence；
- failed runtime：不产生 competency negative observation。

## 8. Resume Eligibility for Paused Task

恢复 paused Assessment/Interview 前必须检查：

- Career Target 是否变化；
- Target Job 是否变化；
- Target Resume 是否 material changed；
- task context snapshot 是否仍 compatible；
- 用户是否已通过 Tutor 获得该测量内容反馈。

不满足则保留旧 Task 历史，但创建新 Task。
