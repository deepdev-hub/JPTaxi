import {
  isStoredCardPayment,
  tokenizeCard,
  validatePaymentMethodSelection,
} from './payment-method.util';
import { PaymentMethodEnum } from '../entities/payment-transaction.entity';

describe('tokenizeCard', () => {
  it('returns only safe card metadata', () => {
    const result = tokenizeCard({
      cardNumber: '4111 1111 1111 4821',
      securityCode: '123',
    });

    expect(result.lastFour).toBe('4821');
    expect(result.providerToken).toMatch(/^local_pm_/);
    expect(JSON.stringify(result)).not.toContain('4111111111114821');
    expect(JSON.stringify(result)).not.toContain('123');
  });
});

describe('PaymentMethodEnum', () => {
  it('supports the locally simulated payment methods', () => {
    expect(Object.values(PaymentMethodEnum)).toEqual(
      expect.arrayContaining(['CASH', 'PAYPAY', 'APPLE_PAY']),
    );
  });
});

describe('isStoredCardPayment', () => {
  it('only classifies persisted card brands as stored-card payments', () => {
    expect(isStoredCardPayment(PaymentMethodEnum.VISA)).toBe(true);
    expect(isStoredCardPayment(PaymentMethodEnum.MASTER)).toBe(true);
    expect(isStoredCardPayment(PaymentMethodEnum.JCB)).toBe(true);
    expect(isStoredCardPayment(PaymentMethodEnum.CASH)).toBe(false);
    expect(isStoredCardPayment(PaymentMethodEnum.PAYPAY)).toBe(false);
    expect(isStoredCardPayment(PaymentMethodEnum.APPLE_PAY)).toBe(false);
  });
});

describe('validatePaymentMethodSelection', () => {
  it('requires an id only for persisted card payments', () => {
    expect(() =>
      validatePaymentMethodSelection(PaymentMethodEnum.VISA, undefined),
    ).toThrow('A saved card is required');
    expect(() =>
      validatePaymentMethodSelection(PaymentMethodEnum.CASH, 12),
    ).toThrow('must not reference a saved card');
    expect(() =>
      validatePaymentMethodSelection(PaymentMethodEnum.MASTER, 12),
    ).not.toThrow();
    expect(() =>
      validatePaymentMethodSelection(PaymentMethodEnum.PAYPAY, undefined),
    ).not.toThrow();
  });
});
