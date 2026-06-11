#!/usr/bin/env bash
# Kiểm thử API hóa đơn VAT — bash backend/scripts/test-invoices.sh
set -euo pipefail

BASE="${API_BASE:-http://localhost:3000/api}"
EMAIL="${TEST_EMAIL:-customer1@jptaxi.dev}"
PASS="${TEST_PASS:-password123}"
TRIP_ID="${TEST_TRIP_ID:-1}"

TOKEN=$(curl -s -X POST "$BASE/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" \
  | node -pe "const t=JSON.parse(require('fs').readFileSync(0,'utf8')).token; if(!t) process.exit(1); t")

echo "GET /trips/$TRIP_ID/invoice"
curl -s "$BASE/trips/$TRIP_ID/invoice" -H "Authorization: Bearer $TOKEN" \
  | node -pe "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log('  number:', d.invoiceNumber, '| total JPY:', d.amounts?.jpy?.totalInclTax, '| VAT:', d.amounts?.jpy?.vatAmount, '| canIssue:', d.canIssue)"

echo "POST /trips/$TRIP_ID/invoice/issue"
curl -s -X POST "$BASE/trips/$TRIP_ID/invoice/issue" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"recipientEmail\":\"$EMAIL\"}" \
  | node -pe "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(' ', d.message)"

echo "Done."
