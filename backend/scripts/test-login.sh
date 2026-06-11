#!/usr/bin/env bash
# Kiểm thử API đăng nhập — chạy: bash backend/scripts/test-login.sh
set -euo pipefail

BASE="${API_BASE:-http://localhost:3000/api}"
PASS="password123"

run() {
  local id="$1" method="$2" path="$3" body="$4" expect="$5"
  local tmp
  tmp=$(mktemp)
  local code
  code=$(curl -s -o "$tmp" -w "%{http_code}" -X "$method" "${BASE}${path}" \
    -H 'Content-Type: application/json' \
    -d "$body")
  local token_ok="—"
  if command -v node >/dev/null 2>&1; then
    token_ok=$(node -pe "const d=JSON.parse(require('fs').readFileSync('$tmp','utf8')||'{}'); d.token?'có':'không'" 2>/dev/null || echo "?")
  fi
  local msg
  msg=$(node -pe "try{const d=JSON.parse(require('fs').readFileSync('$tmp','utf8')); console.log(typeof d.message==='string'?d.message:(Array.isArray(d.message)?d.message.join(', '):''))}catch(e){console.log('')}" 2>/dev/null | head -c 80)
  local ok="FAIL"
  if [[ "$code" == "$expect" ]]; then ok="PASS"; fi
  printf "| %-3s | %-32s | %3s | %-4s | %-3s | %s\n" "$id" "$path" "$code" "$expect" "$token_ok" "$msg"
  rm -f "$tmp"
}

echo ""
echo "=== Kiểm thử đăng nhập — $BASE ==="
printf "| %-3s | %-32s | %3s | %-4s | %-3s | %s\n" "ID" "Endpoint" "HTTP" "Mong" "JWT" "Message"
printf "|%s\n" "-----|----------------------------------|-----|------|-----|--------"

# --- Khách hàng POST /login ---
run "C01" POST "/login" '{"email":"customer1@jptaxi.dev","password":"'"$PASS"'"}' "201"
run "C02" POST "/login" '{"email":"customer1@jptaxi.dev","password":"wrongpass"}' "401"
run "C03" POST "/login" '{"email":"notexist@jptaxi.dev","password":"'"$PASS"'"}' "401"
run "C04" POST "/login" '{"email":"invalid-email","password":"'"$PASS"'"}' "400"
run "C05" POST "/login" '{"email":"customer1@jptaxi.dev","password":""}' "400"
run "C06" POST "/login" '{}' "400"
run "C07" POST "/login" '{"email":"CUSTOMER1@JPTAXI.DEV","password":"'"$PASS"'"}' "201"

# --- Tài xế POST /drivers/login ---
run "D01" POST "/drivers/login" '{"email":"driver1@jptaxi.dev","password":"'"$PASS"'"}' "201"
run "D02" POST "/drivers/login" '{"email":"driver1@jptaxi.dev","password":"wrong"}' "401"
run "D03" POST "/drivers/login" '{"email":"driver71@jptaxi.dev","password":"'"$PASS"'"}' "403"
run "D04" POST "/drivers/login" '{"email":"driver86@jptaxi.dev","password":"'"$PASS"'"}' "403"
run "D05" POST "/drivers/login" '{"email":"customer1@jptaxi.dev","password":"'"$PASS"'"}' "401"
run "D06" POST "/drivers/login" '{"email":"driver96@jptaxi.dev","password":"'"$PASS"'"}' "403"

# --- Sai endpoint (cross-role) ---
run "X01" POST "/login" '{"email":"driver1@jptaxi.dev","password":"'"$PASS"'"}' "401"

# --- Admin POST /admin/login ---
run "A01" POST "/admin/login" '{"username":"admin1","password":"admin123"}' "201"
run "A02" POST "/admin/login" '{"username":"admin1","password":"wrong"}' "401"
run "A03" POST "/admin/login" '{"username":"nobody","password":"admin123"}' "401"

echo ""
echo "Ghi chú: NestJS POST thường trả 201 khi thành công. JWT 'có' = response có field token."
echo ""
