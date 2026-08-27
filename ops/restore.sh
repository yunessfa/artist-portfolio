#!/usr/bin/env bash
# Restore a database dump and (optionally) a media archive.
# Usage: ./ops/restore.sh backups/db-YYYYmmdd-HHMMSS.dump [backups/media-....tar.gz]
set -euo pipefail

DB_DUMP="${1:?path to .dump file is required}"
MEDIA_ARCHIVE="${2:-}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
set -a; [ -f .env ] && . ./.env; set +a

read -r -p "This OVERWRITES the current database. Continue? [y/N] " reply
[ "$reply" = "y" ] || { echo "aborted"; exit 1; }

echo "==> stopping backend"
docker compose -f "$COMPOSE_FILE" stop backend

echo "==> restoring database from ${DB_DUMP}"
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_restore -U "${POSTGRES_USER:-artist}" -d "${POSTGRES_DB:-artistportfolio}" \
  --clean --if-exists --no-owner < "$DB_DUMP"

if [ -n "$MEDIA_ARCHIVE" ]; then
  echo "==> restoring media from ${MEDIA_ARCHIVE}"
  docker compose -f "$COMPOSE_FILE" run --rm --no-deps \
    -v "$(cd "$(dirname "$MEDIA_ARCHIVE")" && pwd):/backup" backend \
    sh -c "rm -rf /app/media/* && tar xzf /backup/$(basename "$MEDIA_ARCHIVE") -C /app/media"
fi

echo "==> starting backend"
docker compose -f "$COMPOSE_FILE" up -d backend
echo "✓ restore complete"
