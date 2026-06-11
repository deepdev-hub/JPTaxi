export interface FareRule {
  startKm: number;
  endKm: number | null;
  pricePerKmVnd: number;
}

export function calculateFareFromRules(distanceKm: number, rules: FareRule[]): number {
  const distance = Math.max(0, distanceKm);
  const total = rules.reduce((sum, rule) => {
    const upper = rule.endKm == null ? distance : Math.min(distance, rule.endKm);
    const covered = Math.max(0, upper - rule.startKm);
    return sum + covered * rule.pricePerKmVnd;
  }, 0);
  return Math.round(total);
}
