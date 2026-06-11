import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  addSearchHistory,
  clearSearchHistory,
  getSavedPlaces,
  getSearchHistory,
} from '../api/customers.js';
import { geocodePlaces, reverseGeocode } from '../api/maps.js';
import { estimateRide } from '../api/rides.js';
import InteractiveRouteMap from '../components/InteractiveRouteMap.jsx';
import PageShell from '../components/PageShell.jsx';
import Topbar from '../components/Topbar.jsx';
import { formatDistance, formatDuration } from '../utils/routePlanner.js';
import '../styles/app-pages.css';

function toPlace(result) {
  const metadata = result?.metadata ?? {};
  const latitude = Number(result?.lat ?? result?.latitude ?? metadata.latitude);
  const longitude = Number(result?.lon ?? result?.longitude ?? metadata.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const parts = String(result.display_name ?? result.address ?? metadata.address ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    id: result.place_id ?? result.savedPlaceId ?? `${latitude}:${longitude}`,
    name: result.label || result.name || metadata.name || result.searchText || parts[0] || 'Selected place',
    address: result.address || result.display_name || metadata.address || parts.slice(1).join(', '),
    position: [latitude, longitude],
  };
}

function getBrowserPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not available.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve([coords.latitude, coords.longitude]),
      () => reject(new Error('Unable to get your current location.')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  });
}

