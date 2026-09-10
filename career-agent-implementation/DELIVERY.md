# Delivery Notes

This directory is the complete CLI-first v1 implementation of the Career Agent specification.

## Included

- TypeScript source under `src/`
- compiled JavaScript under `dist/`
- canonical design specification under `docs/spec/`
- competency catalog, prompts and Pi Agent Skills
- deterministic and semantic-regression tests
- recorded GPT-5.6 Sol outputs with provenance for offline replay
- real-Pi online evaluation entrypoint
- scripts for using a locally cloned Pi source tree

## Validation performed before packaging

```text
npm run validate                 PASS
19/19 tests                      PASS
static architecture checks      PASS
CLI empty-workspace smoke        PASS
```

The packaging environment could not resolve `github.com`, and it does not contain the target server's Pi provider credentials. Therefore the real-Pi online gate is included but is not falsely reported as executed here.

On the target server, after cloning/building Pi, run:

```bash
./scripts/run-with-local-pi.sh /absolute/path/to/pi
```

This runs the offline validation first and then the real Pi/model end-to-end validation.

## LLM testing rule

Production model-facing code always uses Pi. Offline semantic regression uses outputs actually authored by GPT-5.6 Sol and stored under `evals/recorded/`; there is no production fallback or `FakeLLM` that fabricates a fixed successful answer.
