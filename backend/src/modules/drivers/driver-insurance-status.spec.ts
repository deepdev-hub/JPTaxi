import { getDriverInsuranceStatus } from './driver-insurance-status';

describe('getDriverInsuranceStatus', () => {
  const today = new Date('2026-06-12T00:00:00.000Z');

  it('distinguishes missing, active, expiring and expired insurance', () => {
    expect(getDriverInsuranceStatus(null, today)).toBe('missing');
    expect(getDriverInsuranceStatus('2026-08-01', today)).toBe('active');
    expect(getDriverInsuranceStatus('2026-06-30', today)).toBe('expiring');
    expect(getDriverInsuranceStatus('2026-06-11', today)).toBe('expired');
  });
});
