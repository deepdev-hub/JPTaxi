import { describe, expect, it } from 'vitest';
import { buildPaymentPayload } from './payment.js';

describe('buildPaymentPayload', () => {
  it('uses the entered password and stored payment method', () => {
    const payload = buildPaymentPayload({
      tripId: 17,
      paymentMethod: {
        paymentMethodId: 4,
        brand: 'VISA',
      },
      password: 'user-entered-secret',
      idempotencyKey: 'payment-17-unique',
    });

    expect(payload).toEqual({
      tripId: 17,
      paymentMethod: 'VISA',
      paymentMethodId: 4,
      password: 'user-entered-secret',
      idempotencyKey: 'payment-17-unique',
    });
  });

  it('builds a simulated payment without a saved-card id', () => {
    const payload = buildPaymentPayload({
      tripId: 18,
      paymentMethod: {
        code: 'PAYPAY',
      },
      password: 'user-entered-secret',
      idempotencyKey: 'payment-18-paypay',
    });

    expect(payload).toEqual({
      tripId: 18,
      paymentMethod: 'PAYPAY',
      password: 'user-entered-secret',
      idempotencyKey: 'payment-18-paypay',
    });
  });
});
