export function buildPaymentPayload({
  tripId,
  paymentMethod,
  password,
  idempotencyKey = crypto.randomUUID(),
}) {
  const numericTripId = Number(tripId);
  if (!Number.isInteger(numericTripId) || numericTripId <= 0) {
    throw new Error('A valid trip is required.');
  }
  if (!paymentMethod?.paymentMethodId || !paymentMethod?.brand) {
    throw new Error('Select a saved payment method.');
  }
  if (!String(password ?? '').trim()) {
    throw new Error('Enter your account password.');
  }
  return {
    tripId: numericTripId,
    paymentMethod: paymentMethod.brand,
    paymentMethodId: Number(paymentMethod.paymentMethodId),
    password,
    idempotencyKey,
  };
}
