# 16. Golden Journeys & Acceptance

## 1. GJ-01 Career Mode Bootstrap

**Given**：用户只有 Resume + “AI Agent Engineer” Career Target，无具体 JD。  
**Expect**：建立 global state、canonical role mapping、低确定度 resume-derived observations；进入 Career Mode；推荐合理 diagnostic action。  
**Must not**：要求必须上传 JD；把 resume claim 当高确定度 mastery。

## 2. GJ-02 Target Job + Near Interview

**Given**：具体 JD，面试 2 天后。  
**Expect**：Target Job Mode；deadline 改变 priority；优先 critical blocker/interview/resume consistency。  
**Must not**：仍按两个月长期学习策略。

## 3. GJ-03 High Uncertainty Diagnostic

高 importance、low effective confidence。  
**Expect**：倾向 Assessment 而非直接 Learn；完成后 uncertainty 明显收敛。

## 4. GJ-04 Assessment → Tutor Contamination

用户 assessment 中要求讲解。  
**Expect**：原 Assessment measurement 结束/污染；可切 Tutor；后续正式测量创建新 Assessment。  
**Must not**：教学后继续累计为同一 assessment evidence。

## 5. GJ-05 Tutor Improves Knowledge, Not Resume Evidence

Tutor 后用户正确掌握某技术。  
**Expect**：competency observation；learning artifact。  
**Must not**：自动添加“项目中使用过该技术”的 Resume claim。

## 6. GJ-06 Knowledge Strong, Interview Weak

Assessment strong，Mock Interview clarity/follow-up weak。  
**Expect**：Competency 仍强；Interview blocker 上升；NextAction 可继续 interview practice。  
**Must not**：把所有问题归因于知识不足。

## 7. GJ-07 Resume Claim vs Evidence Mismatch

Resume 声称“延迟下降 40%”，artifact 只支持“用了 Redis”。  
**Expect**：claim support partial/unsupported；推荐修正 Resume。  
**Must not**：因为项目 supported 就支持 40%。

## 8. GJ-08 Switch Target Job

从 Job A 切 Job B。  
**Expect**：global competency/evidence reuse；new role/readiness recompute；old target context 不泄漏；paused task 做 resume eligibility check。

## 9. GJ-09 Fact Correction vs Evaluation Challenge

用户纠正日期：直接改事实并记录 provenance。  
用户 challenge mastery：Observation 标 contested / trigger reassessment，不直接把 mastery 改到用户想要值。

## 10. GJ-10 Real Rejection with Feedback

真实 rejection + “系统设计回答薄弱”。  
**Expect**：rejection 作为 outcome event；具体 feedback 转 observation；Career Experience Memory 更新。  
**Must not**：rejection 直接降低所有 mastery。

## 11. GJ-11 Six-month Return

以前 mastery strong，半年无新 evidence。  
**Expect**：mastery 历史估计保留；freshness/effective confidence 下降；标 stale；倾向 reassess/review。  
**Must not**：直接判 weak。

## 12. GJ-12 Authority Conflict

JD 明确要求 A，市场数据更常见 B，用户历史又多遇到 C。  
**Expect**：explicit JD 对当前 Job 权威最高；market supplement；personal experience user-specific。  
**Must not**：市场平均覆盖具体 JD。

## 13. Cross-Journey Release Gate

MVP 架构通过需满足：

- state source of truth 不污染；
- one-action replan；
- task/evaluator separation；
- target isolation；
- evidence truthfulness；
- runtime errors not user observations；
- replayable decisions；
- ready/no-action works；
- no task nesting；
- no silent historical rewrite。
