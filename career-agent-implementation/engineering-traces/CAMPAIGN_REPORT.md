# Engineering Trace Campaign Report

## Purpose

This campaign is not only a correctness suite. It is an engineering-evidence package for understanding how the Career Agent behaves across long, stateful scenarios and for reconstructing why the architecture contains specific safeguards.

Every semantic StructuredLLM response and every Task-Agent reply in these scenarios was authored by **GPT-5.6 Sol** for this campaign and then captured at the application's real LLM/session boundaries. The production runtime does not use these captures as a fallback. They are replay material for deterministic analysis.

## Result

- Long-form engineering journeys: **12 / 12 PASS** after fixes
- Short architecture scenarios: **18 / 18 PASS** (separate `scenario-traces` package)
- Deterministic/semantic unit and integration tests: **20 / 20 PASS**
- TypeScript strict build: **PASS**
- Static architecture checks: **PASS**

### Long-campaign trace volume

- Timeline events: **510**
- Structured LLM request/response records: **142**
- Task-agent/Pi-session records: **113**
- Interactive tasks: **19**
- Persisted observations: **82**
- Runtime events: **124**
- State snapshots: **42**

See `metrics.json` for per-scenario counts.

## Coverage

| Scenario | Engineering question |
|---|---|
| D01 | Does the system really replan across diagnose → learn → reassess → interview rather than follow a fixed plan? |
| D02 | Can the same global user move from backend to AI-agent engineering without losing reusable state? |
| D03 | Does supported project evidence avoid accidentally supporting unsupported metrics/ownership claims? |
| D04 | Can independent evaluation contain an Assessment that accidentally teaches and then recover via Tutor + fresh Assessment? |
| D05 | Can a paused task leak a previous Target Job after the target changes? |
| D06 | Does a real rejection remain an outcome event while attributable feedback becomes evidence? |
| D07 | Does old strong knowledge become stale instead of being reclassified as weak? |
| D08 | Can strong technical knowledge coexist with weak interview delivery without collapsing into one score? |
| D09 | Can strong self-report dominate measured evidence? |
| D10 | Can the workflow loop forever on repeated non-diagnostic assessments? |
| D11 | Can the system stop and emit READY/NO_ACTION instead of manufacturing work? |
| D12 | Can an interactive Tutor session be reconstructed after a simulated process restart from persisted metadata/context/transcript? |

## Important findings

### 1. Long-term agent state is safer as event-derived state

A user's long-term competency state is not written directly by the conversational agent. The model emits semantic observations; the deterministic updater derives current state. This separation makes replay, contesting, idempotency and model-version migration possible.

### 2. Measurement contamination is an architectural issue, not a prompt-quality detail

If Assessment or Interview provides teaching/feedback before measurement finishes, later answers are no longer comparable to the original state. Therefore the task must be invalidated as a measurement. The independent evaluator also checks contamination so correctness does not depend on the actor remembering to flag itself.

### 3. Evidence provenance must be claim-level

A README can strongly support “used Redis cache-aside” while providing zero support for “reduced latency by 40%” or “I personally led the architecture”. Evidence entity confidence therefore cannot propagate automatically to every resume claim.

### 4. A session restart creates hidden model work

Reconstructing a Pi-style conversational task requires an internal reconstruction prompt and a continuation prompt before the next visible user turn. A trace harness that only models visible transcript turns undercounts provider calls. D12 exposed this during the first run.

### 5. Target lifecycle is a real state invariant

A test initially tried to jump directly from `preparing` to `rejected`. The application correctly rejected it. The realistic trajectory must be `preparing → applied → interviewing → rejected`. This showed why real-world facts should be normalized through a lifecycle model instead of represented by arbitrary status writes.

### 6. Confidence needs evidence mass, not a single impressive answer

Several scenarios demonstrated that one strong answer should not instantly convert an uncertain long-term state into high confidence. This avoids overreacting to one lucky answer and explains why repeated independent observations matter.

## How to inspect a scenario

For a complete reconstruction, read in this order:

1. `timeline.jsonl`
2. `llm-calls.jsonl`
3. `pi-sessions.jsonl`
4. `snapshots/*.json`
5. `tasks/*/context.json`
6. `tasks/*/transcript.jsonl`
7. `tasks/*/result.json`
8. `assertions.json`
9. `final-workspace/`

The timeline supplies causality; the individual artifacts supply full payloads.
