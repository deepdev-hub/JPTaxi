const ACTIVE_REQUEST_STATUSES = new Set(['pending', 'searching']);

function pathMatches(pathname, prefixes) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function buildStoredRoute(activeRide) {
  const trip = activeRide?.data;
  const request = trip?.rideRequest;
  if (!request) return null;

  const pickupPosition = [Number(request.pickupLat), Number(request.pickupLng)];
  const destinationPosition = [Number(request.dropoffLat), Number(request.dropoffLng)];
  if ([...pickupPosition, ...destinationPosition].some((coordinate) => !Number.isFinite(coordinate))) {
    return null;
  }

  const distanceKm = Number(trip.actualDistanceKm);
  const passenger = trip.passenger ?? {};

  return {
    pickup: {
      name: request.pickupAddress,
      position: pickupPosition,
    },
    destination: {
      name: request.dropoffAddress,
      address: request.dropoffAddress,
      position: destinationPosition,
    },
    routeMetrics: {
      duration: '--',
      distance: Number.isFinite(distanceKm) ? `${distanceKm.toFixed(1)} km` : '-- km',
      fare: trip.finalFareJpy ? `¥${trip.finalFareJpy.toLocaleString()}` : '',
    },
    routePath: [pickupPosition, destinationPosition],
    passenger: {
      customerId: passenger.customerId ?? request.customerId,
      name: passenger.name,
      phone: passenger.phone,
      avatarUrl: passenger.avatarUrl,
    },
  };
}

export function hasOutstandingPayment(activeRide) {
  return activeRide?.type === 'trip' && Boolean(activeRide.paymentRequested);
}

export function syncActiveRideSession(activeRide) {
  if (!activeRide?.data) return;

  if (activeRide.type === 'request') {
    if (activeRide.data.requestId) {
      sessionStorage.setItem('jpTaxiRideRequestId', String(activeRide.data.requestId));
    }
    sessionStorage.removeItem('jpTaxiTripId');
    return;
  }

  if (activeRide.type !== 'trip') return;

  const trip = activeRide.data;
  const requestId = trip.rideRequest?.requestId ?? trip.requestId;
  if (requestId) {
    sessionStorage.setItem('jpTaxiRideRequestId', String(requestId));
  }
  if (trip.tripId) {
    sessionStorage.setItem('jpTaxiTripId', String(trip.tripId));
  }

  if (!sessionStorage.getItem('jpTaxiSelectedRoute')) {
    const storedRoute = buildStoredRoute(activeRide);
    if (storedRoute) {
      sessionStorage.setItem('jpTaxiSelectedRoute', JSON.stringify(storedRoute));
    }
  }
}

export function getRideContinuationPath(role, activeRide) {
  if (role === 'customer') {
    if (activeRide?.type === 'request' && ACTIVE_REQUEST_STATUSES.has(activeRide.data?.status)) {
      return '/search-car';
    }
    if (activeRide?.type === 'trip') {
      return hasOutstandingPayment(activeRide) ? '/payment' : '/ride-status';
    }
  }

  if (role === 'driver' && activeRide?.type === 'trip') {
    return '/driver-ride-status';
  }

  return null;
}

export function getActiveRideRedirect(role, activeRide, pathname) {
  if (activeRide?.type !== 'trip') return null;

  if (role === 'customer') {
    const allowedPaths = ['/home', '/ride-status', '/messages', '/user-info'];
    if (hasOutstandingPayment(activeRide)) {
      allowedPaths.push('/payment');
    }
    return pathMatches(pathname, allowedPaths)
      ? null
      : (hasOutstandingPayment(activeRide) ? '/payment' : '/ride-status');
  }

  if (role === 'driver') {
    const allowedPaths = ['/driver-home', '/driver-ride-status', '/driver-invoice', '/messages', '/driver-info'];
    return pathMatches(pathname, allowedPaths) ? null : '/driver-ride-status';
  }

  return null;
}
