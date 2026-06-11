#!/usr/bin/env bash
# Kiểm thử logic thông báo khi không có tài xế phù hợp — GET /api/drivers/search
# Chạy: bash backend/scripts/test-driver-search-notifications.sh
# Yêu cầu: backend đang chạy (npm run start:dev), DB có seed + vị trí gần đây.
set -euo pipefail

BASE="${API_BASE:-http://localhost:3000/api}"
HN_LAT="${SEARCH_LAT:-21.02878}"
HN_LNG="${SEARCH_LNG:-105.85204}"
REMOTE_LAT="${REMOTE_LAT:-10}"
REMOTE_LNG="${REMOTE_LNG:-80}"

PASS=0
FAIL=0

assert_json() {
  local id="$1" desc="$2" qs="$3" expect_http="$4" node_assert="$5"
  local tmp code body ok=0
  tmp=$(mktemp)
  code=$(curl -s -o "$tmp" -w "%{http_code}" "${BASE}/drivers/search?${qs}")
  body=$(cat "$tmp")
  rm -f "$tmp"

  if [[ "$code" != "$expect_http" ]]; then
    printf "FAIL | %-4s | HTTP %s (mong %s) | %s\n" "$id" "$code" "$expect_http" "$desc"
    FAIL=$((FAIL + 1))
    return
  fi

  if ! node -e "
    const d = JSON.parse(process.argv[1]);
    const ok = (${node_assert});
    if (!ok) {
      console.error(JSON.stringify({ count: d.count, hasResults: d.hasResults, notification: d.notification, message: d.message }, null, 2));
      process.exit(1);
    }
  " "$body" 2>/dev/null; then
    printf "FAIL | %-4s | %s\n       qs: %s\n" "$id" "$desc" "$qs"
    node -e "const d=JSON.parse(process.argv[1]); console.error(JSON.stringify(d,null,2))" "$body" 2>/dev/null | sed 's/^/       /' || true
    FAIL=$((FAIL + 1))
    return
  fi

  local notif count
  notif=$(node -pe "JSON.parse(process.argv[1]).notification?.code||'null'" "$body" 2>/dev/null || echo "?")
  count=$(node -pe "JSON.parse(process.argv[1]).count" "$body" 2>/dev/null || echo "?")
  printf "PASS | %-4s | count=%s notification=%s | %s\n" "$id" "$count" "$notif" "$desc"
  PASS=$((PASS + 1))
}

echo ""
echo "=== Kiểm thử thông báo tìm tài xế — ${BASE}/drivers/search ==="
echo "Hà Nội: lat=${HN_LAT} lng=${HN_LNG} | Vùng trống: lat=${REMOTE_LAT} lng=${REMOTE_LNG}"
echo ""

# N01 — Không có tài xế trong vùng, không lọc phụ
assert_json "N01" "Vùng trống → NO_DRIVERS_IN_AREA" \
  "lat=${REMOTE_LAT}&lng=${REMOTE_LNG}&radiusKm=20" "200" \
  "d.count===0 && d.hasResults===false && d.notification?.code==='NO_DRIVERS_IN_AREA' && typeof d.notification.message==='string' && typeof d.notification.messageJa==='string'"

# N02 — Có tài xế trong vùng nhưng lọc quá chặt (seed HN thường có driver)
assert_json "N02" "HN + lọc chặt → NO_DRIVERS_MATCHING_FILTERS" \
  "lat=${HN_LAT}&lng=${HN_LNG}&radiusKm=10&vehicleType=4&minJapaneseLevel=Native&minRating=5&limit=5" "200" \
  "d.count===0 && d.notification?.code==='NO_DRIVERS_MATCHING_FILTERS' && d.notification.message.includes('điều kiện lọc')"

# N03 — Vùng trống + có lọc phụ → vẫn IN_AREA (không có ai trong vùng)
assert_json "N03" "Vùng trống + vehicleType → NO_DRIVERS_IN_AREA" \
  "lat=${REMOTE_LAT}&lng=${REMOTE_LNG}&radiusKm=20&vehicleType=4" "200" \
  "d.count===0 && d.notification?.code==='NO_DRIVERS_IN_AREA'"

# N04 — Có kết quả → không trả notification
assert_json "N04" "Có tài xế → notification null" \
  "lat=${HN_LAT}&lng=${HN_LNG}&radiusKm=10&limit=3" "200" \
  "d.count>0 && d.hasResults===true && d.notification===null"

# N05 — Chỉ lọc vehicleType không khớp (4 chỗ) nhưng vẫn có driver trong vùng
assert_json "N05" "HN + chỉ vehicleType=4 (nếu 0 kết quả) → MATCHING_FILTERS hoặc có kết quả" \
  "lat=${HN_LAT}&lng=${HN_LNG}&radiusKm=10&vehicleType=4&limit=1" "200" \
  "(d.count>0 && d.notification===null) || (d.count===0 && d.notification?.code==='NO_DRIVERS_MATCHING_FILTERS')"

# N06 — minRating=5 một mình (thường 0 kết quả ở HN)
assert_json "N06" "HN + minRating=5 → MATCHING hoặc IN_AREA nếu count=0" \
  "lat=${HN_LAT}&lng=${HN_LNG}&radiusKm=10&minRating=5&limit=5" "200" \
  "d.count===0 ? (d.notification?.code==='NO_DRIVERS_MATCHING_FILTERS' || d.notification?.code==='NO_DRIVERS_IN_AREA') : (d.count>0 && d.notification===null)"

# N07 — Validation radius tối thiểu 0.5 km
assert_json "N07" "radiusKm=0.1 → 400 validation" \
  "lat=${HN_LAT}&lng=${HN_LNG}&radiusKm=0.1" "400" \
  "Array.isArray(d.message)"

echo ""
echo "Kết quả: ${PASS} PASS, ${FAIL} FAIL"
echo ""

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
