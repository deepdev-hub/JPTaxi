import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import InteractiveRouteMap from '../components/InteractiveRouteMap.jsx';
import PageShell from '../components/PageShell.jsx';
import Topbar from '../components/Topbar.jsx';
import { calculateFareBreakdown, formatYen } from '../utils/fare.js';
import { DEFAULT_MAP_LOCATION, getCurrentBrowserLocation, watchBrowserLocation } from '../utils/geolocation.js';
import '../styles/app-pages.css';

const defaultUserLocation = DEFAULT_MAP_LOCATION;

const defaultPickupPlace = {
  icon: '出発',
  id: 'current-location',
  name: '現在位置',
  address: 'ハノイ・ホアンキエム周辺',
  position: [defaultUserLocation.latitude, defaultUserLocation.longitude],
};

const savedPlaces = [
  { icon: '履歴', name: 'ロッテホテル ハノイ', address: '54 Lieu Giai, Ba Dinh, Hanoi', time: '昨日', position: [21.03205, 105.81283] },
  { icon: '履歴', name: 'チャンティエンプラザ', address: '24 Hai Ba Trung, Hoan Kiem, Hanoi', time: '2日前', position: [21.02482, 105.85672] },
  { icon: '履歴', name: '日本レストラン 山田', address: 'Dong Da, Hanoi', time: '先週', position: [21.01878, 105.82914] },
  { icon: '保存', name: 'ノイバイ国際空港', address: 'Phu Minh, Soc Son, Hanoi', time: '保存済み', position: [21.21871, 105.80417] },
];

function toPlace(result) {
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const displayParts = String(result.display_name ?? '').split(',').map((part) => part.trim()).filter(Boolean);
  const namedetails = result.namedetails ?? {};
  const japaneseName = namedetails['name:ja'] || namedetails['official_name:ja'] || namedetails['alt_name:ja'];
  const primaryName = japaneseName || result.name || displayParts[0] || '選択地点';

  return {
    icon: '候補',
    id: `${result.osm_type}-${result.osm_id}`,
    name: primaryName,
    address: displayParts.slice(1, 4).join(', ') || result.display_name || '住所情報なし',
    position: [latitude, longitude],
  };
}

function cleanPlacePart(value) {
  return String(value ?? '').trim();
}

function isUsefulPlaceName(value) {
  const text = cleanPlacePart(value);
  return text.length > 1 && !/^[\d\s.,/-]+$/.test(text);
}