export default function LocationSearchPage() {
  const navigate = useNavigate();
  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(null);
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [recentPlaces, setRecentPlaces] = useState([]);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [routePath, setRoutePath] = useState([]);
  const [routeMetrics, setRouteMetrics] = useState(null);
  const [status, setStatus] = useState('');
  const [searching, setSearching] = useState(false);
  const [routing, setRouting] = useState(false);

  useEffect(() => {
    let ignored = false;
    Promise.allSettled([getSavedPlaces(), getSearchHistory(), getBrowserPosition()])
      .then(async ([placesResult, historyResult, positionResult]) => {
        if (ignored) return;
        if (placesResult.status === 'fulfilled') {
          setSavedPlaces(
            placesResult.value.map(toPlace).filter(Boolean),
          );
        }
        if (historyResult.status === 'fulfilled') {
          setRecentPlaces(historyResult.value.map(toPlace).filter(Boolean));
        }
        if (positionResult.status === 'fulfilled') {
          const position = positionResult.value;
          try {
            const reverse = await reverseGeocode(position[0], position[1]);
            if (!ignored) {
              setPickup({
                ...toPlace(reverse),
                id: 'current-location',
                name: 'Current location',
                position,
              });
            }
          } catch {
            if (!ignored) {
              setPickup({
                id: 'current-location',
                name: 'Current location',
                address: `${position[0].toFixed(5)}, ${position[1].toFixed(5)}`,
                position,
              });
            }
          }
        } else {
          setStatus(positionResult.reason?.message || 'Pickup location is unavailable.');
        }
      });
    return () => {
      ignored = true;
    };
  }, []);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setSuggestions([]);
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearching(true);
      geocodePlaces(text, { signal: controller.signal })
        .then((items) => {
          const next = items.map(toPlace).filter(Boolean);
          setSuggestions(next);
          setStatus(next.length ? '' : 'No matching places found.');
        })
        .catch((error) => {
          if (error.name !== 'AbortError') {
            setSuggestions([]);
            setStatus(error.message || 'Location search failed.');
          }
        })
        .finally(() => setSearching(false));
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  async function selectDestination(place) {
    setDestination(place);
    setQuery(place.name);
    setSuggestions([]);
    setStatus('');
    setRoutePath([]);
    setRouteMetrics(null);
    if (!pickup) {
      setStatus('Pickup location is unavailable.');
      return;
    }
    setRouting(true);
    try {
      const route = await estimateRide({
        startLat: pickup.position[0],
        startLng: pickup.position[1],
        endLat: place.position[0],
        endLng: place.position[1],
        vehicleType: '4',
      });
      setRoutePath(route.path);
      setRouteMetrics({
        distance: formatDistance(route.distanceMeters),
        duration: formatDuration(route.durationSeconds, route.distanceMeters),
        fare: `${new Intl.NumberFormat('vi-VN').format(route.fareVnd)} VND`,
        distanceMeters: route.distanceMeters,
        durationSeconds: route.durationSeconds,
      });
      addSearchHistory({
        searchText: query.trim() || place.name,
        name: place.name,
        address: place.address,
        latitude: place.position[0],
        longitude: place.position[1],
      }).then((savedHistory) => {
        const recent = toPlace(savedHistory);
        if (recent) {
          setRecentPlaces((items) => [
            recent,
            ...items.filter((item) => item.id !== recent.id),
          ].slice(0, 10));
        }
      }).catch(() => {});
    } catch (error) {
      setStatus(error.message || 'Unable to calculate this route.');
    } finally {
      setRouting(false);
    }
  }

  function continueBooking() {
    if (!pickup || !destination || !routePath.length || !routeMetrics) {
      setStatus('Select a destination and wait for the route calculation.');
      return;
    }
    sessionStorage.setItem('jpTaxiSelectedRoute', JSON.stringify({
      pickup,
      destination,
      routePath,
      routeMetrics,
    }));
    navigate('/bill-confirm');
  }

  return (
    <PageShell withFooter={false}>
      <main className="location-search-screen">
        <Topbar actions={<><Link to="/home">Home</Link><Link to="/user-info/profile">Account</Link></>} />
        <section className="location-search-layout">
          <div className="location-search-panel">
            <h1>Choose a destination</h1>
            <label>
              <span>Pickup</span>
              <input disabled value={pickup?.address || ''} placeholder="Getting current location..." />
            </label>
            <label>
              <span>Destination</span>
              <input
                autoComplete="off"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search address or place"
                value={query}
              />
            </label>

            {searching ? <p role="status">Searching...</p> : null}
            {suggestions.length ? (
              <div className="location-suggestions">
                {suggestions.map((place) => (
                  <button key={place.id} onClick={() => selectDestination(place)} type="button">
                    <strong>{place.name}</strong>
                    <small>{place.address}</small>
                  </button>
                ))}
              </div>
            ) : null}

            <section>
              <h2>Saved places</h2>
              {savedPlaces.length ? savedPlaces.map((place) => (
                <button className="saved-place-row" key={place.id} onClick={() => selectDestination(place)} type="button">
                  <strong>{place.name}</strong>
                  <small>{place.address}</small>
                </button>
              )) : <p className="empty-state">No saved places.</p>}
            </section>

            <section>
              <div className="document-upload-heading">
                <h2>Recent searches</h2>
                {recentPlaces.length ? (
                  <button
                    className="link-btn"
                    onClick={async () => {
                      await clearSearchHistory();
                      setRecentPlaces([]);
                    }}
                    type="button"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              {recentPlaces.length ? recentPlaces.map((place) => (
                <button className="saved-place-row" key={place.id} onClick={() => selectDestination(place)} type="button">
                  <strong>{place.name}</strong>
                  <small>{place.address}</small>
                </button>
              )) : <p className="empty-state">No recent searches.</p>}
            </section>

            {routeMetrics ? (
              <div className="route-summary">
                <strong>{routeMetrics.distance}</strong>
                <span>{routeMetrics.duration}</span>
                <span>{routeMetrics.fare}</span>
              </div>
            ) : null}
            {status ? <p className="payment-status-text" role="alert">{status}</p> : null}
            <button
              className="submit-button"
              disabled={routing || !routeMetrics}
              onClick={continueBooking}
              type="button"
            >
              {routing ? 'Calculating route...' : 'Continue'}
            </button>
          </div>
          <InteractiveRouteMap
            alternateRoutePath={[]}
            currentLocation={pickup?.position}
            route={[
              ...(pickup ? [{
                key: 'pickup',
                label: pickup.name,
                meta: pickup.address,
                position: pickup.position,
                type: 'pickup',
              }] : []),
              ...(destination ? [{
                key: 'destination',
                label: destination.name,
                meta: destination.address,
                position: destination.position,
                type: 'destination',
              }] : []),
            ]}
            routePath={routePath}
            showCurrentLocation={Boolean(pickup)}
            showDriver={false}
            showMarkers
            showRoute={Boolean(routePath.length)}
          />
        </section>
      </main>
    </PageShell>
  );
}
