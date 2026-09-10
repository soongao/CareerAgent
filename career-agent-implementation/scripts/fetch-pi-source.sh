#!/usr/bin/env bash
set -euo pipefail
VERSION="${PI_VERSION:-0.85.1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/vendor/pi/source"
if [[ -d "$DEST/.git" ]]; then
  echo "Pi source already present at $DEST"
  git -C "$DEST" fetch --tags --depth 1 origin "v$VERSION"
  git -C "$DEST" checkout -f "v$VERSION"
else
  rm -rf "$DEST"
  mkdir -p "$(dirname "$DEST")"
  git clone --depth 1 --branch "v$VERSION" https://github.com/earendil-works/pi.git "$DEST"
fi
(
  cd "$DEST"
  npm install --ignore-scripts
  npm run build:offline
)
if [[ ! -f "$DEST/packages/coding-agent/dist/index.js" ]]; then
  echo "Pi build did not produce packages/coding-agent/dist/index.js" >&2
  exit 1
fi
echo "Vendored Pi v$VERSION at $DEST"
echo "Career Agent will now prefer this source build automatically."
