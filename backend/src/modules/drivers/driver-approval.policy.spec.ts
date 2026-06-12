import { DriverStatusType } from '../../entities/driver.entity';
import {
  resolveAvailabilityStatus,
  resolveRegistrationStatus,
} from './driver-approval.policy';

describe('driver approval policy', () => {
  it('keeps new drivers pending unless local auto approval is enabled', () => {
    expect(resolveRegistrationStatus(false)).toBe(DriverStatusType.pending);
    expect(resolveRegistrationStatus(true)).toBe(DriverStatusType.approved);
  });

  it('auto-approves a pending driver on the first online request only when enabled', () => {
    expect(resolveAvailabilityStatus(DriverStatusType.pending, true, true))
      .toBe(DriverStatusType.approved);
    expect(resolveAvailabilityStatus(DriverStatusType.pending, true, false))
      .toBe(DriverStatusType.pending);
  });
});
