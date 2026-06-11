export function formatDuration(seconds, meters = 0) {
  const baseMinutes = Math.max(1, Math.round(seconds / 60));
  const distanceKm = Math.max(0, meters / 1000);
  const trafficBufferMinutes = Math.max(3, Math.round(distanceKm * 1.2));
  return `${baseMinutes + trafficBufferMinutes}分`;
}

export function formatDistance(meters) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export async function fetchDrivingRoute(fromPosition, toPosition, options = {}) {
  const [fromLat, fromLng] = fromPosition.map(Number);
  const [toLat, toLng] = toPosition.map(Number);

  if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) {
    throw new Error('invalid route coordinates');
  }

  const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}`;
  const params = new URLSearchParams({
    overview: 'full',
    geometries: 'geojson',
    steps: 'true',
  });
  const response = await fetch(`${url}?${params.toString()}`, {
    cache: 'no-store',
    signal: options.signal,
  });

  if (!response.ok) throw new Error('route failed');

  const data = await response.json();
  const route = data?.routes?.[0];
  const routePath = (route?.geometry?.coordinates ?? []).map(([lng, lat]) => [lat, lng]);
  const distance = Number(route?.distance);
  const duration = Number(route?.duration);

  if (!routePath.length || !Number.isFinite(distance) || !Number.isFinite(duration)) {
    throw new Error('route failed');
  }

  return { routePath, distance, duration };
}

export function getCurrentPosition() {
  return getCurrentBrowserLocation({ fallback: DEFAULT_MAP_LOCATION });
}

export async function geocodePlace(address) {
  const params = new URLSearchParams({
    'accept-language': 'ja,vi;q=0.8,en;q=0.6',
    format: 'json',
    limit: '1',
    addressdetails: '1',
    namedetails: '1',
    q: address,
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
  if (!response.ok) throw new Error('geocode failed');

  const [result] = await response.json();
  const latitude = Number(result?.lat);
  const longitude = Number(result?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('place not found');

  const displayParts = String(result.display_name ?? '').split(',').map((part) => part.trim()).filter(Boolean);
  const namedetails = result.namedetails ?? {};
  const japaneseName = namedetails['name:ja'] || namedetails['official_name:ja'] || namedetails['alt_name:ja'];

  return {
    name: japaneseName || result.name || displayParts[0] || address,
    address: displayParts.slice(1, 4).join(', ') || result.display_name || address,
    position: [latitude, longitude],
  };
}

export async function buildSelectedRoute(destination, pickup = DEFAULT_MAP_LOCATION) {
  const route = await fetchDrivingRoute(
    [pickup.latitude, pickup.longitude],
    destination.position,
  );

  return {
    destination,
    pickup: {
      id: 'current-location',
      name: '現在位置',
      position: [pickup.latitude, pickup.longitude],
    },
    routePath: route.routePath,
    routeMetrics: {
      distance: formatDistance(route.distance),
      duration: formatDuration(route.duration, route.distance),
      fare: formatYen(calculateFareBreakdown(route.distance / 1000).totalJpy),
    },
  };
}
import { calculateFareBreakdown, formatYen } from './fare.js';
import { DEFAULT_MAP_LOCATION, getCurrentBrowserLocation } from './geolocation.js';
