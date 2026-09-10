#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PI="$ROOT/vendor/pi/source/packages/coding-agent/dist/index.js"
if [[ ! -f "$PI" ]]; then
  echo "Vendored Pi is missing. Run: ./scripts/fetch-pi-source.sh" >&2
  exit 2
fi
export PI_CODING_AGENT_MODULE="$PI"
npm run validate
npm run validate:online
