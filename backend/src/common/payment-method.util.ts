import { randomUUID } from 'crypto';

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
  return {
    lastFour: digits.slice(-4),
    providerToken: `local_pm_${randomUUID().replace(/-/g, '')}`,
  };
}
