const addressKeys = [
  'amenity',
  'house_number',
  'road',
  'neighbourhood',
  'suburb',
  'city',
  'town',
  'village',
  'state',
  'postcode',
  'country',
];

function addressToString(value) {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';
  return [...new Set(
    addressKeys
      .map((key) => value[key])
      .filter((part) => typeof part === 'string' && part.trim())
      .map((part) => part.trim()),
  )].join(', ');
}

export function normalizePlace(result) {
  const metadata =
    result?.metadata && typeof result.metadata === 'object'
      ? result.metadata
      : {};
  const latitude = Number(result?.lat ?? result?.latitude ?? metadata.latitude);
  const longitude = Number(result?.lon ?? result?.longitude ?? metadata.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const displayName = addressToString(result?.display_name);
  const directAddress = addressToString(result?.address);
  const metadataAddress = addressToString(metadata.address);
  const address = displayName || directAddress || metadataAddress;
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
  const structuredName =
    result?.address && typeof result.address === 'object'
      ? result.address.amenity
        || result.address.building
        || result.address.house_name
        || result.address.road
      : '';

  return {
    id: result?.placeId
      ?? result?.place_id
      ?? result?.savedPlaceId
      ?? `${latitude}:${longitude}`,
    name: result?.label
      || result?.name
      || metadata.name
      || result?.searchText
      || structuredName
      || parts[0]
      || 'Selected place',
    address,
    position: [latitude, longitude],
  };
}
