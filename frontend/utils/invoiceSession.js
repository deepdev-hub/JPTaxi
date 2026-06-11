const LAST_TRIP_KEY = 'jpTaxiLastInvoiceTripId';

export function setLastInvoiceTripId(tripId) {
  if (tripId == null) {
    sessionStorage.removeItem(LAST_TRIP_KEY);
    return;
  }
  sessionStorage.setItem(LAST_TRIP_KEY, String(tripId));
}

export function getLastInvoiceTripId() {
  const raw = sessionStorage.getItem(LAST_TRIP_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}
