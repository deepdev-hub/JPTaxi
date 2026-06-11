#!/usr/bin/env bash
# Kiểm thử API đăng ký tài xế — chạy: bash backend/scripts/test-driver-register.sh
set -euo pipefail

BASE="${API_BASE:-http://localhost:3000/api}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURE="${SCRIPT_DIR}/fixtures/test.png"
TS="$(date +%s)"
PASS="password123"

mkdir -p "$(dirname "$FIXTURE")"
if [[ ! -f "$FIXTURE" ]]; then
  python3 - "$FIXTURE" <<'PY'
import base64, sys
png = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)
open(sys.argv[1], "wb").write(png)
PY
fi

file_fields() {
  printf '%s\n' \
    "-F" "portrait=@${FIXTURE};type=image/png" \
    "-F" "licenseFront=@${FIXTURE};type=image/png" \
    "-F" "licenseBack=@${FIXTURE};type=image/png" \
    "-F" "vehiclePhoto=@${FIXTURE};type=image/png" \
    "-F" "registrationPaper=@${FIXTURE};type=image/png"
}

base_fields() {
  local email="$1" phone="$2" plate="$3" agree="${4:-true}" password="${5:-$PASS}"
  printf '%s\n' \
    "-F" "lastName=Nguyễn" \
    "-F" "firstName=KiểmThử" \
    "-F" "gender=Male" \
    "-F" "birthDate=1990-06-15" \
    "-F" "phone=${phone}" \
    "-F" "email=${email}" \
    "-F" "password=${password}" \
    "-F" "nationality=Vietnam" \
    "-F" "idNumber=KT${TS}" \
    "-F" "japaneseLevel=N3" \
    "-F" "licenseType=B" \
    "-F" "licenseIssueDate=2020-01-01" \
    "-F" "licenseIssuePlace=Tokyo" \
    "-F" "licenseExpiryDate=2030-12-31" \
    "-F" "vehicleType=4" \
    "-F" "licensePlate=${plate}" \
    "-F" "vehicleBrand=Toyota" \
    "-F" "vehicleColor=White" \
    "-F" "manufactureYear=2020" \
    "-F" "agreeToTerms=${agree}"
}

