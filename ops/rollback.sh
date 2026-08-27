#!/usr/bin/env bash
# Roll back to a previous git revision and restore the matching DB dump.
# Usage: ./ops/rollback.sh <git-ref> [backups/db-*.dump]
set -euo pipefail

GIT_REF="${1:?git ref (tag or commit) is required}"
DB_DUMP="${2:-}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> checking out ${GIT_REF}"
git checkout "$GIT_REF"

echo "==> rebuilding"
docker compose -f "$COMPOSE_FILE" --profile standalone build
docker compose -f "$COMPOSE_FILE" run --rm frontend-build
docker compose -f "$COMPOSE_FILE" --profile standalone up -d

if [ -n "$DB_DUMP" ]; then
  echo "==> restoring database"
  ./ops/restore.sh "$DB_DUMP"
fi

echo "✓ rollback to ${GIT_REF} complete"
