# S05-assessment-contamination: Independent evaluator rejects contaminated measurement

Failure scenario: agent behavior is wrong, evaluator prevents long-term state pollution.

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
