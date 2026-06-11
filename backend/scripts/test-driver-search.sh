#!/usr/bin/env bash
# Kiểm thử API tìm tài xế — chạy: bash backend/scripts/test-driver-search.sh
# Lưu ý: cần tài xế approved + vị trí gần đây trong driver_location_history.
# Nếu seed cũ, chạy: cd backend && npm run test:db (hoặc UPDATE recorded_at = NOW()).
set -euo pipefail

BASE="${API_BASE:-http://localhost:3000/api}"
LAT="${SEARCH_LAT:-21.02878}"
LNG="${SEARCH_LNG:-105.85204}"

run() {
  local id="$1" expect="$2" qs="$3"
  local tmp
  tmp=$(mktemp)
  local code
  code=$(curl -s -o "$tmp" -w "%{http_code}" "${BASE}/drivers/search?${qs}")
  local count notif dist ok="FAIL"
  if command -v node >/dev/null 2>&1; then
    count=$(node -pe "JSON.parse(require('fs').readFileSync('$tmp','utf8')).count" 2>/dev/null || echo "?")
    notif=$(node -pe "const d=JSON.parse(require('fs').readFileSync('$tmp','utf8')); d.notification?.code||'—'" 2>/dev/null || echo "?")
    dist=$(node -pe "const d=JSON.parse(require('fs').readFileSync('$tmp','utf8')); d.drivers?.[0]?.distanceKm??'—'" 2>/dev/null || echo "?")
  fi
  [[ "$code" == "$expect" ]] && ok="PASS"
  printf "| %-4s | %3s | %-4s | %2s | %-32s | %-6s | %s\n" "$id" "$code" "$expect" "$count" "$notif" "$dist" "$ok"
  rm -f "$tmp"
}

echo ""
echo "=== Kiểm thử tìm tài xế — GET ${BASE}/drivers/search ==="
printf "| %-4s | %3s | %-4s | %2s | %-32s | %-6s | %s\n" "ID" "HTTP" "Mong" "#" "notification" "km[0]" "Kết"
printf "|%s\n" "------|-----|------|----|--------------------------------|--------|------"

run "S01" "200" "lat=${LAT}&lng=${LNG}&radiusKm=10&limit=5"
run "S02" "200" "lat=${LAT}&lng=${LNG}&radiusKm=10&vehicleType=4&limit=10"
run "S03" "200" "lat=${LAT}&lng=${LNG}&radiusKm=10&vehicleType=7&limit=10"
run "S04" "200" "lat=${LAT}&lng=${LNG}&radiusKm=10&minJapaneseLevel=N3&limit=10"
run "S05" "200" "lat=${LAT}&lng=${LNG}&radiusKm=10&minJapaneseLevel=Native&limit=10"
run "S06" "200" "lat=${LAT}&lng=${LNG}&radiusKm=0.5&limit=10"
run "S07" "200" "lat=${LAT}&lng=${LNG}&radiusKm=50&limit=5"
run "S08" "200" "lat=${LAT}&lng=${LNG}&radiusKm=10&sort=distance&limit=3"
run "S09" "200" "lat=${LAT}&lng=${LNG}&radiusKm=10&sort=rating&limit=3"
run "S10" "400" "lat=invalid&lng=${LNG}"
run "S11" "400" "lng=${LNG}"
run "S12" "400" "lat=${LAT}&lng=${LNG}&radiusKm=0.1"
run "S13" "400" "lat=${LAT}&lng=${LNG}&minRating=6"
run "S14" "200" "lat=${LAT}&lng=${LNG}&radiusKm=10&vehicleType=4&minJapaneseLevel=N1&minRating=4&limit=5"
run "S15" "200" "lat=${LAT}&lng=${LNG}&radiusKm=10&vehicleType=9&minJapaneseLevel=Native&minRating=5&limit=5"
run "S16" "400" "lat=${LAT}&lng=${LNG}&maxLocationAgeMinutes=2000"

echo ""
echo "Query mẫu: lat, lng (bắt buộc), radiusKm, vehicleType (4|7|9), minJapaneseLevel, minRating, sort, limit, maxLocationAgeMinutes (mặc định 30, tối đa 1440)."
echo ""
