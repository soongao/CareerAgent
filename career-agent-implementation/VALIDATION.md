# Validation

## Offline result for this delivery

Executed in the delivery environment:

```text
TypeScript strict build        PASS
Node test suite                19/19 PASS
Static architecture checks     PASS
```

The test suite covers:

- self-report evidence cap
- conflicting observations
- stale != weak
- append-only observation/idempotency
- contest amendments
- workspace path isolation
- recorded real-model Bootstrap
- Target Job readiness
- explainable NextAction
- model target/action runtime validation
- independent Assessment evaluation
- Tutor learning without Evidence creation
- Interview knowledge/performance separation
- terminal Target Job deactivation
- rejection alone not becoming mastery evidence
- attributable real feedback becoming observation
- paused-task target-isolation checks
- fact correction vs evaluation challenge
- claim-level Evidence support
- one active interactive Task
- evaluator-level contamination blocking

## Why recorded model outputs are used offline

There is deliberately no `FakeLLM` that returns a hard-coded "correct" answer. Semantic regression uses model outputs actually authored by GPT-5.6 Sol and stored with provenance in `evals/recorded/`. Production never uses this automatically.

This makes deterministic regression possible while preserving a separate real-model gate.

## Online gate

`npm run validate:online` requires a working Pi model/provider environment. It creates real Pi AgentSessions and real model Evaluators. The delivery container does not have the user's Pi authentication/provider credentials, so this gate is provided but is not falsely reported as passed here.

Use:

```bash
./scripts/run-with-local-pi.sh /absolute/path/to/pi
```

or:

```bash
npm install
npm run validate:online
```
