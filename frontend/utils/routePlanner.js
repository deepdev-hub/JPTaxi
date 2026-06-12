import { geocodePlaces, getDrivingRoute } from '../api/maps.js';

export function formatDuration(seconds, meters = 0, locale = 'en-US') {
  const baseMinutes = Math.max(1, Math.round(seconds / 60));
  const distanceKm = Math.max(0, meters / 1000);
  const trafficBufferMinutes = Math.max(3, Math.round(distanceKm * 1.2));
  const unit = locale.startsWith('ja')
    ? '分'
    : locale.startsWith('vi')
      ? ' phút'
      : ' min';
  return `${baseMinutes + trafficBufferMinutes}${unit}`;
}

export function formatDistance(meters) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export async function fetchDrivingRoute(fromPosition, toPosition, options = {}) {
  const route = await getDrivingRoute(fromPosition, toPosition, options);
  if (
    !Array.isArray(route.path) ||
    !route.path.length ||
    !Number.isFinite(route.distanceMeters) ||
    !Number.isFinite(route.durationSeconds)
  ) {
    throw new Error('Routing provider returned no route.');
  }
  return {
    routePath: route.path,
    distance: route.distanceMeters,
    duration: route.durationSeconds,
  };
}

export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not available.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({
        latitude: coords.latitude,
        longitude: coords.longitude,
      }),
      () => reject(new Error('Unable to get the current location.')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}

export async function geocodePlace(address) {
  const [result] = await geocodePlaces(address);
  const latitude = Number(result?.lat);
  const longitude = Number(result?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Place not found.');
  }
  const displayParts = String(result.display_name ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const namedetails = result.namedetails ?? {};
  return {
    name:
      namedetails['name:ja'] ||
      namedetails['official_name:ja'] ||
      result.name ||
      displayParts[0] ||
      address,
    address: displayParts.slice(1, 4).join(', ') || result.display_name || address,
    position: [latitude, longitude],
  };
}

export async function buildSelectedRoute(
  destination,
  pickup,
  { locale = 'en-US', pickupName = 'Current location' } = {},
) {
  if (!pickup) throw new Error('Pickup location is required.');
  const route = await fetchDrivingRoute(
    [pickup.latitude, pickup.longitude],
    destination.position,
  );
  return {
    destination,
    pickup: {
      id: 'current-location',
      name: pickupName,
      position: [pickup.latitude, pickup.longitude],
    },
    routePath: route.routePath,
    routeMetrics: {
      distance: formatDistance(route.distance),
      duration: formatDuration(route.duration, route.distance, locale),
      fare: null,
    },
  };
}
