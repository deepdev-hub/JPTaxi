import { randomUUID } from 'crypto';
import { PaymentMethodEnum } from '../entities/payment-transaction.entity';

const storedCardMethods = new Set<PaymentMethodEnum>([
  PaymentMethodEnum.VISA,
  PaymentMethodEnum.MASTER,
  PaymentMethodEnum.JCB,
]);

export function isStoredCardPayment(method: PaymentMethodEnum): boolean {
  return storedCardMethods.has(method);
}

export function validatePaymentMethodSelection(
  method: PaymentMethodEnum,
  paymentMethodId?: number,
): void {
  if (isStoredCardPayment(method) && paymentMethodId == null) {
    throw new Error('A saved card is required for card payment');
  }
  if (!isStoredCardPayment(method) && paymentMethodId != null) {
    throw new Error('This payment method must not reference a saved card');
  }
}

export function tokenizeCard(input: {
  cardNumber: string;
  securityCode: string;
}): { lastFour: string; providerToken: string } {
  const digits = input.cardNumber.replace(/\D/g, '');
  if (digits.length < 12 || digits.length > 19) {
    throw new Error('Card number must contain between 12 and 19 digits');
  }
  if (!/^\d{3,4}$/.test(input.securityCode)) {
    throw new Error('Security code must contain 3 or 4 digits');
  }
  let providerToken: string;
  do {
    providerToken = `local_pm_${randomUUID().replace(/-/g, '')}`;
  } while (
    providerToken.includes(input.securityCode)
    || providerToken.includes(digits)
  );
  return {
    lastFour: digits.slice(-4),
    providerToken,
  };
}