function compactPlaceParts(parts) {
  const seen = new Set();
  return parts
    .map(cleanPlacePart)
    .filter(Boolean)
    .filter((part) => {
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function bestCurrentLocationName(place) {
  const candidates = [
    place?.name,
    ...String(place?.address ?? '').split(','),
  ];
  return candidates.find(isUsefulPlaceName) || defaultPickupPlace.name;
}

function toCurrentLocationPlace(result, position) {
  const address = result?.address ?? {};
  const displayParts = String(result?.display_name ?? '').split(',').map((part) => part.trim()).filter(Boolean);
  const namedetails = result?.namedetails ?? {};
  const primaryName = [
    namedetails['name:ja'],
    namedetails['official_name:ja'],
    namedetails['alt_name:ja'],
    address.amenity,
    address.tourism,
    address.building,
    address.road,
    address.neighbourhood,
    address.quarter,
    address.suburb,
    address.city_district,
    result?.name,
    displayParts.find(isUsefulPlaceName),
  ].find(isUsefulPlaceName) || defaultPickupPlace.name;
  const addressText = compactPlaceParts([
    address.road,
    address.neighbourhood,
    address.quarter,
    address.suburb,
    address.city_district,
    address.city || address.town,
  ].filter((part) => cleanPlacePart(part).toLowerCase() !== primaryName.toLowerCase())).join(', ');

  return {
    ...defaultPickupPlace,
    name: primaryName,
    address: addressText || result?.display_name || defaultPickupPlace.address,
    position,
  };
}

function formatDuration(seconds, meters = 0) {
  const baseMinutes = Math.max(1, Math.round(seconds / 60));
  const distanceKm = Math.max(0, meters / 1000);
  const trafficBufferMinutes = Math.max(3, Math.round(distanceKm * 1.2));

  return `${baseMinutes + trafficBufferMinutes}分`;
}

function formatDistance(meters) {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }

  return `${Math.round(meters)} m`;
}

function estimateFare(meters) {
  return formatYen(calculateFareBreakdown(meters / 1000).totalJpy);
}

function hasPosition(position) {
  return Array.isArray(position)
    && position.length >= 2
    && Number.isFinite(Number(position[0]))
    && Number.isFinite(Number(position[1]));
}

function normalizePlace(place, fallback = defaultPickupPlace) {
  if (!place || !hasPosition(place.position)) {
    return fallback;
  }

  const normalized = {
    ...fallback,
    ...place,
    position: place.position.map(Number),
  };

  if (normalized.id === defaultPickupPlace.id) {
    return {
      ...normalized,
      name: bestCurrentLocationName(normalized),
    };
  }

  return normalized;
}

function distanceMeters(from, to) {
  const [fromLat, fromLng] = from;
  const [toLat, toLng] = to;
  const distanceKm = Math.sqrt(
    Math.pow(toLat - fromLat, 2) + Math.pow(toLng - fromLng, 2),
  ) * 111;
  return Math.max(0, distanceKm * 1000);
}

function buildFallbackRouteMetrics(from, to) {
  const meters = distanceMeters(from, to);
  return {
    distance: formatDistance(meters),
    duration: formatDuration((meters / 30000) * 3600, meters),
    fare: estimateFare(meters),
  };
}

function buildFallbackRouteState(pickup, destination) {
  const path = [pickup.position, destination.position];
  return {
    path,
    metrics: buildFallbackRouteMetrics(pickup.position, destination.position),
  };
}

function hasRouteMetrics(metrics) {
  return Boolean(metrics?.distance && metrics?.duration && metrics?.fare);
}

function readSelectedRoute() {
  try {
    const rawRoute = window.sessionStorage.getItem('jpTaxiSelectedRoute');
    if (!rawRoute) return null;

    const parsedRoute = JSON.parse(rawRoute);
    if (!hasPosition(parsedRoute?.pickup?.position) || !hasPosition(parsedRoute?.destination?.position)) {
      return null;
    }

    const pickup = normalizePlace(parsedRoute.pickup);
    const destination = normalizePlace(parsedRoute.destination, {
      icon: '候補',
      name: '目的地',
      address: '',
      position: parsedRoute.destination.position,
    });
    const fallbackRoute = buildFallbackRouteState(pickup, destination);

    return {
      destination,
      pickup,
      routePath: Array.isArray(parsedRoute.routePath) && parsedRoute.routePath.length
        ? parsedRoute.routePath
        : fallbackRoute.path,
      routeMetrics: hasRouteMetrics(parsedRoute.routeMetrics)
        ? parsedRoute.routeMetrics
        : fallbackRoute.metrics,
    };
  } catch {
    return null;
  }
}

function saveSelectedRoute({ destination, pickup, path, metrics }) {
  if (!destination || !pickup || !metrics) return;
  window.sessionStorage.setItem('jpTaxiSelectedRoute', JSON.stringify({
    destination,
    pickup,
    routePath: path?.length ? path : [pickup.position, destination.position],
    routeMetrics: metrics,
  }));
}

function buildRouteKey(pickup, destination) {
  if (!pickup || !destination || !hasPosition(pickup.position) || !hasPosition(destination.position)) {
    return '';
  }

  return [
    pickup.position.map((value) => Number(value).toFixed(6)).join(','),
    destination.position.map((value) => Number(value).toFixed(6)).join(','),
  ].join('|');
}

export default function LocationSearchPage() {
  const navigate = useNavigate();
  const [initialRoute] = useState(readSelectedRoute);
  const [selectedPickup, setSelectedPickup] = useState(() => normalizePlace(initialRoute?.pickup));
  const [selectedDestination, setSelectedDestination] = useState(initialRoute?.destination ?? null);
  const [selfLocation, setSelfLocation] = useState(defaultPickupPlace.position);
  const [pickupQuery, setPickupQuery] = useState(() => normalizePlace(initialRoute?.pickup).name);
  const [destinationQuery, setDestinationQuery] = useState(initialRoute?.destination?.name ?? '');
  const [activeSearchTarget, setActiveSearchTarget] = useState('destination');
  const [suggestions, setSuggestions] = useState([]);
  const [routePath, setRoutePath] = useState(initialRoute?.routePath ?? []);
  const [routeMetrics, setRouteMetrics] = useState(initialRoute?.routeMetrics ?? null);
  const [routeKey, setRouteKey] = useState(() => buildRouteKey(initialRoute?.pickup, initialRoute?.destination));
  const [isSearching, setIsSearching] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [isRouteRefreshing, setIsRouteRefreshing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [searchError, setSearchError] = useState('');
  const routeRefreshTimer = useRef(null);
  const routeRequestId = useRef(0);

  async function resolveCurrentPickupName(position) {
    const [latitude, longitude] = position;
    const params = new URLSearchParams({
      'accept-language': 'ja,vi;q=0.8,en;q=0.6',
      format: 'json',
      lat: String(latitude),
      lon: String(longitude),
      namedetails: '1',
    });

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
        cache: 'no-store',
      });
      if (!response.ok) return null;

      return toCurrentLocationPlace(await response.json(), position);
    } catch {
      return null;
    }
  }

  async function resolveCurrentPickup() {
    const location = await getCurrentBrowserLocation({
      fallback: defaultUserLocation,
      options: { maximumAge: 0 },
    });
    if (location.isFallback) return defaultPickupPlace;

    const gpsPosition = [location.latitude, location.longitude];
    const place = await resolveCurrentPickupName(gpsPosition);
    return {
      ...defaultPickupPlace,
      ...(place ?? {}),
      id: defaultPickupPlace.id,
      address: place?.address || 'GPSで取得した現在位置',
      position: gpsPosition,
    };
  }

  function updateRoutePreview(nextPickup, nextDestination) {
    window.clearTimeout(routeRefreshTimer.current);
    setIsRouteRefreshing(true);
    routeRefreshTimer.current = window.setTimeout(() => setIsRouteRefreshing(false), 420);

    if (!nextDestination) {
      setRoutePath([]);
      setRouteMetrics(null);
      setRouteKey('');
      window.sessionStorage.removeItem('jpTaxiSelectedRoute');
      return;
    }

    const fallbackRoute = buildFallbackRouteState(nextPickup, nextDestination);
    setRouteKey(buildRouteKey(nextPickup, nextDestination));
    setRoutePath(fallbackRoute.path);
    setRouteMetrics(fallbackRoute.metrics);
    saveSelectedRoute({
      destination: nextDestination,
      pickup: nextPickup,
      path: fallbackRoute.path,
      metrics: fallbackRoute.metrics,
    });
  }

  useEffect(() => () => window.clearTimeout(routeRefreshTimer.current), []);

  useEffect(() => {
    let cancelled = false;

    resolveCurrentPickup().then((pickup) => {
      if (cancelled) return;
      setSelfLocation(pickup.position);
      if (!initialRoute?.pickup) {
        setSelectedPickup(pickup);
        setPickupQuery(pickup.name);
      }
    });

    const stopWatching = watchBrowserLocation(
      (location) => {
        if (cancelled) return;
        const position = [location.latitude, location.longitude];
        setSelfLocation(position);
        setSelectedPickup((current) => (
          current.id === defaultPickupPlace.id
            ? normalizePlace({ ...current, position, address: current.address || 'GPSで取得した現在位置' })
            : current
        ));
      },
      { fallback: defaultUserLocation, emitFallback: false },
    );

    return () => {
      cancelled = true;
      stopWatching();
    };
  }, [initialRoute?.pickup]);

  useEffect(() => {
    const text = (activeSearchTarget === 'pickup' ? pickupQuery : destinationQuery).trim();
    const currentSelection = activeSearchTarget === 'pickup' ? selectedPickup : selectedDestination;

    if (text.length < 2 || currentSelection?.name === text) {
      setSuggestions([]);
      setSearchError('');
      setIsSearching(false);
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setIsSearching(true);
      setSearchError('');

      const params = new URLSearchParams({
        'accept-language': 'ja,vi;q=0.8,en;q=0.6',
        format: 'json',
        limit: '6',
        addressdetails: '1',
        namedetails: '1',
        q: text,
      });

      fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) throw new Error('search failed');
          return response.json();
        })
        .then((items) => {
          const nextSuggestions = items.map(toPlace).filter(Boolean);
          setSuggestions(nextSuggestions);
          setSearchError(nextSuggestions.length ? '' : '該当する地点が見つかりませんでした。');
        })
        .catch((error) => {
          if (error.name === 'AbortError') return;
          const fallback = savedPlaces.filter((place) => {
            const haystack = `${place.name} ${place.address}`.toLowerCase();
            return haystack.includes(text.toLowerCase());
          });
          setSuggestions(fallback);
          setSearchError(fallback.length ? '' : '検索に失敗しました。もう一度入力してください。');
        })
        .finally(() => setIsSearching(false));
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [activeSearchTarget, destinationQuery, pickupQuery, selectedDestination, selectedPickup]);

  useEffect(() => {
    if (!selectedDestination) {
      routeRequestId.current += 1;
      setRoutePath([]);
      setRouteMetrics(null);
      setRouteKey('');
      window.sessionStorage.removeItem('jpTaxiSelectedRoute');
      return undefined;
    }

    const controller = new AbortController();
    const requestId = routeRequestId.current + 1;
    routeRequestId.current = requestId;
    const requestRouteKey = buildRouteKey(selectedPickup, selectedDestination);
    const [pickupLat, pickupLng] = selectedPickup.position;
    const [destinationLat, destinationLng] = selectedDestination.position;
    const url = [
      'https://router.project-osrm.org/route/v1/driving',
      `${pickupLng},${pickupLat};${destinationLng},${destinationLat}`,
    ].join('/');
    const params = new URLSearchParams({
      overview: 'full',
      geometries: 'geojson',
      steps: 'true',
    });
    const fallbackRoute = buildFallbackRouteState(selectedPickup, selectedDestination);

    setRoutePath(fallbackRoute.path);
    setRouteMetrics(fallbackRoute.metrics);
    setRouteKey(requestRouteKey);
    saveSelectedRoute({
      destination: selectedDestination,
      pickup: selectedPickup,
      path: fallbackRoute.path,
      metrics: fallbackRoute.metrics,
    });
    setIsRouting(true);
    const requestRoute = (attempt = 0) => fetch(`${url}?${params.toString()}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error('route failed');
        return response.json();
      })
      .then((data) => {
        if (requestId !== routeRequestId.current) return;

        const route = data?.routes?.[0];
        const coordinates = route?.geometry?.coordinates ?? [];
        const nextPath = coordinates.map(([lng, lat]) => [lat, lng]);
        const distance = Number(route?.distance);
        const duration = Number(route?.duration);
        const hasValidRoute = nextPath.length
          && Number.isFinite(distance)
          && distance > 0
          && Number.isFinite(duration)
          && duration > 0;
        const nextMetrics = hasValidRoute
          ? {
              distance: formatDistance(distance),
              duration: formatDuration(duration, distance),
              fare: estimateFare(distance),
            }
          : fallbackRoute.metrics;
        const finalPath = hasValidRoute ? nextPath : fallbackRoute.path;

        setRoutePath(finalPath);
        setRouteMetrics(nextMetrics);
        setRouteKey(requestRouteKey);
        saveSelectedRoute({
          destination: selectedDestination,
          pickup: selectedPickup,
          path: finalPath,
          metrics: nextMetrics,
        });
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        if (requestId !== routeRequestId.current) return;
        if (attempt < 1) {
          return new Promise((resolve) => {
            window.setTimeout(resolve, 240);
          }).then(() => requestRoute(attempt + 1));
        }

        setRoutePath(fallbackRoute.path);
        setRouteMetrics(fallbackRoute.metrics);
        setRouteKey(requestRouteKey);
        saveSelectedRoute({
          destination: selectedDestination,
          pickup: selectedPickup,
          path: fallbackRoute.path,
          metrics: fallbackRoute.metrics,
        });
      })
      .finally(() => {
        if (requestId === routeRequestId.current) setIsRouting(false);
      });

    requestRoute();

    return () => controller.abort();
  }, [selectedDestination, selectedPickup]);

  const fallbackRouteState = useMemo(() => (
    selectedDestination ? buildFallbackRouteState(selectedPickup, selectedDestination) : null
  ), [selectedDestination, selectedPickup]);
  const currentRouteKey = buildRouteKey(selectedPickup, selectedDestination);
  const hasCurrentRouteResult = Boolean(currentRouteKey && routeKey === currentRouteKey);
  const displayedRoutePath = hasCurrentRouteResult && routePath.length ? routePath : (fallbackRouteState?.path ?? []);
  const displayedRouteMetrics = hasCurrentRouteResult && routeMetrics ? routeMetrics : fallbackRouteState?.metrics ?? null;
  const mapCenter = selectedDestination
    ? selectedPickup.position
    : selectedPickup.position;

  const routePoints = useMemo(() => {
    if (!selectedDestination) {
      return [];
    }

    return [
      {
        key: 'pickup',
        label: selectedPickup.name,
        meta: '出発地',
        time: '現在',
        position: selectedPickup.position,
        type: 'pickup',
      },
      {
        key: 'destination',
        label: selectedDestination.name,
        meta: selectedDestination.address,
        time: displayedRouteMetrics?.duration ? `約${displayedRouteMetrics.duration}` : '',
        position: selectedDestination.position,
        type: 'destination',
      },
    ];
  }, [displayedRouteMetrics?.duration, selectedDestination, selectedPickup]);

  const activeQuery = activeSearchTarget === 'pickup' ? pickupQuery : destinationQuery;
  const activeSelection = activeSearchTarget === 'pickup' ? selectedPickup : selectedDestination;
  const shouldShowSuggestions = activeQuery.trim().length >= 2 && activeSelection?.name !== activeQuery.trim();
  const visiblePlaces = shouldShowSuggestions ? suggestions : savedPlaces;
  const placesWithCurrentLocation = activeSearchTarget === 'pickup'
    ? [
        {
          ...defaultPickupPlace,
          name: selectedPickup.id === defaultPickupPlace.id ? bestCurrentLocationName(selectedPickup) : defaultPickupPlace.name,
          address: selectedPickup.id === defaultPickupPlace.id ? selectedPickup.address : 'GPSで現在位置を取得',
          position: selectedPickup.id === defaultPickupPlace.id ? selectedPickup.position : selfLocation,
          time: '現在地',
          useCurrentLocation: true,
        },
        ...visiblePlaces,
      ]
    : visiblePlaces;
  const routeDurationLabel = displayedRouteMetrics?.duration ?? (isRouting ? '計算中' : '--');
  const routeDistanceLabel = displayedRouteMetrics?.distance ?? (isRouting ? '計算中' : '--');
  const routeFareLabel = displayedRouteMetrics?.fare ?? (isRouting ? '計算中' : '--');

  async function handleUseCurrentLocation() {
    setIsLocating(true);
    setActiveSearchTarget('pickup');

    try {
      const pickup = await resolveCurrentPickup();
      setSelectedPickup(pickup);
      setPickupQuery(pickup.name);
      setSuggestions([]);
      setSearchError('');
      updateRoutePreview(pickup, selectedDestination);
    } finally {
      setIsLocating(false);
    }
  }

  function handleSelectPlace(place) {
    if (place.useCurrentLocation) {
      handleUseCurrentLocation();
      return;
    }

    const nextPickup = activeSearchTarget === 'pickup' ? normalizePlace(place) : selectedPickup;
    const nextDestination = activeSearchTarget === 'destination' ? normalizePlace(place, place) : selectedDestination;

    if (activeSearchTarget === 'pickup') {
      setSelectedPickup(nextPickup);
      setPickupQuery(nextPickup.name);
    } else {
      setSelectedDestination(nextDestination);
      setDestinationQuery(nextDestination.name);
    }

    setSuggestions([]);
    updateRoutePreview(nextPickup, nextDestination);
  }

  function continueToBillConfirm(event) {
    event.preventDefault();
    if (!selectedDestination || !displayedRouteMetrics) return;
    saveSelectedRoute({
      destination: selectedDestination,
      pickup: selectedPickup,
      path: displayedRoutePath,
      metrics: displayedRouteMetrics,
    });
    navigate('/bill-confirm');
  }

  return (
    <PageShell>
      <main className="location-window">
        <Topbar actions={<><Link to="/home">ホーム</Link><Link to="/user-info">アカウント</Link><img className="topbar-avatar" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80" alt="" /></>} />

        <section className="zip-location-main">
          <section className="zip-location-left">
            <h1>目的地を検索</h1>
            <p>目的地を入力するか、履歴から選択してください。必要に応じて乗車地も変更できます。</p>

            <label className="zip-search-box">
              <span>目的地</span>
              <input
                autoComplete="off"
                onChange={(event) => {
                  setActiveSearchTarget('destination');
                  setDestinationQuery(event.target.value);
                }}
                onFocus={() => setActiveSearchTarget('destination')}
                placeholder="目的地・住所を入力"
                type="text"
                value={destinationQuery}
              />
            </label>

            <label className="zip-search-box pickup-search-box">
              <span>乗車地</span>
              <input
                autoComplete="off"
                onChange={(event) => {
                  setActiveSearchTarget('pickup');
                  setPickupQuery(event.target.value);
                }}
                onFocus={() => setActiveSearchTarget('pickup')}
                placeholder="迎えに来てほしい場所"
                type="text"
                value={pickupQuery}
              />
              <button
                className="zip-current-location-button"
                disabled={isLocating}
                onClick={(event) => {
                  event.preventDefault();
                  handleUseCurrentLocation();
                }}
                type="button"
              >
                {isLocating ? '取得中...' : '現在位置'}
              </button>
            </label>

            <section className="zip-route-card">
              <div className="zip-route-points">
                <span className="route-start"></span>
                <span className="route-line"></span>
                <span className="route-end"></span>
              </div>
              <div className="zip-route-fields">
                <div><span>乗車地</span><strong>{selectedPickup.name}</strong></div>
                <div><span>目的地</span><strong>{selectedDestination?.name ?? '目的地を選択してください'}</strong></div>
              </div>
            </section>

            <div className="zip-location-results">
              <h2>{shouldShowSuggestions ? '検索結果' : '最近の履歴'}</h2>
              <div className="zip-history-list" onWheel={(event) => event.stopPropagation()}>
                {isSearching ? <div className="zip-search-state">検索しています...</div> : null}
                {!isSearching && searchError ? <div className="zip-search-state">{searchError}</div> : null}
                {!isSearching && placesWithCurrentLocation.map((item) => (
                  <button className="zip-history-item" key={item.id ?? item.name} onClick={() => handleSelectPlace(item)} type="button">
                    <span className="zip-history-icon">{item.icon}</span>
                    <span className="zip-history-text"><strong>{item.name}</strong><small>{item.address}</small></span>
                    <span className="zip-history-time">{item.time ?? '選択'}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="zip-location-actions">
              <Link className="flow-back-link" to="/home">戻る</Link>
              <Link
                className={`zip-continue-button ${selectedDestination ? '' : 'disabled'}`}
                to={selectedDestination ? '/bill-confirm' : '#'}
                onClick={continueToBillConfirm}
              >
                このルートで続ける
              </Link>
            </div>
          </section>

          <aside className={`zip-location-map ${isRouteRefreshing ? 'is-refreshing' : ''}`}>
            <InteractiveRouteMap
              alternateRoutePath={[]}
              className="location-search-route-map"
              currentLocation={selfLocation}
              fitToRoute={Boolean(selectedDestination)}
              interactive
              mapCenter={mapCenter}
              mapZoom={15}
              route={routePoints}
              routePath={displayedRoutePath}
              routeSummary={displayedRouteMetrics ? `${displayedRouteMetrics.distance} - ${displayedRouteMetrics.duration}` : null}
              scrollWheelZoom
              showControls
              showCurrentLocation
              currentLocationLabel={selectedPickup.name || defaultPickupPlace.name}
              showDetails={false}
              showDriver={false}
              showMarkers={Boolean(selectedDestination)}
              showRoute={Boolean(selectedDestination)}
            />
            <div className="zip-map-card">
              <div><span>乗車地</span><b>{selectedPickup.name}</b></div>
              <div><span>目的地</span><b>{selectedDestination?.name ?? '--'}</b></div>
              <strong>ルート情報</strong>
              <div><span>予想所要時間</span><b>{routeDurationLabel}</b></div>
              <div><span>距離</span><b>{routeDistanceLabel}</b></div>
              <div><span>概算料金</span><b>{routeFareLabel}</b></div>
            </div>
            <div className="zip-map-refresh-indicator" aria-hidden={!isRouteRefreshing}>
              <span></span>
              <b>ルート更新中</b>
            </div>
          </aside>
        </section>
      </main>
    </PageShell>
  );
}
