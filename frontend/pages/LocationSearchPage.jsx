import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  addSearchHistory,
  clearSearchHistory,
  getSavedPlaces,
  getSearchHistory,
} from '../api/customers.js';
import { getCustomerProfile, resolveAssetUrl } from '../api/accounts.js';
import { geocodePlaces, reverseGeocode } from '../api/maps.js';
import { estimateRide } from '../api/rides.js';
import InteractiveRouteMap from '../components/InteractiveRouteMap.jsx';
import PageShell from '../components/PageShell.jsx';
import ProfileAvatarSlot from '../components/ProfileAvatarSlot.jsx';
import Topbar from '../components/Topbar.jsx';
import { normalizePlace } from '../utils/place.js';
import { formatDistance, formatDuration } from '../utils/routePlanner.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import '../styles/app-pages.css';

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
  const location = useLocation();
  const { formatNumber, locale, t } = useI18n();
  const autoFillDestination = location.state?.autoFillDestination;
  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(() => {
    if (autoFillDestination?.position) {
      return {
        id: 'autofill-dest',
        name: autoFillDestination.name,
        address: autoFillDestination.address,
        position: autoFillDestination.position,
      };
    }
    return null;
  });
  const [profile, setProfile] = useState(null);
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [recentPlaces, setRecentPlaces] = useState([]);
  const [pickupQuery, setPickupQuery] = useState('');
  const [query, setQuery] = useState(autoFillDestination?.name || autoFillDestination?.address || '');
  const [activeSearchTarget, setActiveSearchTarget] = useState('destination');
  const [suggestions, setSuggestions] = useState([]);
  const [routePath, setRoutePath] = useState([]);
  const [routeMetrics, setRouteMetrics] = useState(null);
  const [status, setStatus] = useState('');
  const [searching, setSearching] = useState(false);
  const [routing, setRouting] = useState(false);
  const skipNextSearchRef = useRef(false);

  useEffect(() => {
    let ignored = false;
    Promise.allSettled([
      getSavedPlaces(),
      getSearchHistory(),
      getBrowserPosition(),
      getCustomerProfile(),
      (!autoFillDestination?.position && autoFillDestination) ? geocodePlaces(autoFillDestination.address) : Promise.resolve(null),
    ])
      .then(async ([placesResult, historyResult, positionResult, profileResult, autofillResult]) => {
        if (ignored) return;
        if (placesResult.status === 'fulfilled') {
          setSavedPlaces(
            placesResult.value.map(normalizePlace).filter(Boolean),
          );
        }
        if (historyResult.status === 'fulfilled') {
          setRecentPlaces(historyResult.value.map(normalizePlace).filter(Boolean));
        }
        if (profileResult.status === 'fulfilled') {
          setProfile(profileResult.value);
        }
        if (autofillResult.status === 'fulfilled' && autofillResult.value?.length > 0) {
          const matchedPlace = normalizePlace(autofillResult.value[0]);
          if (matchedPlace) {
            const finalPlace = {
              ...matchedPlace,
              name: autoFillDestination.name,
              address: matchedPlace.address || autoFillDestination.address,
            };
            skipNextSearchRef.current = true;
            setDestination(finalPlace);
            setQuery(finalPlace.address || finalPlace.name);
          }
        }
        if (positionResult.status === 'fulfilled') {
          const position = positionResult.value;
          try {
            const reverse = await reverseGeocode(position[0], position[1]);
            if (!ignored) {
              const currentPlace = {
                ...normalizePlace(reverse),
                id: 'current-location',
                name: t('location.currentName'),
                position,
              };
              setPickup(currentPlace);
              setPickupQuery(currentPlace.address || currentPlace.name);
            }
          } catch {
            if (!ignored) {
              const currentPlace = {
                id: 'current-location',
                name: t('location.currentName'),
                address: `${position[0].toFixed(5)}, ${position[1].toFixed(5)}`,
                position,
              };
              setPickup(currentPlace);
              setPickupQuery(currentPlace.address);
            }
          }
        } else {
          setStatus(t('location.positionUnavailable'));
        }
      });
    return () => {
      ignored = true;
    };
  }, [autoFillDestination?.address, autoFillDestination?.name, t]);

  useEffect(() => {
    const text = (activeSearchTarget === 'pickup' ? pickupQuery : query).trim();
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      setSuggestions([]);
      return undefined;
    }
    if (text.length < 2) {
      setSuggestions([]);
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearching(true);
      geocodePlaces(text, { signal: controller.signal })
        .then((items) => {
          const next = items.map(normalizePlace).filter(Boolean);
          setSuggestions(next);
          setStatus(next.length ? '' : t('location.noMatch'));
        })
        .catch((error) => {
          if (error.name !== 'AbortError') {
            setSuggestions([]);
            setStatus(t('location.searchFailed'));
          }
        })
        .finally(() => setSearching(false));
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [activeSearchTarget, pickupQuery, query, t]);

  async function selectPlace(place, target = activeSearchTarget) {
    const nextPickup = target === 'pickup' ? place : pickup;
    const nextDestination = target === 'destination' ? place : destination;

    skipNextSearchRef.current = true;
    if (target === 'pickup') {
      setPickup(place);
      setPickupQuery(place.address || place.name);
    } else {
      setDestination(place);
      setQuery(place.name);
    }
    setSuggestions([]);
    setStatus('');
    setRoutePath([]);
    setRouteMetrics(null);
    if (!nextPickup || !nextDestination) {
      return;
    }
    setRouting(true);
    try {
      const route = await estimateRide({
        startLat: nextPickup.position[0],
        startLng: nextPickup.position[1],
        endLat: nextDestination.position[0],
        endLng: nextDestination.position[1],
        vehicleType: '4',
      });
      setRoutePath(route.path);
      setRouteMetrics({
        distance: formatDistance(route.distanceMeters),
        duration: formatDuration(route.durationSeconds, route.distanceMeters, locale),
        fare: `${formatNumber(route.fareVnd)} VND`,
        distanceMeters: route.distanceMeters,
        durationSeconds: route.durationSeconds,
      });
      if (target === 'destination') {
        addSearchHistory({
          searchText: query.trim() || place.name,
          name: place.name,
          address: place.address,
          latitude: place.position[0],
          longitude: place.position[1],
        }).then((savedHistory) => {
          const recent = normalizePlace(savedHistory);
          if (recent) {
            setRecentPlaces((items) => [
              recent,
              ...items.filter((item) => item.id !== recent.id),
            ].slice(0, 10));
          }
        }).catch(() => {});
      }
    } catch (error) {
      setStatus(t('location.routeFailed'));
    } finally {
      setRouting(false);
    }
  }

  async function useCurrentLocation() {
    setStatus('');
    try {
      const position = await getBrowserPosition();
      let currentPlace;
      try {
        const reverse = await reverseGeocode(position[0], position[1]);
        currentPlace = {
          ...normalizePlace(reverse),
          id: 'current-location',
          name: t('location.currentName'),
          position,
        };
      } catch {
        currentPlace = {
          id: 'current-location',
          name: t('location.currentName'),
          address: `${position[0].toFixed(5)}, ${position[1].toFixed(5)}`,
          position,
        };
      }
      await selectPlace(currentPlace, 'pickup');
    } catch (error) {
      setStatus(t('location.positionUnavailable'));
    }
  }

  function continueBooking() {
    if (!pickup || !destination || !routePath.length || !routeMetrics) {
      setStatus(t('location.selectRouteFirst'));
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

  const listPlaces = suggestions.length
    ? suggestions.map((place) => ({ ...place, sourceLabel: t('location.candidate') }))
    : [
        ...savedPlaces.map((place) => ({ ...place, sourceLabel: t('location.saved') })),
        ...recentPlaces
          .filter((place) => !savedPlaces.some((saved) => saved.id === place.id))
          .map((place) => ({ ...place, sourceLabel: t('location.history') })),
      ];
  const profileName = [profile?.lastName, profile?.firstName].filter(Boolean).join(' ')
    || profile?.email
    || '';

  return (
    <PageShell>
      <main className="location-search-screen">
        <Topbar
          actions={(
            <>
              <Link to="/home">{t('common.home')}</Link>
              <Link to="/user-info/profile">{t('common.account')}</Link>
              <Link to="/user-info/profile" className="topbar-avatar-link" aria-label={t('common.account')}>
                <img className="topbar-avatar" src={resolveAssetUrl(profile?.avatarUrl)} alt="" />
              </Link>
            </>
          )}
        />
        <section className="zip-location-main">
          <section className="zip-location-left">
            <h1>{t('location.title')}</h1>
            <p>{t('location.subtitle')}</p>

            <label className="zip-search-box">
              <span>{t('location.destination')}</span>
              <input
                autoComplete="off"
                onChange={(event) => {
                  setActiveSearchTarget('destination');
                  setQuery(event.target.value);
                }}
                onFocus={() => setActiveSearchTarget('destination')}
                placeholder={t('location.destinationPlaceholder')}
                value={query}
              />
            </label>

            <label className="zip-search-box pickup-search-box">
              <span>{t('location.pickup')}</span>
              <input
                autoComplete="off"
                onChange={(event) => {
                  setActiveSearchTarget('pickup');
                  setPickupQuery(event.target.value);
                }}
                onFocus={() => setActiveSearchTarget('pickup')}
                placeholder={t('location.pickupPlaceholder')}
                value={pickupQuery}
              />
              <button
                className="zip-current-location-button"
                onClick={(event) => {
                  event.preventDefault();
                  useCurrentLocation();
                }}
                type="button"
              >
                {t('map.currentLocation')}
              </button>
            </label>

            <section className="zip-route-card">
              <div className="zip-route-points" aria-hidden="true">
                <span className="route-start" />
                <span className="route-line" />
                <span className="route-end" />
              </div>
              <div className="zip-route-fields">
                <div><span>{t('location.pickup')}</span><strong>{pickup?.name || t('location.selectPickup')}</strong></div>
                <div><span>{t('location.destination')}</span><strong>{destination?.name || t('location.selectDestination')}</strong></div>
              </div>
            </section>

            <section className="zip-location-results">
              <div className="document-upload-heading">
                <h2>{suggestions.length ? t('location.results') : t('location.savedRecent')}</h2>
                {!suggestions.length && recentPlaces.length ? (
                  <button
                    className="link-btn"
                    onClick={async () => {
                      await clearSearchHistory();
                      setRecentPlaces([]);
                    }}
                    type="button"
                  >
                    {t('location.clearHistory')}
                  </button>
                ) : null}
              </div>
              <div className="zip-history-list">
                {searching ? <div className="zip-search-state" role="status">{t('location.searching')}</div> : null}
                {!searching && listPlaces.map((place) => (
                  <button
                    className="zip-history-item"
                    key={`${place.sourceLabel}-${place.id}`}
                    onClick={() => selectPlace(place)}
                    type="button"
                  >
                    <span className="zip-history-icon">{place.sourceLabel}</span>
                    <span className="zip-history-text">
                      <strong>{place.name}</strong>
                      <small>{place.address}</small>
                    </span>
                    <span className="zip-history-time">{t('common.select')}</span>
                  </button>
                ))}
                {!searching && !listPlaces.length ? (
                  <p className="empty-state">{t('location.empty')}</p>
                ) : null}
              </div>
            </section>

            {routeMetrics ? (
              <div className="route-summary" role="status" aria-live="polite">
                <span className="route-summary-label">{t('location.routeReady')}</span>
                <strong>{routeMetrics.distance}</strong>
                <span>{routeMetrics.duration}</span>
                <span>{routeMetrics.fare}</span>
              </div>
            ) : null}
            {status ? <p className="payment-status-text" role="alert">{status}</p> : null}

            <div className="zip-location-actions">
              <Link className="flow-back-link" to="/home">{t('common.back')}</Link>
              <button
                className={`zip-continue-button ${routing || !routeMetrics ? 'disabled' : ''}`}
                disabled={routing || !routeMetrics}
                onClick={continueBooking}
                type="button"
              >
                {routing ? t('location.routeCalculating') : t('location.continue')}
              </button>
            </div>
          </section>

          <aside className={`zip-location-map ${routing ? 'is-refreshing' : ''}`}>
            <InteractiveRouteMap
              alternateRoutePath={[]}
              className="location-search-route-map"
              currentLocation={pickup?.position}
              fitToRoute={Boolean(destination)}
              interactive
              mapCenter={pickup?.position}
              mapZoom={15}
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
              routeSummary={routeMetrics ? `${routeMetrics.distance} - ${routeMetrics.duration}` : ''}
              scrollWheelZoom
              showControls
              showCurrentLocation={Boolean(pickup)}
              showDetails={Boolean(routeMetrics)}
              showDriver={false}
              showMarkers={Boolean(destination)}
              showRoute={Boolean(routePath.length)}
            />
            <div className="zip-map-card">
              <div><span>{t('location.pickup')}</span><b>{pickup?.name || '--'}</b></div>
              <div><span>{t('location.destination')}</span><b>{destination?.name || '--'}</b></div>
              <strong>{t('location.routeInfo')}</strong>
              <div><span>{t('location.estimatedTime')}</span><b>{routeMetrics?.duration || '--'}</b></div>
              <div><span>{t('location.distance')}</span><b>{routeMetrics?.distance || '--'}</b></div>
              <div><span>{t('location.estimatedFare')}</span><b>{routeMetrics?.fare || '--'}</b></div>
            </div>
            <div className="zip-map-refresh-indicator" aria-hidden={!routing}>
              <span />
              <b>{t('location.updating')}</b>
            </div>
          </aside>
        </section>
      </main>
    </PageShell>
  );
}
