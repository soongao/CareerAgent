#!/usr/bin/env bash
set -euo pipefail
if [[ $# -lt 1 ]]; then
  echo "usage: $0 /absolute/path/to/pi [--skip-pi-build]" >&2
  exit 2
fi
PI_ROOT="$(cd "$1" && pwd)"
SKIP="${2:-}"
if [[ ! -f "$PI_ROOT/packages/coding-agent/package.json" ]]; then
  echo "Not a Pi source tree: $PI_ROOT" >&2
  exit 2
fi
if [[ ! -f "$PI_ROOT/packages/coding-agent/dist/index.js" && "$SKIP" != "--skip-pi-build" ]]; then
  echo "Building local Pi source..."
  (cd "$PI_ROOT" && npm install && npm run build)
fi
if [[ ! -f "$PI_ROOT/packages/coding-agent/dist/index.js" ]]; then
  echo "Pi dist/index.js not found. Build Pi first." >&2
  exit 2
fi
export PI_CODING_AGENT_MODULE="$PI_ROOT/packages/coding-agent/dist/index.js"
echo "Using local Pi module: $PI_CODING_AGENT_MODULE"
if ! command -v tsc >/dev/null 2>&1 && [[ ! -x node_modules/.bin/tsc ]]; then
  npm install --ignore-scripts --omit=optional
fi
npm run validate
npm run validate:online
