# Interview Discussion Notes

This file is an index into real traces, not a script to memorize.

## 1. Why not let the LLM write mastery directly?

**Trace to open:** D01, D08, D09, plus INC-004.  
**Engineering issue:** Direct model-owned long-term state makes semantic errors and state-transition errors indistinguishable and makes replay/model migration difficult.  
**Design:** Actor/Evaluator emits Observation; deterministic StateUpdater owns aggregation; raw history is immutable; current state is rebuildable.

## 2. Why separate Assessment, Tutor and Interview agents?

**Trace:** D01 and D04.  
**Issue:** Their conversational objectives conflict. Assessment optimizes information gain without teaching; Tutor optimizes learning and allows questions; Interview optimizes simulation fidelity and withholds feedback until the end.  
**Failure mode:** Reusing one generic prompt makes mode leakage easy, especially Assessment turning into Tutor.

## 3. Why an independent Evaluator?

**Trace:** D04, D08; INC-006.  
**Issue:** The conversational actor needs local judgments to choose its next turn but should not own durable evaluation. Actor and judge have different policies and failure modes.  
**Practical benefit:** Evaluator can reject contaminated evidence even if the actor forgot to mark contamination.

## 4. What was difficult about memory?

**Trace:** D07, D08, D12; INC-004.  
**Issue:** Storage size is easy; semantic validity/freshness and reconstructability are hard.  
**Design:** raw episodic observations + derived user state + semantic summaries + curated recent context. `stale` lowers certainty/freshness; it is not equivalent to `weak` mastery.

## 5. How do you prevent resume hallucination?

**Trace:** D03.  
**Issue:** Evidence-level confidence is too coarse. A project artifact can prove technology usage but not a metric, ownership claim or causal impact.  
**Design:** claim-level `ClaimSupport`, provenance refs, and target-resume generation constrained by supported facts.

## 6. Where is the LLM allowed to decide, and where is it not?

**Trace:** D05, D10, D11; INC-002/005.  
**LLM:** semantic mapping, answer evaluation, evidence interpretation, next-action ranking.  
**Deterministic runtime:** legal actions, one-active-task invariant, Target lifecycle, candidate/action authorization, append-only/idempotent persistence, state aggregation.

## 7. Why one action then replan instead of one long plan?

**Trace:** D01.  
**Issue:** The user's state changes after every meaningful action. A fixed multi-step plan becomes stale immediately after new evidence.  
**Design:** state → candidate actions → one LLM decision → action → observations → state update → replan.

## 8. What did recovery testing reveal?

**Trace:** D12; INC-003.  
**Finding:** Restoring an interactive session requires more than loading a transcript. The runtime must restore task input/context/binding, reconstruct model context, verify the active target is still compatible, and account for hidden model calls during reconstruction.

## 9. Why doesn't rejection lower mastery?

**Trace:** D06.  
**Issue:** Hiring outcomes are confounded by interviewer variance, headcount and competition.  
**Design:** rejection is a Career Outcome Event; only attributable feedback creates competency/interview observations.

## 10. How do you avoid endless agent activity?

**Trace:** D10 and D11.  
**Issue:** An LLM can always invent another useful activity.  
**Design:** no-progress loop guard plus blocker-based readiness. If no material blocker exists, `NO_ACTION/READY` is a valid terminal decision.
