#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATABASE_URL="${DATABASE_URL:-}"

if [[ -z "$DATABASE_URL" ]]; then
  echo "Thiếu DATABASE_URL."
  echo "Ví dụ:"
  echo '  export DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/JPTaxi?sslmode=require"'
  echo "  ./scripts/import-cloud-db.sh"
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "Cần cài psql (PostgreSQL client)."
  exit 1
fi

echo "==> Import schema: database/DB.sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT_DIR/database/DB.sql"

echo "==> Import seed: database/DB_data.sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT_DIR/database/DB_data.sql"

echo "==> Hoàn tất import database."
