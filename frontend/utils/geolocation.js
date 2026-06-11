export const DEFAULT_MAP_LOCATION = {
  latitude: 21.02878,
  longitude: 105.85204,
};

const DEFAULT_GEO_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 5000,
  timeout: 10000,
};

function normalizeLocation(location = DEFAULT_MAP_LOCATION, isFallback = false) {
  const latitude = Number(location.latitude ?? location.lat);
  const longitude = Number(location.longitude ?? location.lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { ...DEFAULT_MAP_LOCATION, isFallback: true };
  }

  return { latitude, longitude, isFallback };
}

export function getCurrentBrowserLocation({ fallback = DEFAULT_MAP_LOCATION, options = {} } = {}) {
  const fallbackLocation = normalizeLocation(fallback, true);

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(fallbackLocation);
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(normalizeLocation(position.coords)),
      () => resolve(fallbackLocation),
      { ...DEFAULT_GEO_OPTIONS, ...options },
    );
  });
}

export function watchBrowserLocation(
  onLocation,
  { fallback = DEFAULT_MAP_LOCATION, emitFallback = true, options = {} } = {},
) {
  const fallbackLocation = normalizeLocation(fallback, true);
  let stopped = false;

  function emit(location) {
    if (!stopped) onLocation(location);
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    if (emitFallback) emit(fallbackLocation);
    return () => {
      stopped = true;
    };
  }

  const geoOptions = { ...DEFAULT_GEO_OPTIONS, ...options };
  const handleSuccess = (position) => emit(normalizeLocation(position.coords));
  const handleError = () => {
    if (emitFallback) emit(fallbackLocation);
  };
  const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, geoOptions);

  navigator.geolocation.getCurrentPosition(handleSuccess, handleError, geoOptions);

  return () => {
    stopped = true;
    navigator.geolocation.clearWatch(watchId);
  };
}
