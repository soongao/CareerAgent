# Source Provenance

- Pi upstream: https://github.com/earendil-works/pi.git
- Pi coding-agent package version targeted by this snapshot: `0.85.1` (verified against upstream package metadata on 2026-09-10).
- Pi SDK integration was aligned with upstream SDK examples using `createAgentSession`, `DefaultResourceLoader`, `SessionManager.inMemory()`, built-in tool allowlists, `session.prompt()` and `session.getLastAssistantText()`.
- `evals/recorded/gpt-5.6-sol-regression.json` contains semantic outputs authored by GPT-5.6 Sol during this implementation session. They are regression recordings, not production model substitutes.

Production runtime defaults to `@earendil-works/pi-coding-agent`; set `PI_CODING_AGENT_MODULE` to an importable built local Pi `dist/index.js` to run directly against source.
