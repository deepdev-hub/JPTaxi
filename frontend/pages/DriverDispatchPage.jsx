import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { acceptDriverRide, getPendingDriverRide, rejectDriverRide, updateDriverLocation } from '../api/rides.js';
import InteractiveRouteMap from '../components/InteractiveRouteMap.jsx';
import PageShell from '../components/PageShell.jsx';
import Topbar from '../components/Topbar.jsx';
import { calculateFareBreakdown, formatYen } from '../utils/fare.js';
import { DEFAULT_MAP_LOCATION, watchBrowserLocation } from '../utils/geolocation.js';
import { fetchDrivingRoute, formatDistance as formatRouteDistance, formatDuration } from '../utils/routePlanner.js';
import '../styles/app-pages.css';

function formatPickupDistance(value) {
  const distance = Number(value);
  if (!Number.isFinite(distance)) return '2km以内';
  return `${distance.toFixed(1)} km`;
}

const defaultDriverLocation = {
  lat: DEFAULT_MAP_LOCATION.latitude,
  lng: DEFAULT_MAP_LOCATION.longitude,
};

function buildSelectedRoute(request, routePreview) {
  return {
    destination: {
      name: request.dropoffAddress,
      address: request.dropoffAddress,
      position: [request.dropoffLat, request.dropoffLng],
    },
    pickup: {
      name: request.pickupAddress,
      position: [request.pickupLat, request.pickupLng],
    },
    routeMetrics: {
      duration: routePreview?.duration ?? '計算中',
      distance: routePreview?.distance ?? formatPickupDistance(request.distanceKm),
      fare: formatYen(calculateFareBreakdown(request.distanceKm).totalJpy),
    },
    routePath: routePreview?.routePath ?? [
      [request.pickupLat, request.pickupLng],
      [request.dropoffLat, request.dropoffLng],
    ],
    passenger: {
      customerId: request.customerId,
      name: request.actualPassengerName || request.customer?.name || `KH-${request.customerId}`,
      phone: request.actualPassengerPhone || request.customer?.phone || '',
      avatarUrl: request.customer?.avatarUrl || request.customer?.avatar_url || null,
    },
  };
}

