# Engineering Trace Campaign

Generated: 2026-09-10T02:37:41.507Z

This campaign contains **12** long-form scenarios. Every semantic StructuredLLM response and Task-Agent answer was authored by **GPT-5.6 Sol** for this campaign and injected through the application’s provider/session boundaries. These are captured real model answers, not a FakeLLM returning expected test values.

- PASS: 12
- FAIL: 0

## Scenarios

- **D01-backend-longitudinal-loop** — Backend candidate: diagnose → learn → reassess → interview — PASS
- **D02-ai-agent-transition** — Backend → AI Agent Engineer transition — PASS
- **D03-evidence-resume-truthfulness** — Evidence provenance prevents resume inflation — PASS
- **D04-assessment-contamination-recovery** — Assessment contamination is contained and recovered — PASS
- **D05-target-switch-session-binding** — Paused task cannot leak across Target Jobs — PASS
- **D06-real-interview-outcome-loop** — Real interview rejection feeds attributable evidence only — PASS
- **D07-stale-return-refresh** — Strong old knowledge becomes stale, then refreshes — PASS
- **D08-conflicting-signals** — Conflicting observations do not collapse distinct state — PASS
- **D09-self-report-calibration** — Strong self-report stays weak evidence until assessed — PASS
- **D10-no-progress-loop** — Repeated non-diagnostic assessment is suppressed — PASS
- **D11-ready-stop** — System can stop when no material blocker remains — PASS
- **D12-process-recovery** — Paused Tutor reconstructs from persisted transcript after process restart — PASS

## Read each scenario in this order

1. `timeline.jsonl` — complete chronology.
2. `llm-calls.jsonl` — structured evaluator/decision/bootstrap requests and captured responses, including system prompts.
3. `pi-sessions.jsonl` — Task-Agent session creation, system prompt/tool allowlist, user prompts and captured assistant replies.
4. `snapshots/` — full persisted/derived state at important boundaries.
5. `tasks/` — task context, transcript and result.
6. `assertions.json` — machine-checked scenario semantics.
7. `final-workspace/` — exact final source-of-truth workspace.

## Engineering evidence

- `CAMPAIGN_REPORT.md` — what this campaign proves and aggregate trace volume.
- `INCIDENTS.md` — first-run failures, root causes and fixes retained for engineering review.
- `INTERVIEW_NOTES.md` — trace-indexed technical discussion themes for project interviews.
- `FIRST_RUN_RESULTS.json` — preserves the initial 9/12 result before the three issues were corrected.
- `metrics.json` — per-scenario trace cardinality.
