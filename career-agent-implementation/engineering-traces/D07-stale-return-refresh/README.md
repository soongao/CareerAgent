# D07-stale-return-refresh: Strong old knowledge becomes stale, then refreshes

Freshness semantics for long-lived memory.

## Provenance

All semantic LLM outputs and Task-Agent replies in this scenario were authored by **GPT-5.6 Sol** in this engineering campaign, then injected through the same StructuredLLM/Pi-session boundaries used by the application. They are deterministic captures, not production fallbacks or expected-value fakes.

## Reconstruction order

1. `timeline.jsonl`
2. `llm-calls.jsonl`
3. `pi-sessions.jsonl`
4. `snapshots/`
5. `tasks/*/{context,transcript,result}.json*`
6. `assertions.json`
7. `final-workspace/`

Result: **PASS**
