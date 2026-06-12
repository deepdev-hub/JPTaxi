import { calculateSearchRadiusKm, isDispatchOfferExpired } from './dispatch-policy';

describe('calculateSearchRadiusKm', () => {
  it('starts at 2 km and increases by 1 km every 2 seconds', () => {
    expect(calculateSearchRadiusKm(0, 2, 1, 2_000)).toBe(2);
    expect(calculateSearchRadiusKm(1_999, 2, 1, 2_000)).toBe(2);
    expect(calculateSearchRadiusKm(2_000, 2, 1, 2_000)).toBe(3);
    expect(calculateSearchRadiusKm(4_000, 2, 1, 2_000)).toBe(4);
    expect(calculateSearchRadiusKm(6_000, 2, 1, 2_000)).toBe(5);
  });
});

describe('isDispatchOfferExpired', () => {
  it('expires exactly at the offer deadline', () => {
    const deadline = new Date('2026-06-12T00:00:30.000Z');

    expect(
      isDispatchOfferExpired(deadline, new Date('2026-06-12T00:00:29.999Z')),
    ).toBe(false);
    expect(
      isDispatchOfferExpired(deadline, new Date('2026-06-12T00:00:30.000Z')),
    ).toBe(true);
  });
});
