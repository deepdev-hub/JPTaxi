#!/usr/bin/env bash
# Kiểm thử API hóa đơn VAT — bash backend/scripts/test-invoice.sh
set -euo pipefail

BASE="${API_BASE:-http://localhost:3000/api}"
PASS="password123"
TRIP_ID="${TRIP_ID:-1}"

pass_count=0
fail_count=0

assert_eq() {
  local label="$1" got="$2" want="$3"
  if [[ "$got" == "$want" ]]; then
    printf "  PASS  %s\n" "$label"
    pass_count=$((pass_count + 1))
  else
    printf "  FAIL  %s (got=%s want=%s)\n" "$label" "$got" "$want"
    fail_count=$((fail_count + 1))
  fi
}

login_customer() {
  curl -s -X POST "${BASE}/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"customer1@jptaxi.dev\",\"password\":\"${PASS}\"}"
}

login_driver_trip8() {
  # trip 1 → driver_id 8 → driver8@jptaxi.dev (theo seed)
  curl -s -X POST "${BASE}/drivers/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"driver8@jptaxi.dev","password":"'"$PASS"'"}'
}

echo ""
echo "=== Kiểm thử hóa đơn VAT — tripId=${TRIP_ID} — ${BASE} ==="

LOGIN=$(login_customer)
TOKEN=$(node -pe "JSON.parse(process.argv[1]).token||''" "$LOGIN" 2>/dev/null || echo "")
if [[ -z "$TOKEN" ]]; then
  echo "FAIL: Không đăng nhập được customer1 — backend/DB có chạy không?"
  exit 1
fi
echo "OK: Đăng nhập customer1"

# --- GET invoice preview ---
GET_BODY=$(curl -s -w "\n%{http_code}" -X GET "${BASE}/trips/${TRIP_ID}/invoice" \
  -H "Authorization: Bearer ${TOKEN}")
HTTP_GET=$(echo "$GET_BODY" | tail -n1)
JSON_GET=$(echo "$GET_BODY" | sed '$d')

assert_eq "GET /trips/:id/invoice HTTP" "$HTTP_GET" "200"

TMP_JSON=$(mktemp)
echo "$JSON_GET" > "$TMP_JSON"
node <<NODE
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('$TMP_JSON', 'utf8'));
const tripId = Number('$TRIP_ID');
const checks = [];

function ok(label, cond) {
  checks.push({ label, pass: !!cond });
}

ok('có invoiceNumber', typeof data.invoiceNumber === 'string' && data.invoiceNumber.startsWith('JPT-'));
ok('documentType vat_invoice', data.documentType === 'vat_invoice');
ok('có lineItems (>=2)', Array.isArray(data.lineItems) && data.lineItems.length >= 2);
ok('có amounts.jpy.vatRatePercent=10', data.amounts?.jpy?.vatRatePercent === 10);
ok('có amounts.vnd', data.amounts?.vnd?.totalInclTax > 0);
ok('có seller', data.seller?.legalNameJa);
ok('có trip.pickupAddress', data.trip?.pickupAddress);
ok('có payment.methodLabelJa', data.payment?.methodLabelJa);
ok('qrPayload chứa invoiceNumber', (data.qrPayload || '').includes(data.invoiceNumber));

// VAT tax-inclusive: vat + subtotal = total
const jpy = data.amounts?.jpy;
if (jpy) {
  ok('VAT JPY: subtotal+vat=total', jpy.subtotalExclTax + jpy.vatAmount === jpy.totalInclTax);
  const expectedVat = Math.round((jpy.totalInclTax * 10) / 110);
  ok('VAT JPY amount đúng công thức 10%', jpy.vatAmount === expectedVat);
}

// line items sum ≈ total JPY (cho phép làm tròn)
const sumLines = (data.lineItems || []).reduce((s, r) => s + (r.amountJpy || 0), 0);
ok('tổng lineItems JPY = totalInclTax', sumLines === jpy?.totalInclTax);

