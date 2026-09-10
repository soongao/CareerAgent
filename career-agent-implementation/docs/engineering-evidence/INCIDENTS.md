# Engineering Incidents and Pitfalls

These incidents are retained because they are more useful for architecture review and interview discussion than a clean final PASS-only report.

## INC-001 — Trace harness lost the real workspace root

**Observed in:** D03 first campaign run  
**Symptom:** `TypeError [ERR_INVALID_ARG_TYPE]: paths[0] must be a string; received undefined` while reopening an application over the same workspace.  
**Root cause:** The trace harness reached into a non-public `FileWorkspace.root` assumption instead of retaining the workspace root from scenario construction.  
**Fix:** Treat workspace root as an explicit harness dependency and pass it into the reconstructed app.  
**Lesson:** Recovery tests are only credible when the test harness does not depend on hidden runtime internals.

## INC-002 — Real outcome scenario violated the Target Job lifecycle

**Observed in:** D06 first campaign run  
**Symptom:** `Illegal target job transition preparing -> rejected`.  
**Root cause:** The scenario skipped the real-world `applied` and `interviewing` stages. The application invariant was correct; the test model of the world was wrong.  
**Fix:** Reconstruct the real lifecycle: `preparing → applied → interviewing → rejected`.  
**Lesson:** A failure in an end-to-end agent test is not automatically a product bug. Sometimes it demonstrates that a deterministic domain guard correctly rejected an LLM/test assumption.

## INC-003 — Session recovery consumed hidden model turns

**Observed in:** D12 first campaign run  
**Symptom:** Captured-response runtime exhausted its responses during resumed Tutor interaction.  
**Root cause:** The harness counted only user-visible turns. Reconstructing an independent AgentSession performs internal model interactions: a reconstruction prompt and a continuation prompt occur before the next visible user message.  
**Fix:** Capture and trace internal session prompts separately from user transcript messages.  
**Lesson:** Provider cost, latency and trace cardinality cannot be estimated from visible transcript turns alone. Agent runtimes may issue hidden orchestration/model calls.

## INC-004 — Contested observation could remain in derived state

**Observed during:** regression hardening before the long campaign  
**Symptom:** An Observation could be marked contested/inactive in the append-only history while the previously materialized competency estimate still reflected it.  
**Root cause:** The contest path updated observation validity but did not necessarily rebuild already-derived state from the new active observation set.  
**Fix:** Treat user model as rebuildable derived state. After validity amendments, recompute from active observations instead of only applying future deltas.  
**Regression:** `contested observations no longer influence rebuilt derived state` is now a permanent test.  
**Lesson:** Append-only history plus mutable validity metadata requires explicit materialized-view rebuild semantics.

## INC-005 — The LLM can output a schema-valid but context-invalid competency

**Observed during:** implementation hardening  
**Symptom:** A model output can contain a canonical competency ID that exists globally but was not among the candidate competencies supplied for the current role/action.  
**Root cause:** JSON/schema validity is weaker than domain validity.  
**Fix:** Runtime intersects semantic output with the candidate/allowed domain before applying state changes.  
**Lesson:** Structured output removes syntax ambiguity; it does not eliminate semantic authorization checks.

## INC-006 — Actor contamination flags cannot be trusted as the sole defense

**Observed during:** Assessment hardening  
**Symptom:** An AssessmentAgent can accidentally provide teaching without marking its own task as contaminated.  
**Root cause:** Asking the same actor to both obey and police a behavioral constraint creates a correlated failure mode.  
**Fix:** Independent evaluator inspects the transcript and can invalidate the measurement regardless of actor metadata.  
**Lesson:** High-impact measurement invariants require independent detection or deterministic guards, not only prompt compliance.

## Interview-ready themes from these incidents

The incidents support concrete discussion of:

- actor/judge separation;
- append-only event history and rebuildable materialized state;
- schema validation versus semantic authorization;
- hidden agent-runtime model calls;
- deterministic domain state machines around LLM decisions;
- measurement contamination and failure containment;
- why traces must include internal runtime events, not only chat transcripts.
