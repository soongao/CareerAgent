# Career Agent — Pi Runtime

A local-first longitudinal career-preparation agent built on the Pi coding-agent SDK. The implementation follows the canonical specification in `docs/spec/`.

## What is implemented

- Career Mode and Target Job Mode
- Canonical Competency DAG + lexical retrieval + LLM mapping
- Bootstrap from resume + optional JD
- Persistent global User Model
- Multi-dimensional Readiness and blocker construction
- Explainable one-action-at-a-time NextAction decisions
- Independent Assessment / Tutor / Interview Pi AgentSessions
- Independent LLM Evaluators -> Observation -> deterministic StateUpdater
- Append-only observations + contest/supersede semantics
- Competency freshness (`stale != weak`)
- Existing-material Evidence analysis and claim-level Resume support
- Truthful Target Resume drafting/updating
- Real-world outcome analysis without treating rejection/offer itself as mastery evidence
- Target lifecycle and active-target isolation
- Task persistence, transcript JSONL, pause/resume eligibility, recovery
- Memory compaction, workspace validation and derived-state rebuild
- CLI, offline regression suite, recorded real-model semantic regression, and real-Pi online journey

## Requirements

- Node.js >= 22.19
- npm
- Pi either:
  - installed from npm as `@earendil-works/pi-coding-agent@0.85.1`, or
  - built from source at `https://github.com/earendil-works/pi.git`
- A real model/provider configured for Pi for online/model-facing operations
- Optional: `pdftotext` for PDF resume/JD ingestion; `pandoc` for DOCX

## Install

```bash
npm install
npm run validate
```

`npm run validate` is offline: it compiles, runs deterministic tests and replays recorded **real GPT-5.6 Sol outputs**. It does not replace production LLM calls with canned success values.

## Use a local Pi source tree

Clone/build Pi:

```bash
git clone https://github.com/earendil-works/pi.git
cd pi
npm install
npm run build
```

Then from this project:

```bash
./scripts/run-with-local-pi.sh /absolute/path/to/pi
```

The adapter imports:

```text
<pi>/packages/coding-agent/dist/index.js
```

through `PI_CODING_AGENT_MODULE`. Production defaults to the published package when the env var is absent.

## Real LLM / Pi validation

After Pi authentication/model configuration is available:

```bash
npm run validate:online
```

This performs a real model-driven journey:

```text
Bootstrap
-> Role/Competency mapping
-> NextAction
-> real AssessmentAgent session
-> independent AssessmentEvaluator
-> State update
-> real TutorAgent session
-> independent TutorEvaluator
-> real InterviewAgent session
-> independent InterviewEvaluator
-> workspace invariant validation
```

No `FakeLLM` is used in that path.

## Quick start

Bootstrap with a target job:

```bash
npm run build
node dist/src/cli.js bootstrap \
  --workspace ./workspace \
  --user soong \
  --career "Backend Engineer" \
  --resume ./resume.md \
  --job-title "Backend Engineer" \
  --company "Example" \
  --jd ./jd.md \
  --interview-date 2026-09-20
```

Inspect readiness:

```bash
node dist/src/cli.js status --workspace ./workspace --user soong
```

Ask the model for one explainable next action:

```bash
node dist/src/cli.js recommend --workspace ./workspace --user soong
```

Interactive task commands:

```bash
node dist/src/cli.js task-send --workspace ./workspace --user soong --task <task-id> --message "..."
node dist/src/cli.js task-pause --workspace ./workspace --user soong --task <task-id>
node dist/src/cli.js task-resume --workspace ./workspace --user soong --task <task-id>
node dist/src/cli.js task-complete --workspace ./workspace --user soong --task <task-id>
```

`task-complete` runs the independent LLM evaluator and applies resulting Observations through the deterministic StateUpdater.

## Existing evidence

```bash
node dist/src/cli.js evidence \
  --workspace ./workspace --user soong \
  --paths ./project/README.md,./project/design.md
```

The system only analyzes existing materials. It does not create projects or fabricate evidence.

## Resume

Draft without mutation:

```bash
node dist/src/cli.js resume --workspace ./workspace --user soong --target-job <job-id>
```

