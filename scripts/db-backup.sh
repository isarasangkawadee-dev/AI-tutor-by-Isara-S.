#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL required}"
mkdir -p backups
pg_dump "$DATABASE_URL" --format=custom | gzip > "backups/aitutor-$(date -u +%Y%m%dT%H%M%SZ).dump.gz"
