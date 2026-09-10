# Pi Source Integration Status

## Target

- Upstream: https://github.com/earendil-works/pi.git
- Pinned version: v0.85.1
- License: MIT
- Official release source SHA-256: `f7ec92ed4f7b75369198398a3421732eae405183971450bc74cb8544f42d02ca`

## What is validated in this bundle

The Career Agent's production adapter is written against Pi's current public SDK surface: `createAgentSession`, `ModelRuntime`, `DefaultResourceLoader`, `SessionManager.inMemory()` and built-in tool allowlists. It keeps task agents in independent in-process sessions and disables implicit resource discovery for hermetic task policies.

The bundled 30 trace scenarios execute the real Career Agent workflow/state/task/evaluator code. At LLM and task-session response boundaries they use responses authored by GPT-5.6 Sol during the campaign and captured with provenance. This lets the application path be replayed deterministically without pretending a fixed expected result is a live model.

## What could not be executed inside this sandbox

The sandbox permits reading upstream Pi source through the web but blocks downloading/cloning external repositories into its local filesystem. Therefore the full third-party Pi source is **not falsely bundled or claimed as executed here**.

## How to turn this into a real-source run on your server

```bash
npm run pi:vendor
# configure your Pi provider/auth
npm run validate:pi-source
```

`npm run pi:vendor` clones the exact `v0.85.1` tag into `vendor/pi/source` and runs Pi's offline build. `PiRuntimeAdapter` automatically prefers that built source over the npm package. `validate:pi-source` then runs the Career Agent validation and online model path through that local Pi source.
