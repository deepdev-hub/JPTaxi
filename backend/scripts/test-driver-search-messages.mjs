/**
 * Unit test thuần cho buildNoDriversNotification (không cần DB).
 * Chạy: node backend/scripts/test-driver-search-messages.mjs
 * (sau khi: cd backend && npm run build)
 */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const distPath = path.join(__dirname, '../dist/modules/drivers/driver-search.messages.js');
let mod;
try {
  mod = require(distPath);
} catch {
  console.error('Chưa build backend. Chạy: cd backend && npm run build');
  process.exit(2);
}

const { buildNoDriversNotification, DRIVER_SEARCH_NOTIFICATION_CODES } = mod;

const cases = [
  {
    id: 'U01',
    q: { lat: 21, lng: 105, radiusKm: 10 },
    driversInArea: 0,
    expectCode: 'NO_DRIVERS_IN_AREA',
    expectSubstr: 'bán kính 10 km',
  },
  {
    id: 'U02',
    q: { lat: 21, lng: 105, radiusKm: 5, vehicleType: 4 },
    driversInArea: 3,
    expectCode: 'NO_DRIVERS_MATCHING_FILTERS',
    expectSubstr: 'loại xe 4 chỗ',
  },
  {
    id: 'U03',
    q: { lat: 21, lng: 105, vehicleType: 7, minJapaneseLevel: 'N1', minRating: 4 },
    driversInArea: 2,
    expectCode: 'NO_DRIVERS_MATCHING_FILTERS',
    expectSubstr: 'trình độ tiếng Nhật',
  },
  {
    id: 'U04',
    q: { lat: 21, lng: 105, radiusKm: 15 },
    driversInArea: 5,
    expectCode: 'NO_DRIVERS_IN_AREA',
    expectSubstr: '15 km',
  },
  {
    id: 'U05',
    q: { lat: 21, lng: 105, radiusKm: 10, vehicleType: 9 },
    driversInArea: 0,
    expectCode: 'NO_DRIVERS_IN_AREA',
    expectSubstr: '10 km',
  },
];

let pass = 0;
let fail = 0;

for (const c of cases) {
  const n = buildNoDriversNotification(c.q, c.driversInArea);
  const codeOk = n.code === DRIVER_SEARCH_NOTIFICATION_CODES[c.expectCode];
  const msgOk = n.message.includes(c.expectSubstr);
  const jaOk = typeof n.messageJa === 'string' && n.messageJa.length > 10;
  if (codeOk && msgOk && jaOk) {
    console.log(`PASS | ${c.id} | ${n.code}`);
    pass++;
  } else {
    console.log(`FAIL | ${c.id} | got ${n.code}, message=${n.message.slice(0, 80)}...`);
    fail++;
  }
}

console.log(`\nUnit: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
