import {
  buildInvoiceNumber,
  calculateVatFromInclusiveTotal,
  splitFareAndServiceFee,
} from './invoice-vat.util';

describe('invoice VAT utilities', () => {
  it('keeps the inclusive total intact when splitting VAT and fare lines', () => {
    expect(calculateVatFromInclusiveTotal(98_000, 10)).toEqual({
      vatRatePercent: 10,
      totalInclTax: 98_000,
      subtotalExclTax: 89_091,
      vatAmount: 8_909,
    });
    expect(splitFareAndServiceFee(98_000, 90_000)).toEqual({
      fareVnd: 90_000,
      serviceFeeVnd: 8_000,
    });
    expect(buildInvoiceNumber(12, new Date('2026-06-11T00:00:00Z')))
      .toBe('JPT-2026-0012');
  });
});
