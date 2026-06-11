#!/usr/bin/env bash
# Kiểm thử API đánh giá & bình luận — bash backend/scripts/test-ratings.sh
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

login() {
  local email="$1" endpoint="$2"
  curl -s -X POST "${BASE}${endpoint}" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${email}\",\"password\":\"${PASS}\"}"
}

echo ""
echo "=== Kiểm thử đánh giá / bình luận — tripId=${TRIP_ID} ==="

CUST_LOGIN=$(login "customer1@jptaxi.dev" "/login")
CUST_TOKEN=$(node -pe "JSON.parse(process.argv[1]).token||''" "$CUST_LOGIN")
[[ -n "$CUST_TOKEN" ]] || { echo "FAIL: login customer1"; exit 1; }
echo "OK: customer1"

# --- Khách: review-context ---
CTX=$(curl -s -w "\n%{http_code}" -X GET "${BASE}/trips/${TRIP_ID}/rating/review-context" \
  -H "Authorization: Bearer ${CUST_TOKEN}")
HTTP_CTX=$(echo "$CTX" | tail -n1)
JSON_CTX=$(echo "$CTX" | sed '$d')
assert_eq "GET review-context HTTP" "$HTTP_CTX" "200"

TMP=$(mktemp)
echo "$JSON_CTX" > "$TMP"
node <<NODE
const fs = require('fs');
const d = JSON.parse(fs.readFileSync('$TMP', 'utf8'));
const checks = [
  ['tripId khớp', d.tripId === ${TRIP_ID}],
  ['canRate', d.canRate === true],
  ['có driver.name', !!d.driver?.name],
  ['existingRating (seed trip1)', !!d.existingRating],
];
for (const [label, pass] of checks) {
  console.log((pass ? '  PASS  ' : '  FAIL  ') + label);
}
process.exit(checks.some((c) => !c[1]) ? 1 : 0);
NODE
rm -f "$TMP"
[[ $? -eq 0 ]] && pass_count=$((pass_count + 4)) || fail_count=$((fail_count + 1))

# --- Khách: GET rating ---
GET_R=$(curl -s -w "\n%{http_code}" -X GET "${BASE}/trips/${TRIP_ID}/rating" \
  -H "Authorization: Bearer ${CUST_TOKEN}")
assert_eq "GET trip rating HTTP" "$(echo "$GET_R" | tail -n1)" "200"
HAS_RATING=$(node -pe "!!JSON.parse(process.argv[1]).rating" "$(echo "$GET_R" | sed '$d')")
assert_eq "trip1 có rating trong DB" "$HAS_RATING" "true"

# --- Khách: PUT cập nhật (tags + comment) ---
PUT_BODY='{"score":4,"tags":["丁寧な対応","安全運転"],"comment":"API test update"}'
PUT=$(curl -s -w "\n%{http_code}" -X PUT "${BASE}/trips/${TRIP_ID}/rating" \
  -H "Authorization: Bearer ${CUST_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "$PUT_BODY")
assert_eq "PUT rating HTTP" "$(echo "$PUT" | tail -n1)" "200"
PUT_JSON=$(echo "$PUT" | sed '$d')
node -pe "
const d=JSON.parse(process.argv[1]);
const ok=d.rating?.score===4 && d.rating?.tags?.length===2 && d.rating?.comment?.includes('API test');
console.log(ok?'  PASS  PUT decode tags+comment':'  FAIL  PUT response');
process.exit(ok?0:1);
" "$PUT_JSON" && pass_count=$((pass_count + 1)) || fail_count=$((fail_count + 1))

# --- Khách khác → 403 ---
CUST2=$(login "customer2@jptaxi.dev" "/login")
TOKEN2=$(node -pe "JSON.parse(process.argv[1]).token" "$CUST2")
CODE403=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BASE}/trips/${TRIP_ID}/rating/review-context" \
  -H "Authorization: Bearer ${TOKEN2}")
assert_eq "customer2 review-context trip1 → 403" "$CODE403" "403"

# --- Tài xế trip1: GET rating ---
DRV=$(login "driver8@jptaxi.dev" "/drivers/login")
DRV_TOKEN=$(node -pe "JSON.parse(process.argv[1]).token||''" "$DRV")
if [[ -n "$DRV_TOKEN" ]]; then
  CODE_DRV=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BASE}/trips/${TRIP_ID}/rating" \
    -H "Authorization: Bearer ${DRV_TOKEN}")
  assert_eq "driver8 GET trip1 rating" "$CODE_DRV" "200"

  SUM=$(curl -s -w "\n%{http_code}" -X GET "${BASE}/drivers/me/ratings/summary" \
    -H "Authorization: Bearer ${DRV_TOKEN}")
  assert_eq "driver summary HTTP" "$(echo "$SUM" | tail -n1)" "200"
  COUNT=$(node -pe "JSON.parse(process.argv[1]).ratingCount>=1" "$(echo "$SUM" | sed '$d')")
  assert_eq "driver8 ratingCount>=1" "$COUNT" "true"

  LIST=$(curl -s -w "\n%{http_code}" -X GET "${BASE}/drivers/me/ratings?limit=5" \
    -H "Authorization: Bearer ${DRV_TOKEN}")
  assert_eq "driver list HTTP" "$(echo "$LIST" | tail -n1)" "200"
  HAS_ITEMS=$(node -pe "(JSON.parse(process.argv[1]).items||[]).length>=1" "$(echo "$LIST" | sed '$d')")
  assert_eq "driver list có items" "$HAS_ITEMS" "true"

  # customer không được list driver ratings
  CODE_CUST_LIST=$(curl -s -o /dev/null -w "%{http_code}" -X GET "${BASE}/drivers/me/ratings" \
    -H "Authorization: Bearer ${CUST_TOKEN}")
  assert_eq "customer GET drivers/me/ratings → 403" "$CODE_CUST_LIST" "403"
else
  echo "  SKIP  driver8 login"
fi

# --- Public summary (không cần JWT) ---
PUB=$(curl -s -w "\n%{http_code}" -X GET "${BASE}/drivers/8/ratings/summary")
assert_eq "public summary không JWT → 200" "$(echo "$PUB" | tail -n1)" "200"
PUB_BODY=$(echo "$PUB" | sed '$d')
node -pe "
const d=JSON.parse(process.argv[1]);
const ok=d.driverId===8 && typeof d.ratingCount==='number';
console.log(ok?'  PASS  public summary body':'  FAIL  public summary body');
process.exit(ok?0:1);
" "$PUB_BODY" && pass_count=$((pass_count + 1)) || fail_count=$((fail_count + 1))

# --- POST conflict (trip1 đã có rating) ---
CONFLICT=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE}/trips/${TRIP_ID}/rating" \
  -H "Authorization: Bearer ${CUST_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"score":5}')
assert_eq "POST duplicate → 409" "$CONFLICT" "409"

# --- No auth ---
assert_eq "GET review-context no JWT → 401" \
  "$(curl -s -o /dev/null -w '%{http_code}' -X GET "${BASE}/trips/${TRIP_ID}/rating/review-context")" "401"

echo ""
echo "=== Kết quả: PASS=${pass_count} FAIL=${fail_count} ==="
[[ $fail_count -eq 0 ]] || exit 1
