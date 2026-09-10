# S16-career-target-switch-reuses-global-state: Career target switch reuses global competency state

Tests global user state vs target-scoped readiness.

## Trace provenance

- Model-generated semantic outputs/transcripts: **GPT-5.6 Sol**, recorded during this trace generation session.
- Production runtime path is unchanged and uses real Pi/provider calls.
- Recorded outputs exist only to make this test trace deterministic and inspectable.

## Files

- `timeline.jsonl`: ordered system-level scenario timeline.
- `llm-calls.jsonl`: complete recorded LLM request/response pairs used by application services.
- `snapshots/`: full state snapshots at important boundaries.
- `tasks/`: task transcript/evaluation copies when applicable.
- `assertions.json`: semantic acceptance assertions.
- `final-workspace/`: exact persisted user workspace after the scenario.

## Result

All scenario assertions: **PASS**.