run_register() {
  local id="$1" expect="$2"
  shift 2
  local tmp
  tmp=$(mktemp)
  local code
  # shellcheck disable=SC2068
  code=$(curl -s -o "$tmp" -w "%{http_code}" -X POST "${BASE}/drivers/register" "$@")
  local app_status="—"
  local msg=""
  if command -v node >/dev/null 2>&1; then
    app_status=$(node -pe "
      try {
        const d = JSON.parse(require('fs').readFileSync('$tmp', 'utf8'));
        d.application?.status ?? '—';
      } catch { '—'; }
    " 2>/dev/null || echo "?")
    msg=$(node -e "
      try {
        const d = JSON.parse(require('fs').readFileSync('$tmp', 'utf8'));
        const m = d.message;
        process.stdout.write(typeof m === 'string' ? m : (Array.isArray(m) ? m.join(', ') : ''));
      } catch { process.stdout.write(''); }
    " 2>/dev/null | head -c 72)
  fi
  local ok="FAIL"
  if [[ "$code" == "$expect" ]]; then ok="PASS"; fi
  printf "| %-3s | %3s | %-4s | %-7s | %-4s | %s\n" "$id" "$code" "$expect" "$app_status" "$ok" "$msg"
  if [[ "$id" == "R01" && "$code" == "201" ]]; then
    REGISTERED_EMAIL=$(node -pe "JSON.parse(require('fs').readFileSync('$tmp','utf8')).application?.email||''" 2>/dev/null || true)
  fi
  rm -f "$tmp"
}

UNIQUE_EMAIL="driver-reg-${TS}@jptaxi.dev"
UNIQUE_PHONE="0799${TS: -7}"
UNIQUE_PLATE="9${TS: -2}Z-${TS: -3}.${TS: -2}"

REGISTERED_EMAIL=""

echo ""
echo "=== Kiểm thử đăng ký tài xế — POST ${BASE}/drivers/register ==="
printf "| %-3s | %3s | %-4s | %-7s | %-4s | %s\n" "ID" "HTTP" "Mong" "status" "Kết" "Message"
printf "|%s\n" "-----|-----|------|---------|------|--------"

# R01 — hồ sơ hợp lệ
run_register "R01" "201" \
  $(base_fields "$UNIQUE_EMAIL" "$UNIQUE_PHONE" "$UNIQUE_PLATE") \
  $(file_fields)

# R02 — email trùng
run_register "R02" "409" \
  $(base_fields "driver1@jptaxi.dev" "0799000199" "88Z-888.88") \
  $(file_fields)

# R03 — SĐT trùng
run_register "R03" "409" \
  $(base_fields "driver-new-${TS}@jptaxi.dev" "0700000001" "88Z-887.87") \
  $(file_fields)

# R04 — biển số trùng
run_register "R04" "409" \
  $(base_fields "driver-new2-${TS}@jptaxi.dev" "0799000299" "31A-101.01") \
  $(file_fields)

# R05 — thiếu ảnh
run_register "R05" "400" \
  $(base_fields "driver-noimg-${TS}@jptaxi.dev" "0799000399" "88Z-886.86")

# R06 — thiếu email
run_register "R06" "400" \
  -F "lastName=Test" -F "firstName=Driver" -F "gender=Male" \
  -F "birthDate=1990-01-01" -F "phone=0799000499" -F "password=${PASS}" \
  -F "nationality=Vietnam" -F "japaneseLevel=N3" -F "licenseType=B" \
  -F "licenseIssueDate=2020-01-01" -F "licenseExpiryDate=2030-01-01" \
  -F "vehicleType=4" -F "licensePlate=88Z-885.85" -F "vehicleBrand=Toyota" \
  -F "vehicleColor=White" -F "manufactureYear=2020" -F "agreeToTerms=true" \
  $(file_fields)

# R07 — email không hợp lệ
run_register "R07" "400" \
  $(base_fields "not-an-email" "0799000599" "88Z-884.84") \
  $(file_fields)

# R08 — mật khẩu ngắn
run_register "R08" "400" \
  $(base_fields "driver-shortpw-${TS}@jptaxi.dev" "0799000699" "88Z-883.83" true "123") \
  $(file_fields)

# R09 — chưa đồng ý điều khoản
run_register "R09" "400" \
  $(base_fields "driver-noterms-${TS}@jptaxi.dev" "0799000799" "88Z-882.82" false) \
  $(file_fields)

echo ""
echo "--- Đăng nhập ngay sau đăng ký (approved → 201 + JWT) ---"
if [[ -n "${REGISTERED_EMAIL:-}" ]]; then
  tmp=$(mktemp)
  code=$(curl -s -o "$tmp" -w "%{http_code}" -X POST "${BASE}/drivers/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${REGISTERED_EMAIL}\",\"password\":\"${PASS}\"}")
  token_ok="—"
  if command -v node >/dev/null 2>&1; then
    token_ok=$(node -pe "const d=JSON.parse(require('fs').readFileSync('$tmp','utf8')||'{}'); d.token?'có':'không'" 2>/dev/null || echo "?")
  fi
  ok="FAIL"
  [[ "$code" == "201" ]] && ok="PASS"
  printf "| R10 | %3s | 201  | login   | %-4s | JWT: %s\n" "$code" "$ok" "$token_ok"
  rm -f "$tmp"
else
  echo "| R10 |  —  | 201  | (bỏ qua — R01 thất bại) |"
fi

echo ""
echo "Ghi chú: R01 thành công → application.status=approved, có thể login ngay."
echo "Email thử R01: ${UNIQUE_EMAIL}"
echo ""
