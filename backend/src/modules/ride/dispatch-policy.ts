export function calculateSearchRadiusKm(
  elapsedMs: number,
  initialRadiusKm: number,
  radiusStepKm: number,
  expansionIntervalMs: number,
): number {
  const elapsedSteps = Math.floor(Math.max(0, elapsedMs) / expansionIntervalMs);
  return initialRadiusKm + elapsedSteps * radiusStepKm;
}

export function isDispatchOfferExpired(
  expiresAt: Date,
  now = new Date(),
): boolean {
  return now.getTime() >= expiresAt.getTime();
}
