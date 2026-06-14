export function buildPaymentPayload({
  tripId,
  paymentMethod,
  password,
  idempotencyKey = crypto.randomUUID(),
}) {
  const simulatedMethods = new Set(['CASH', 'PAYPAY', 'APPLE_PAY']);
  const numericTripId = Number(tripId);
  if (!Number.isInteger(numericTripId) || numericTripId <= 0) {
    throw new Error('A valid trip is required.');
  }
  const methodCode = paymentMethod?.brand || paymentMethod?.code;
  const isSimulated = simulatedMethods.has(methodCode);
  if (!methodCode || (!isSimulated && !paymentMethod?.paymentMethodId)) {
    throw new Error('Select a saved payment method.');
  }
  if (methodCode !== 'CASH' && !String(password ?? '').trim()) {
    throw new Error('Enter your account password.');
  }
  const payload = {
    tripId: numericTripId,
    paymentMethod: methodCode,
    password,
    idempotencyKey,
  };
  if (!isSimulated) {
    payload.paymentMethodId = Number(paymentMethod.paymentMethodId);
  }
  return payload;
}
