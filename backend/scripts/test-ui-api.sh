#!/usr/bin/env bash
# Kiểm thử API phục vụ mọi tương tác giao diện có nối backend
# bash backend/scripts/test-ui-api.sh
set -euo pipefail

BASE="${API_BASE:-http://localhost:3000/api}"
PASS="password123"
pass=0
fail=0

ok() { printf "  PASS  %s\n" "$1"; pass=$((pass + 1)); }
bad() { printf "  FAIL  %s\n" "$1"; fail=$((fail + 1)); }

expect_http() {
  local label="$1" method="$2" path="$3" want="$4"
  shift 4
  local code
  if [[ $# -gt 0 ]]; then
    code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "${BASE}${path}" "$@")
  else
    code=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "${BASE}${path}")
  fi
  if [[ "$code" == "$want" ]]; then ok "$label ($code)"; else bad "$label (got $code want $want)"; fi
}

login_token() {
  local email="$1" ep="$2"
  curl -s -X POST "${BASE}${ep}" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${email}\",\"password\":\"${PASS}\"}" \
    | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).token||''" 2>/dev/null || echo ""
}

echo ""
echo "=== Kiểm thử API ↔ giao diện — $BASE ==="

# --- Auth (Login, Register pages) ---
expect_http "POST /login invalid" POST "/login" "400" -H 'Content-Type: application/json' -d '{}'
CUST=$(login_token "customer1@jptaxi.dev" "/login")
DRV=$(login_token "driver8@jptaxi.dev" "/drivers/login")
[[ -n "$CUST" ]] && ok "Login customer1 JWT" || bad "Login customer1 JWT"
[[ -n "$DRV" ]] && ok "Login driver8 JWT" || bad "Login driver8 JWT"

expect_http "GET /profile (customer)" GET "/profile" "200" \
  -H "Authorization: Bearer ${CUST}"
expect_http "GET drivers/me/profile" GET "/drivers/me/profile" "200" \
  -H "Authorization: Bearer ${DRV}"

# --- Estimate (BillConfirm) ---
expect_http "POST /estimate" POST "/estimate" "201" \
  -H 'Content-Type: application/json' \
  -d '{"startLat":21.0289,"startLng":105.812,"endLat":21.0245,"endLng":105.8558,"vehicleType":"7"}'

# --- Ride request flow (BillConfirm, SearchCar, RideStatus) ---
REQ_BODY='{"pickupAddress":"Lotte Center","pickupLat":21.0289,"pickupLng":105.812,"dropoffAddress":"Opera House","dropoffLat":21.0245,"dropoffLng":105.8558,"vehicleType":"7"}'
CREATE=$(curl -s -w "\n%{http_code}" -X POST "${BASE}/ride-requests" \
  -H "Authorization: Bearer ${CUST}" \
  -H 'Content-Type: application/json' \
  -d "$REQ_BODY")
HTTP_CREATE=$(echo "$CREATE" | tail -n1)
if [[ "$HTTP_CREATE" == "201" ]] || [[ "$HTTP_CREATE" == "200" ]]; then
  ok "POST /ride-requests ($HTTP_CREATE)"
  REQ_ID=$(echo "$CREATE" | sed '$d' | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).requestId||''" 2>/dev/null || echo "")
  if [[ -n "$REQ_ID" ]]; then
    expect_http "GET ride-requests/:id" GET "/ride-requests/${REQ_ID}" "200" \
      -H "Authorization: Bearer ${CUST}"
  fi
else
  bad "POST /ride-requests (got $HTTP_CREATE)"
fi

# --- Driver dispatch ---
expect_http "GET pending dispatch" GET "/ride-requests/dispatches/me/pending" "200" \
  -H "Authorization: Bearer ${DRV}"

# --- Ratings (DriverReview, DriverInfo) ---
expect_http "GET review-context trip1" GET "/trips/1/rating/review-context" "200" \
  -H "Authorization: Bearer ${CUST}"
expect_http "GET public driver rating summary" GET "/drivers/8/ratings/summary" "200"
expect_http "GET drivers/me/ratings" GET "/drivers/me/ratings?limit=3" "200" \
  -H "Authorization: Bearer ${DRV}"

# --- Invoice ---
expect_http "GET trip invoice" GET "/trips/1/invoice" "200" \
  -H "Authorization: Bearer ${CUST}"

# --- Customer profile (UserInfo) ---
expect_http "GET customers/1/profile" GET "/customers/1/profile" "200" \
  -H "Authorization: Bearer ${CUST}"

# --- Driver search (if used) ---
expect_http "GET drivers/search" GET "/drivers/search?lat=21.0289&lng=105.812&limit=3" "200" \
  -H "Authorization: Bearer ${CUST}"

# --- Auth guards ---
expect_http "GET profile no JWT" GET "/profile" "401"
expect_http "customer on driver profile" GET "/drivers/me/profile" "403" \
  -H "Authorization: Bearer ${CUST}"

echo ""
echo "=== Tổng: PASS=$pass FAIL=$fail ==="
[[ $fail -eq 0 ]] || exit 1
