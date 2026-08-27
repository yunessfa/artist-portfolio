#!/usr/bin/env bash
# Full backup: PostgreSQL dump (custom format) + media archive.
# Usage: ./ops/backup.sh [compose-file]
set -euo pipefail

COMPOSE_FILE="${1:-docker-compose.prod.yml}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
set -a; [ -f .env ] && . ./.env; set +a

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${ROOT}/backups"
mkdir -p "$OUT"

echo "==> dumping database"
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-artist}" -d "${POSTGRES_DB:-artistportfolio}" -Fc \
  > "${OUT}/db-${STAMP}.dump"

echo "==> archiving media"
docker compose -f "$COMPOSE_FILE" run --rm --no-deps \
  -v "${OUT}:/backup" backend \
  tar czf "/backup/media-${STAMP}.tar.gz" -C /app/media .

echo "==> pruning backups older than 30 days"
find "$OUT" -type f -mtime +30 -name 'db-*.dump' -delete
find "$OUT" -type f -mtime +30 -name 'media-*.tar.gz' -delete

echo "✓ backup complete:"
ls -lh "${OUT}/db-${STAMP}.dump" "${OUT}/media-${STAMP}.tar.gz"
