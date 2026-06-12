import { DriverStatusType } from '../../entities/driver.entity';

export function resolveRegistrationStatus(
  autoApprove: boolean,
): DriverStatusType {
  return autoApprove ? DriverStatusType.approved : DriverStatusType.pending;
}

export function resolveAvailabilityStatus(
  currentStatus: DriverStatusType,
  wantsOnline: boolean,
  autoApprove: boolean,
): DriverStatusType {
  if (
    wantsOnline
    && autoApprove
    && currentStatus === DriverStatusType.pending
  ) {
    return DriverStatusType.approved;
  }
  return currentStatus;
}
