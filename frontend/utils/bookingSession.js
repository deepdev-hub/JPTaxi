const DRAFT_KEY = 'jpTaxiBookingDraft';
const REQUEST_KEY = 'jpTaxiActiveRequestId';

export const DEFAULT_BOOKING_DRAFT = {
  pickupAddress: 'ホアンキエム湖',
  pickupLat: 21.028511,
  pickupLng: 105.852,
  dropoffAddress: 'ロッテホテル ハノイ',
  dropoffLat: 21.0258,
  dropoffLng: 105.8445,
  vehicleType: '4',
  actualPassengerName: null,
  actualPassengerPhone: null,
  noteToDriver: null,
};

export function getBookingDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) {
      return { ...DEFAULT_BOOKING_DRAFT };
    }
    return { ...DEFAULT_BOOKING_DRAFT, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_BOOKING_DRAFT };
  }
}

export function saveBookingDraft(partial) {
  const next = { ...getBookingDraft(), ...partial };
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
  return next;
}

export function getActiveRequestId() {
  const id = sessionStorage.getItem(REQUEST_KEY);
  return id ? Number(id) : null;
}

export function setActiveRequestId(requestId) {
  if (requestId == null) {
    sessionStorage.removeItem(REQUEST_KEY);
    return;
  }
  sessionStorage.setItem(REQUEST_KEY, String(requestId));
}

export function clearActiveRide() {
  sessionStorage.removeItem(REQUEST_KEY);
}
