#!/bin/bash
# Cloud sessions start from a fresh clone: install deps so lint, tests and build work.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
pnpm install

# Best effort: the cloud image has Postgres 16 but doesn't start it.
if command -v pg_lsclusters >/dev/null 2>&1 && ! pg_lsclusters | grep -q online; then
  service postgresql start >/dev/null 2>&1 || true
fi
