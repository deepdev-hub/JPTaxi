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

export function getCurrentPosition(options = {}) {
  const timeoutMs = Number(options.timeoutMs ?? 12000);
  const settleMs = Number(options.settleMs ?? 1500);
  const targetAccuracyMeters = Number(options.targetAccuracyMeters ?? 200);

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not available.'));
      return;
    }

    let resolved = false;
    let watchId = null;
    let bestCoords = null;
    let settleTimer = null;
    let timeoutId = null;

    const cleanup = () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      if (settleTimer) window.clearTimeout(settleTimer);
      if (timeoutId) window.clearTimeout(timeoutId);
    };

    const finishWithBest = () => {
      if (resolved) return;
      if (!bestCoords) {
        resolved = true;
        cleanup();
        reject(new Error('Unable to get the current location.'));
        return;
      }
      resolved = true;
      cleanup();
      resolve({
        latitude: bestCoords.latitude,
        longitude: bestCoords.longitude,
        accuracy: bestCoords.accuracy,
      });
    };

    const scheduleFinish = () => {
      if (settleTimer) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(finishWithBest, settleMs);
    };

    watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const nextCoords = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: Number(coords.accuracy) || Number.POSITIVE_INFINITY,
        };

        if (!bestCoords || nextCoords.accuracy <= bestCoords.accuracy) {
          bestCoords = nextCoords;
        }

        if (bestCoords.accuracy <= targetAccuracyMeters) {
          finishWithBest();
          return;
        }

        scheduleFinish();
      },
      () => {
        if (!bestCoords) {
          resolved = true;
          cleanup();
          reject(new Error('Unable to get the current location.'));
        } else {
          finishWithBest();
        }
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0,
      },
    );

    timeoutId = window.setTimeout(finishWithBest, timeoutMs);
  });
}

export async function geocodePlace(address) {
  const queries = [
    address,
    `${address}, Hanoi, Vietnam`,
    `${address}, Vietnam`,
    `${address}, Japan`,
  ].map((item) => String(item ?? '').trim()).filter(Boolean);

  for (const query of queries) {
    const [result] = await geocodePlaces(query);
    const latitude = Number(result?.lat);
    const longitude = Number(result?.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      continue;
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
      address: displayParts.slice(0, 4).join(', ') || result.display_name || address,
      position: [latitude, longitude],
    };
  }

  throw new Error('Unable to locate this address on the map.');
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
