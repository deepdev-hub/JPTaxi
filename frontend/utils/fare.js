export const JPY_TO_VND_RATE = 160;
export const BASE_FARE_JPY = 500;
export const RESERVATION_FEE_JPY = 60;
export const MIN_DISTANCE_FARE_JPY = 0;
export const DISTANCE_FARE_PER_KM_JPY = 25;

export function parseDistanceKm(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.max(0, value) : 0;
  const text = String(value ?? '').trim().toLowerCase();
  const amount = Number(text.replace(/[^0-9.,]/g, '').replace(',', '.'));
  if (!Number.isFinite(amount)) return 0;
  return text.includes('m') && !text.includes('km') ? amount / 1000 : amount;
}

export function formatYen(value) {
  return `¥${new Intl.NumberFormat('ja-JP').format(Math.round(Number(value) || 0))}`;
}

export function calculateFareBreakdown(distanceInput) {
  const distanceKm = parseDistanceKm(distanceInput);
  const distanceFareJpy = Math.max(
    MIN_DISTANCE_FARE_JPY,
    Math.round(distanceKm * DISTANCE_FARE_PER_KM_JPY),
  );
  const rideFareJpy = BASE_FARE_JPY + distanceFareJpy;
  const totalJpy = rideFareJpy + RESERVATION_FEE_JPY;
  return {
    distanceKm,
    baseFareJpy: BASE_FARE_JPY,
    distanceFareJpy,
    reservationFeeJpy: RESERVATION_FEE_JPY,
    rideFareJpy,
    totalJpy,
    rawFareVnd: rideFareJpy * JPY_TO_VND_RATE,
    totalFareVnd: totalJpy * JPY_TO_VND_RATE,
  };
}

export function calculateTripFareBreakdown(trip, fallbackDistance = 4.8) {
  const calculated = calculateFareBreakdown(
    trip?.actualDistanceKm ?? trip?.distanceKm ?? fallbackDistance,
  );
  const totalJpy = Math.round(Number(trip?.finalFareJpy)) || calculated.totalJpy;
  const totalFareVnd = Math.round(Number(trip?.finalFareVnd)) || totalJpy * JPY_TO_VND_RATE;
  const rawFareVnd = Math.round(Number(trip?.rawFareVnd)) || Math.max(
    0,
    totalFareVnd - RESERVATION_FEE_JPY * JPY_TO_VND_RATE,
  );
  const rideFareJpy = Math.min(totalJpy, Math.round(rawFareVnd / JPY_TO_VND_RATE));
  const reservationFeeJpy = Math.max(0, totalJpy - rideFareJpy);
  const baseFareJpy = Math.min(BASE_FARE_JPY, rideFareJpy);

  return {
    ...calculated,
    baseFareJpy,
    distanceFareJpy: Math.max(0, rideFareJpy - baseFareJpy),
    reservationFeeJpy,
    rideFareJpy,
    totalJpy,
    rawFareVnd,
    totalFareVnd,
  };
}
