#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL required}"
: "${1:?backup file required}"
gzip -dc "$1" | pg_restore --clean --if-exists --no-owner --dbname "$DATABASE_URL"
