export type DriverInsuranceStatus =
  | 'missing'
  | 'active'
  | 'expiring'
  | 'expired';

export function getDriverInsuranceStatus(
  endDate: string | null | undefined,
  now = new Date(),
): DriverInsuranceStatus {
  if (!endDate) return 'missing';
  const end = new Date(`${endDate}T23:59:59.999Z`);
  if (end.getTime() < now.getTime()) return 'expired';
  const daysRemaining = Math.ceil(
    (end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
  );
  return daysRemaining <= 30 ? 'expiring' : 'active';
}
