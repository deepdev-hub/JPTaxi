export function calculatePayout(grossFareVnd: number, commissionPercent = 20) {
  const gross = Math.max(0, Math.round(grossFareVnd));
  const commission = Math.round(gross * (commissionPercent / 100));
  return {
    grossFareVnd: gross,
    commissionVnd: commission,
    netAmountVnd: gross - commission,
  };
}
