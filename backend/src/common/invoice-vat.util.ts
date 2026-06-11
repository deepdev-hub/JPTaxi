/** Thuế GTGT / tiêu dùng — giá đã bao gồm thuế (tax-inclusive). */
export const DEFAULT_VAT_RATE_PERCENT = 10;

export interface VatBreakdown {
  vatRatePercent: number;
  totalInclTax: number;
  subtotalExclTax: number;
  vatAmount: number;
}

export function calculateVatFromInclusiveTotal(
  totalInclTax: number,
  vatRatePercent: number = DEFAULT_VAT_RATE_PERCENT,
): VatBreakdown {
  const safeTotal = Math.max(0, Math.round(totalInclTax));
  const rate = Math.max(0, vatRatePercent);
  const vatAmount =
    rate === 0 ? 0 : Math.round((safeTotal * rate) / (100 + rate));
  const subtotalExclTax = safeTotal - vatAmount;
  return {
    vatRatePercent: rate,
    totalInclTax: safeTotal,
    subtotalExclTax,
    vatAmount,
  };
}

/** Chia cước chính / phí dịch vụ theo tỷ lệ raw vs final (VND). */
export function splitFareAndServiceFee(
  finalVnd: number,
  rawVnd: number | null,
  serviceFeeRatio = 0.1,
): { fareVnd: number; serviceFeeVnd: number } {
  const total = Math.max(0, Math.round(finalVnd));
  if (rawVnd != null && rawVnd > 0 && rawVnd <= total) {
    return {
      fareVnd: Math.round(rawVnd),
      serviceFeeVnd: total - Math.round(rawVnd),
    };
  }
  const serviceFeeVnd = Math.round(total * serviceFeeRatio);
  return {
    fareVnd: total - serviceFeeVnd,
    serviceFeeVnd,
  };
}

export function vndToJpy(vnd: number, exchangeRateVndToJpy: number): number {
  const rate = Number(exchangeRateVndToJpy);
  return rate > 0 ? Math.round(vnd / rate) : 0;
}

export function buildInvoiceNumber(tripId: number, issuedAt: Date = new Date()): string {
  const y = issuedAt.getFullYear();
  const seq = String(tripId).padStart(4, '0');
  return `JPT-${y}-${seq}`;
}
