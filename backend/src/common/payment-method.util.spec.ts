import { tokenizeCard } from './payment-method.util';

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
