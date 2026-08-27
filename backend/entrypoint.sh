#!/usr/bin/env bash
# Waits for Postgres, migrates, collects static, ensures the admin user,
# optionally seeds the legacy content, then hands over to the CMD.
set -euo pipefail

log() { echo "[entrypoint] $*"; }

PGHOST="${POSTGRES_HOST:-postgres}"
PGPORT="${POSTGRES_PORT:-5432}"
PGUSER="${POSTGRES_USER:-postgres}"

log "waiting for postgres at ${PGHOST}:${PGPORT} ..."
for attempt in $(seq 1 60); do
  if pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" >/dev/null 2>&1; then
    log "postgres is ready (attempt ${attempt})"
    break
  fi
  if [ "$attempt" -eq 60 ]; then
    log "ERROR: postgres did not become ready in time"
    exit 1
  fi
  sleep 2
done

# Migrations are generated at first boot: the repository ships models only, so
# without this step `migrate` would find nothing to apply and every table would
# be missing. makemigrations is a no-op once the files exist.
log "generating any missing migrations"
python manage.py makemigrations core media_library theming artworks artist exhibitions pagebuilder contact insights --noinput

log "applying migrations"
python manage.py migrate --noinput

if [ "${DJANGO_COLLECTSTATIC:-1}" = "1" ]; then
  log "collecting static files"
  python manage.py collectstatic --noinput --clear
fi

# --- idempotent superuser ------------------------------------------------- #
if [ -n "${DJANGO_SUPERUSER_USERNAME:-}" ] && [ -n "${DJANGO_SUPERUSER_PASSWORD:-}" ]; then
  log "ensuring admin user '${DJANGO_SUPERUSER_USERNAME}'"
  python manage.py shell <<'PY'
import os
from django.contrib.auth import get_user_model

User = get_user_model()
username = os.environ["DJANGO_SUPERUSER_USERNAME"]
password = os.environ["DJANGO_SUPERUSER_PASSWORD"]
email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "")
force = os.environ.get("DJANGO_SUPERUSER_FORCE_RESET", "0") == "1"

user, created = User.objects.get_or_create(
    username=username, defaults={"email": email}
)
if created:
    user.set_password(password)
    print(f"created superuser {username}")
elif force:
    user.set_password(password)
    print(f"reset password for {username}")
else:
    print(f"superuser {username} already exists; password left unchanged")

user.is_staff = True
user.is_superuser = True
if email:
    user.email = email
user.save()
PY
fi

# --- optional first-run seed --------------------------------------------- #
if [ "${SEED_ON_START:-0}" = "1" ]; then
  log "seeding legacy content (idempotent)"
  python manage.py seed_legacy || log "WARNING: seed_legacy failed; continuing"
fi

log "starting: $*"
exec "$@"