for (const c of checks) {
  console.log((c.pass ? '  PASS  ' : '  FAIL  ') + c.label);
}
const failed = checks.filter((c) => !c.pass).length;
process.exit(failed > 0 ? 1 : 0);
NODE
rm -f "$TMP_JSON"
node_exit=$?
if [[ $node_exit -eq 0 ]]; then
  pass_count=$((pass_count + 8))
else
  fail_count=$((fail_count + 1))
fi

CAN_ISSUE=$(node -pe "JSON.parse(process.argv[1]).canIssue" "$JSON_GET")
echo "  INFO  canIssue=${CAN_ISSUE}"

# --- POST issue (nếu canIssue) ---
if [[ "$CAN_ISSUE" == "true" ]]; then
  ISSUE_BODY=$(curl -s -w "\n%{http_code}" -X POST "${BASE}/trips/${TRIP_ID}/invoice/issue" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H 'Content-Type: application/json' \
    -d '{"recipientEmail":"customer1@jptaxi.dev"}')
  HTTP_ISSUE=$(echo "$ISSUE_BODY" | tail -n1)
  JSON_ISSUE=$(echo "$ISSUE_BODY" | sed '$d')
  assert_eq "POST issue HTTP" "$HTTP_ISSUE" "201"
  ISSUED=$(node -pe "JSON.parse(process.argv[1]).invoice?.issued===true" "$JSON_ISSUE")
  assert_eq "invoice.issued sau issue" "$ISSUED" "true"
fi

# --- GET sau issue: issued=true, canIssue=false ---
GET2=$(curl -s "${BASE}/trips/${TRIP_ID}/invoice" -H "Authorization: Bearer ${TOKEN}")
ISSUED2=$(node -pe "JSON.parse(process.argv[1]).issued===true" "$GET2")
CAN2=$(node -pe "JSON.parse(process.argv[1]).canIssue" "$GET2")
assert_eq "GET sau issue: issued=true" "$ISSUED2" "true"
assert_eq "GET sau issue: canIssue=false" "$CAN2" "false"

# --- Idempotent issue ---
IDEM=$(curl -s -X POST "${BASE}/trips/${TRIP_ID}/invoice/issue" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{}')
ALREADY=$(node -pe "JSON.parse(process.argv[1]).alreadyIssued===true" "$IDEM")
assert_eq "POST issue lần 2: alreadyIssued" "$ALREADY" "true"

# --- Forbidden: customer2 không sở hữu trip 1 ---
LOGIN2=$(curl -s -X POST "${BASE}/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"customer2@jptaxi.dev","password":"'"$PASS"'"}')
TOKEN2=$(node -pe "JSON.parse(process.argv[1]).token" "$LOGIN2")
CODE_FORB=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BASE}/trips/${TRIP_ID}/invoice" \
  -H "Authorization: Bearer ${TOKEN2}")
assert_eq "customer2 GET trip1 → 403" "$CODE_FORB" "403"

# --- Driver đúng chuyến ---
DRV_LOGIN=$(login_driver_trip8)
DRV_TOKEN=$(node -pe "JSON.parse(process.argv[1]).token||''" "$DRV_LOGIN" 2>/dev/null || echo "")
if [[ -n "$DRV_TOKEN" ]]; then
  CODE_DRV=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BASE}/trips/${TRIP_ID}/invoice" \
    -H "Authorization: Bearer ${DRV_TOKEN}")
  assert_eq "driver8 GET trip1 invoice" "$CODE_DRV" "200"
else
  echo "  SKIP  driver8 login (email seed có thể khác)"
fi

# --- No auth ---
CODE_NOAUTH=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BASE}/trips/${TRIP_ID}/invoice")
assert_eq "GET không JWT → 401" "$CODE_NOAUTH" "401"

echo ""
echo "=== Kết quả: PASS=${pass_count} FAIL=${fail_count} ==="
[[ $fail_count -eq 0 ]] || exit 1
