#!/usr/bin/env bash
# One-time Let's Encrypt certificate issuance (webroot mode, inside Docker).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
set -a; [ -f .env ] && . ./.env; set +a

DOMAIN="${PUBLIC_DOMAIN:?PUBLIC_DOMAIN must be set in .env}"
EMAIL="${DJANGO_SUPERUSER_EMAIL:-admin@${DOMAIN}}"

echo "==> issuing a certificate for ${DOMAIN}"
docker run --rm \
  -v "${ROOT}/nginx/certs:/etc/letsencrypt" \
  -v "${ROOT}/nginx/certbot-www:/var/www/certbot" \
  -p 80:80 \
  certbot/certbot certonly --standalone \
    -d "${DOMAIN}" -d "www.${DOMAIN}" \
    --email "${EMAIL}" --agree-tos --no-eff-email

echo "✓ certificate stored in nginx/certs/live/${DOMAIN}/"
echo "  now start the stack:  docker compose -f docker-compose.prod.yml --profile standalone up -d"
