export const SAVED_PLACES_KEY = 'jpTaxiSavedPlaces';

export const defaultSavedPlaces = {
  work: {
    icon: '🕒',
    title: '職場',
    address: '123 Duong ABC',
  },
  home: {
    icon: '🏠',
    title: '自宅',
    address: '456 Duong XYZ',
  },
  favorite: {
    icon: '⭐',
    title: 'お気に',
    address: '',
  },
};

export function readSavedPlaces() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(SAVED_PLACES_KEY) || '{}');

    return Object.fromEntries(
      Object.entries(defaultSavedPlaces).map(([key, place]) => [
        key,
        {
          ...place,
          ...(stored[key] ?? {}),
          icon: place.icon,
          title: place.title,
        },
      ]),
    );
  } catch {
    return defaultSavedPlaces;
  }
}

export function writeSavedPlaces(places) {
  window.localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(places));
}
