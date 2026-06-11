export const JPY_TO_VND_RATE = 160;
export const BASE_FARE_JPY = 500;
export const RESERVATION_FEE_JPY = 60;
export const DISTANCE_FARE_PER_KM_JPY = 25;

export function calculateRideFare(distanceKmInput: number) {
  const distanceKm = Number.isFinite(distanceKmInput) ? Math.max(0, distanceKmInput) : 0;
  const distanceFareJpy = Math.round(distanceKm * DISTANCE_FARE_PER_KM_JPY);
  const rawFareJpy = BASE_FARE_JPY + distanceFareJpy;
  const totalJpy = rawFareJpy + RESERVATION_FEE_JPY;

  return {
    distanceKm,
    distanceFareJpy,
    rawFareVnd: rawFareJpy * JPY_TO_VND_RATE,
    totalFareVnd: totalJpy * JPY_TO_VND_RATE,
    totalJpy,
  };
}
