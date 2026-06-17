function toNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function buildBillConfirmQuery(route) {
  if (
    !Array.isArray(route?.pickup?.position) ||
    !Array.isArray(route?.destination?.position)
  ) {
    return '';
  }

  const params = new URLSearchParams({
    pickupName: toText(route.pickup.name),
    pickupAddress: toText(route.pickup.address),
    pickupLat: String(route.pickup.position[0]),
    pickupLng: String(route.pickup.position[1]),
    destinationName: toText(route.destination.name),
    destinationAddress: toText(route.destination.address),
    destinationLat: String(route.destination.position[0]),
    destinationLng: String(route.destination.position[1]),
  });

  return params.toString();
}

export function readBillConfirmRoute(searchParams) {
  const pickupLat = toNumber(searchParams.get('pickupLat'));
  const pickupLng = toNumber(searchParams.get('pickupLng'));
  const destinationLat = toNumber(searchParams.get('destinationLat'));
  const destinationLng = toNumber(searchParams.get('destinationLng'));

  if (
    pickupLat == null ||
    pickupLng == null ||
    destinationLat == null ||
    destinationLng == null
  ) {
    return null;
  }

  return {
    pickup: {
      name: toText(searchParams.get('pickupName')),
      address: toText(searchParams.get('pickupAddress')),
      position: [pickupLat, pickupLng],
    },
    destination: {
      name: toText(searchParams.get('destinationName')),
      address: toText(searchParams.get('destinationAddress')),
      position: [destinationLat, destinationLng],
    },
  };
}
