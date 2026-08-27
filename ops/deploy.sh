#!/usr/bin/env bash
# Zero-ish-downtime deploy: backup -> pull -> build -> migrate -> swap.
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
PROFILE_ARGS="${PROFILE_ARGS:---profile standalone}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> [1/6] backup before deploy"
./ops/backup.sh "$COMPOSE_FILE" || echo "WARNING: backup failed, continuing"

echo "==> [2/6] fetching latest code"
git pull --ff-only

echo "==> [3/6] building images"
# shellcheck disable=SC2086
docker compose -f "$COMPOSE_FILE" $PROFILE_ARGS build

echo "==> [4/6] rebuilding the frontend bundle"
docker compose -f "$COMPOSE_FILE" run --rm frontend-build

echo "==> [5/6] starting services (migrations run in the entrypoint)"
# shellcheck disable=SC2086
docker compose -f "$COMPOSE_FILE" $PROFILE_ARGS up -d --remove-orphans

echo "==> [6/6] waiting for health"
for attempt in $(seq 1 30); do
  if docker compose -f "$COMPOSE_FILE" exec -T backend \
       curl -fsS http://127.0.0.1:8000/healthz >/dev/null 2>&1; then
    echo "✓ deploy complete and healthy"
    docker image prune -f >/dev/null 2>&1 || true
    exit 0
  fi
  sleep 3
done

echo "ERROR: backend did not become healthy. Recent logs:"
docker compose -f "$COMPOSE_FILE" logs --tail=80 backend
exit 1