Explicitly write the Target Resume:

```bash
node dist/src/cli.js resume --workspace ./workspace --user soong --target-job <job-id> --write
```

## Real-world outcome

```bash
node dist/src/cli.js outcome \
  --workspace ./workspace --user soong \
  --target-job <job-id> \
  --kind feedback \
  --feedback "The interviewer said my system-design scaling answer lacked depth."
```

A rejection/offer with no attributable feedback does **not** generate competency observations.

## User correction / challenge

Facts can be directly corrected:

```bash
node dist/src/cli.js correct-fact --workspace ./workspace --user soong --note "Project date is 2023, not 2024."
```

Evaluations are challenged rather than overwritten:

```bash
node dist/src/cli.js contest --workspace ./workspace --user soong --observation <observation-id> --reason "The measurement was interrupted."
```

## Workspace

```text
workspace/users/<user>/
├── profile.md
├── meta.json
├── sources/
├── targets/
├── roles/
├── state/user-model.json
├── evidence/
├── resumes/
├── observations/
│   ├── events.jsonl
│   └── amendments.jsonl
├── tasks/<task-id>/
│   ├── task.json
│   ├── context.json
│   ├── transcript.jsonl
│   └── result.json
├── career-experience/events.jsonl
├── summaries/
└── runtime/
    ├── workflow.json
    ├── events.jsonl
    └── material-changes.jsonl
```

The file workspace is the source of truth. Live Pi sessions are recoverable runtime handles.

## LLM policy

Production model-facing paths always call the Pi-backed `PiStructuredLLM` / Pi AgentSession runtime. The offline regression suite uses `evals/recorded/gpt-5.6-sol-regression.json`, explicitly recorded from GPT-5.6 Sol during implementation. This is replay evidence, not a fabricated `FakeLLM` implementation and is never selected by the production app factory unless a test injects it.

## Validation

```bash
npm run validate          # strict compile + 19 offline tests + architecture static checks
npm run validate:online   # real Pi/model journey
```

See `VALIDATION.md` and `SOURCE_PROVENANCE.md`.


## Trace / transcript reconstruction

Generate 18 deterministic architecture scenarios with complete timelines, state snapshots, model-call records, task transcripts and evaluator results:

```bash
TRACE_OUT=./scenario-traces npm run trace:scenarios
```

After configuring a real Pi provider, generate an end-to-end **live** trace whose Assessment/Tutor/Interview and evaluator outputs come from the real provider:

```bash
CAREER_AGENT_TRACE_LLM=1 ONLINE_TRACE_ROOT=./online-traces/run-1 npm run trace:online
```

See [`TRACE_GUIDE.md`](./TRACE_GUIDE.md).

## Vendoring the exact Pi source

The runtime is pinned to Pi `v0.85.1`. On a machine with GitHub access:

```bash
npm run pi:vendor
```

This clones the exact upstream tag into `vendor/pi/source/`, installs its pinned dependencies and runs Pi's `build:offline`. `PiRuntimeAdapter` automatically prefers `vendor/pi/source/packages/coding-agent/dist/index.js` when present. Then run the real-source/provider validation:

```bash
npm run validate:pi-source
```

The bundled development sandbox cannot resolve external GitHub/SourceForge hosts, so the third-party Pi repository is intentionally not falsely represented as physically vendored in this archive. See `vendor/pi/UPSTREAM.md`.

## Engineering evidence corpus

This repository includes 30 reproducible scenarios:

- `scenario-traces/`: 18 focused invariant/regression traces.
- `engineering-traces/`: 12 long-form stateful journeys using GPT-5.6 Sol-authored captured model/session responses.
- `docs/engineering-evidence/`: first-run failures, root-cause reports, aggregate metrics and interview-oriented trace index.

Use:

```bash
npm run trace:view -- engineering-traces D01-backend-longitudinal-loop
npm run trace:view -- engineering-traces D12-process-recovery
```

See `PI_SOURCE_INTEGRATION_STATUS.md` for the exact distinction between the deterministic captured-response campaign and a real upstream Pi source/provider run.