export default function DriverDispatchPage() {
  const navigate = useNavigate();
  const [pendingRide, setPendingRide] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [routePreview, setRoutePreview] = useState(null);
  const [message, setMessage] = useState('半径2km以内の配車リクエストを検索しています...');
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadPendingRide() {
      try {
        const result = await getPendingDriverRide();
        if (ignore) return;
        setPendingRide(result?.request ?? null);
        setMessage(result?.request ? '' : (result?.message || '半径2km以内の配車リクエストを検索しています...'));
      } catch (error) {
        if (!ignore) {
          setPendingRide(null);
          setMessage(error.message || '条件に合う配車リクエストはまだありません。');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    const stopWatching = watchBrowserLocation(
      (location) => {
        if (ignore || location.isFallback) return;
        const nextLocation = { lat: location.latitude, lng: location.longitude };
        setDriverLocation(nextLocation);
        updateDriverLocation(nextLocation).catch(() => {
          /* keep the map usable when location syncing is temporarily unavailable */
        });
      },
      { fallback: DEFAULT_MAP_LOCATION, emitFallback: false },
    );

    loadPendingRide();
    const timer = window.setInterval(loadPendingRide, 2500);
    return () => {
      ignore = true;
      stopWatching();
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!pendingRide) {
      setRoutePreview(null);
      return undefined;
    }

    const controller = new AbortController();
    fetchDrivingRoute(
      [pendingRide.pickupLat, pendingRide.pickupLng],
      [pendingRide.dropoffLat, pendingRide.dropoffLng],
      { signal: controller.signal },
    )
      .then((route) => setRoutePreview({
        routePath: route.routePath,
        distance: formatRouteDistance(route.distance),
        duration: formatDuration(route.duration, route.distance),
      }))
      .catch((error) => {
        if (error.name !== 'AbortError') setRoutePreview(null);
      });

    return () => controller.abort();
  }, [pendingRide]);

  const passengerName = useMemo(() => {
    if (!pendingRide) return '';
    return pendingRide.actualPassengerName || pendingRide.customer?.name || `KH-${pendingRide.customerId}`;
  }, [pendingRide]);
  const passengerPhone = pendingRide?.actualPassengerPhone || pendingRide?.customer?.phone || '';
  const routePoints = pendingRide ? [
    ...(driverLocation ? [{
      key: 'driver',
      label: 'ドライバー位置',
      meta: '現在',
      position: [driverLocation.lat, driverLocation.lng],
      type: 'driver',
    }] : []),
    {
      key: 'pickup',
      label: pendingRide.pickupAddress,
      meta: '乗車地',
      position: [pendingRide.pickupLat, pendingRide.pickupLng],
      type: 'pickup',
    },
    {
      key: 'destination',
      label: pendingRide.dropoffAddress,
      meta: '目的地',
      position: [pendingRide.dropoffLat, pendingRide.dropoffLng],
      type: 'destination',
    },
  ] : [];
  const mapCenter = pendingRide
    ? [pendingRide.pickupLat, pendingRide.pickupLng]
    : [driverLocation?.lat ?? defaultDriverLocation.lat, driverLocation?.lng ?? defaultDriverLocation.lng];
  const routePath = pendingRide
    ? routePreview?.routePath ?? [
        [pendingRide.pickupLat, pendingRide.pickupLng],
        [pendingRide.dropoffLat, pendingRide.dropoffLng],
      ]
    : [];

  async function handleAccept() {
    if (!pendingRide || isAccepting) return;
    setIsAccepting(true);
    try {
      const result = await acceptDriverRide(pendingRide.requestId);
      sessionStorage.setItem('jpTaxiRideRequestId', String(pendingRide.requestId));
      if (result?.tripId) {
        sessionStorage.setItem('jpTaxiTripId', String(result.tripId));
      }
      sessionStorage.setItem('jpTaxiSelectedRoute', JSON.stringify(buildSelectedRoute(pendingRide, routePreview)));
      localStorage.setItem('jpTaxiRideAccepted', JSON.stringify({
        requestId: pendingRide.requestId,
        tripId: result?.tripId,
        acceptedAt: Date.now(),
      }));
      navigate('/driver-ride-status');
    } catch (error) {
      setMessage(error.message || 'この配車リクエストを承認できませんでした。');
      setPendingRide(null);
      setIsAccepting(false);
    }
  }

  async function refreshPendingRide() {
    try {
      const result = await getPendingDriverRide();
      setPendingRide(result?.request ?? null);
      setMessage(result?.request ? '' : (result?.message || '半径2km以内の配車リクエストを検索しています...'));
    } catch (error) {
      setPendingRide(null);
      setMessage(error.message || '条件に合う配車リクエストはまだありません。');
    }
  }

  async function handleReject() {
    if (!pendingRide || isRejecting) return;
    setIsRejecting(true);
    try {
      await rejectDriverRide(pendingRide.requestId);
      setPendingRide(null);
      setMessage('別の配車リクエストを検索しています...');
      await refreshPendingRide();
    } catch (error) {
      setMessage(error.message || 'この配車リクエストをスキップできませんでした。');
    } finally {
      setIsRejecting(false);
    }
  }

  return (
    <PageShell>
      <main className="driver-dispatch-screen driver-dispatch-reference">
        <Topbar
          brandTo="/driver-home"
          actions={(
            <>
              <Link to="/driver-home">ホーム</Link>
              <Link to="/messages/customer">通知</Link>
              <img className="topbar-avatar driver-avatar-top" src="https://i.pravatar.cc/150?u=driver_tanaka" alt="" />
            </>
          )}
        />

        <section className="driver-dispatch-main">
          <div className="driver-dispatch-left">
            <h1>配車リクエスト確認</h1>
            <p>半径2km以内で実際に予約中のお客様だけを表示します。</p>

            <div className="dispatch-driver-box">
              <img src="https://i.pravatar.cc/150?u=driver_tanaka" alt="" />
              <div>
                <strong>ドライバーはオンラインです</strong>
                <span>受付範囲: 2 km</span>
              </div>
            </div>

            {pendingRide ? (
              <>
                <section className="dispatch-card">
                  <div className="dispatch-countdown">2km</div>
                  <span>お迎え地点まで</span>
                  <strong>{formatPickupDistance(pendingRide.distanceKm)}</strong>
                  <div className="dispatch-actions">
                    <button className="dispatch-decline" type="button" onClick={handleReject} disabled={isRejecting || isAccepting}>
                      {isRejecting ? '検索中...' : 'スキップ'}
                    </button>
                    <button className="dispatch-accept" type="button" onClick={handleAccept} disabled={isAccepting || isRejecting}>
                      {isAccepting ? '承認中...' : '承認する'}
                    </button>
                  </div>
                </section>

                <section className="dispatch-customer-card">
                  <p>お客様情報</p>
                  <div>
                    <span>
                      <strong>{passengerName}</strong>
                      <em>{passengerPhone || '電話番号未登録'}</em>
                    </span>
                  </div>
                </section>
              </>
            ) : (
              <section className="dispatch-empty-card">
                <div className="spinner" aria-hidden="true"></div>
                <h2>{isLoading ? '読み込み中...' : '配車リクエストを検索中'}</h2>
                <p>{message}</p>
              </section>
            )}
          </div>

          <div className="driver-dispatch-map">
            <InteractiveRouteMap
              alternateRoutePath={[]}
              className="dispatch-route-map"
              currentLocation={driverLocation ? [driverLocation.lat, driverLocation.lng] : mapCenter}
              fitToRoute={Boolean(pendingRide)}
              interactive
              mapCenter={mapCenter}
              mapZoom={15}
              route={routePoints}
              routePath={routePath}
              routeSummary={pendingRide ? `${routePreview?.distance ?? formatPickupDistance(pendingRide.distanceKm)} - ${routePreview?.duration ?? '計算中'}` : null}
              scrollWheelZoom
              showControls
              showCurrentLocation={Boolean(driverLocation)}
              showDetails={false}
              showDriver={false}
              showMarkers={Boolean(pendingRide)}
              showRoute={Boolean(pendingRide)}
            />
            {pendingRide ? (
              <>
                <span className="dispatch-map-label pickup">{pendingRide.pickupAddress}</span>
                <span className="dispatch-map-label drop">{pendingRide.dropoffAddress}</span>
                <section className="dispatch-floating-details">
                  <div className="dispatch-passenger-row">
                    <span>KH</span>
                    <div>
                      <strong>お客様: {passengerName}</strong>
                      <small>{passengerPhone || '連絡先を確認中'}</small>
                    </div>
                  </div>
                  <div className="dispatch-stats">
                    <article><span>お迎え</span><strong>{formatPickupDistance(pendingRide.distanceKm)}</strong></article>
                    <article><span>範囲</span><strong>2 km</strong></article>
                    <article><span>状態</span><strong>新規</strong></article>
                  </div>
                </section>
              </>
            ) : (
              <section className="dispatch-floating-details dispatch-waiting-details">
                <div className="dispatch-passenger-row">
                  <span>...</span>
                  <div>
                    <strong>近くのお客様を検索しています</strong>
                    <small>予約リクエストがない場合、サンプルデータは表示しません。</small>
                  </div>
                </div>
              </section>
            )}
          </div>
        </section>
      </main>
    </PageShell>
  );
}
