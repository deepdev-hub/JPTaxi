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
});
