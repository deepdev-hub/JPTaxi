import { calculateFareFromRules } from './pricing.util';

describe('calculateFareFromRules', () => {
  it('applies each distance band once', () => {
    expect(calculateFareFromRules(8.2, [
      { startKm: 0, endKm: 1.5, pricePerKmVnd: 20_000 },
      { startKm: 1.5, endKm: 10, pricePerKmVnd: 13_500 },
      { startKm: 10, endKm: null, pricePerKmVnd: 11_000 },
    ])).toBe(120_450);
  });
});
