import { calculatePayout } from './payout.util';

describe('calculatePayout', () => {
  it('deducts the configured commission from the gross fare', () => {
    expect(calculatePayout(98_000, 20)).toEqual({
      grossFareVnd: 98_000,
      commissionVnd: 19_600,
      netAmountVnd: 78_400,
    });
  });
});
