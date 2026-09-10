# Implementation Status

## Complete in this source snapshot

The v1 architectural core and CLI product surface defined by the canonical specification are implemented. The project is intentionally local-first and CLI-first; a graphical UI is not part of the v1 core architecture.

Implemented modules:

- domain contracts and invariants
- filesystem workspace / JSONL persistence
- canonical competency catalog and lexical retrieval
- Pi runtime adapter and structured LLM service
- Bootstrap workflow
- Career/Target Job lifecycle
- role analysis
- readiness/blocker construction
- NextAction decision pipeline and candidate/runtime validation
- Assessment/Tutor/Interview definitions and recoverable task runtime
- independent evaluators
- Observation amendments and deterministic state aggregation
- Evidence / claim support
- Target Resume service
- real outcome feedback
- profile compaction and workspace maintenance
- CLI
- offline + online validation entrypoints

## Environment-dependent validation

Real Pi/model behavior depends on provider credentials/settings in the target server environment. No fixed-output fake is substituted for that online gate.
