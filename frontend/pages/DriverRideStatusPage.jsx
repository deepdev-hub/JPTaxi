import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDriverProfile, resolveAssetUrl } from '../api/accounts.js';
import { fetchCustomerProfile } from '../api/customers.js';
import { cancelDriverRide, requestDriverPayment, updateDriverLocation } from '../api/rides.js';
import InteractiveRouteMap from '../components/InteractiveRouteMap.jsx';
import PageShell from '../components/PageShell.jsx';
import ProfileAvatarSlot from '../components/ProfileAvatarSlot.jsx';
import Topbar from '../components/Topbar.jsx';
import { DEFAULT_MAP_LOCATION, watchBrowserLocation } from '../utils/geolocation.js';
import { fetchDrivingRoute } from '../utils/routePlanner.js';
import { setLastInvoiceTripId } from '../utils/invoiceSession.js';
import '../styles/app-pages.css';

const fallbackRoute = {
  destination: {
    name: 'ロッテホテル ハノイ',
    address: '54 Liễu Giai, Ba Đình, Hà Nội',
    position: [21.03205, 105.81283],
  },
  pickup: {
    name: 'ホアンキエム湖',
    position: [21.02878, 105.85204],
  },
  routeMetrics: {
    duration: '12分',
    distance: '4.8 km',
  },
  routePath: [
    [21.02878, 105.85204],
    [21.02812, 105.85046],
    [21.02672, 105.84817],
    [21.02482, 105.85672],
    [21.02621, 105.84666],
    [21.02942, 105.83628],
    [21.03162, 105.82084],
    [21.03205, 105.81283],
  ],
  passenger: null,
};

function readSelectedRoute() {
  try {
    const rawRoute = window.sessionStorage.getItem('jpTaxiSelectedRoute');
    if (!rawRoute) return fallbackRoute;

    const parsedRoute = JSON.parse(rawRoute);
    const pickupPosition = parsedRoute.pickup?.position;
    const destinationPosition = parsedRoute.destination?.position;

    if (!Array.isArray(pickupPosition) || !Array.isArray(destinationPosition)) {
      return fallbackRoute;
    }

    return {
      ...fallbackRoute,
      ...parsedRoute,
      routePath: Array.isArray(parsedRoute.routePath) ? parsedRoute.routePath : fallbackRoute.routePath,
      routeMetrics: {
        ...fallbackRoute.routeMetrics,
        ...parsedRoute.routeMetrics,
      },
    };
  } catch {
    return fallbackRoute;
  }
}

export default function DriverRideStatusPage() {
  const navigate = useNavigate();
  const [selectedRoute] = useState(readSelectedRoute);
  const [driverLocation, setDriverLocation] = useState(null);
  const [driverRoutePath, setDriverRoutePath] = useState(selectedRoute.routePath);
  const [driverProfile, setDriverProfile] = useState(null);
  const [passengerProfile, setPassengerProfile] = useState(null);
  const [isCancellingRide, setIsCancellingRide] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const passenger = selectedRoute.passenger ?? {};
  const passengerName = passenger.name || 'お客様';
  const passengerPhone = passenger.phone || '連絡先を確認中';
  const passengerAvatar = resolveAssetUrl(passengerProfile?.avatarUrl ?? passenger.avatarUrl);
  const driverName = [driverProfile?.lastName, driverProfile?.firstName].filter(Boolean).join(' ')
    || driverProfile?.email
    || 'Driver';
  const driverAvatar = resolveAssetUrl(driverProfile?.avatarUrl);
  const customerPeerId = passenger.customerId ?? passenger.customer_id;
  const requestId = Number(sessionStorage.getItem('jpTaxiRideRequestId')) || null;
  const messageLink = Number.isFinite(Number(customerPeerId))
    ? `/messages/customer?peerId=${customerPeerId}${requestId ? `&requestId=${requestId}` : ''}`
    : '/messages/customer';
  const driverMapPosition = useMemo(
    () => (driverLocation ? [driverLocation.lat, driverLocation.lng] : selectedRoute.pickup.position),
    [driverLocation, selectedRoute.pickup.position],
  );
  const routePoints = [
    {
      key: 'pickup',
      label: selectedRoute.pickup.name,
      meta: '乗車地',
      time: '現在',
      position: selectedRoute.pickup.position,
      type: 'pickup',
    },
    {
      key: 'destination',
      label: selectedRoute.destination.name,
      meta: selectedRoute.destination.address,
      time: `約${selectedRoute.routeMetrics.duration}`,
      position: selectedRoute.destination.position,
      type: 'destination',
    },
  ];

  useEffect(() => watchBrowserLocation(
    (location) => {
      if (location.isFallback) return;
      const nextLocation = { lat: location.latitude, lng: location.longitude };
      setDriverLocation(nextLocation);
      updateDriverLocation(nextLocation).catch(() => {
        /* keep the live map usable when location syncing is temporarily unavailable */
      });
    },
    { fallback: DEFAULT_MAP_LOCATION, emitFallback: false },
  ), []);

  useEffect(() => {
    if (!driverLocation) {
      setDriverRoutePath(selectedRoute.routePath);
      return undefined;
    }

    const controller = new AbortController();
    const fallbackPath = [
      driverMapPosition,
      selectedRoute.pickup.position,
      ...selectedRoute.routePath.slice(1),
    ];

    Promise.all([
      fetchDrivingRoute(driverMapPosition, selectedRoute.pickup.position, { signal: controller.signal }),
      fetchDrivingRoute(selectedRoute.pickup.position, selectedRoute.destination.position, { signal: controller.signal }),
    ])
      .then(([pickupRoute, destinationRoute]) => setDriverRoutePath([
        ...pickupRoute.routePath,
        ...destinationRoute.routePath.slice(1),
      ]))
      .catch((error) => {
        if (error.name !== 'AbortError') setDriverRoutePath(fallbackPath);
      });

    return () => controller.abort();
  }, [driverLocation, driverMapPosition, selectedRoute.destination.position, selectedRoute.pickup.position, selectedRoute.routePath]);

  useEffect(() => {
    let ignored = false;
    getDriverProfile()
      .then((profile) => {
        if (!ignored) setDriverProfile(profile);
      })
      .catch(() => {
        if (!ignored) setDriverProfile(null);
      });
    return () => {
      ignored = true;
    };
  }, []);

  useEffect(() => {
    let ignored = false;
    const customerId = passenger.customerId ?? passenger.customer_id;
    if (!customerId || passenger.avatarUrl) return undefined;

    fetchCustomerProfile(customerId)
      .then((profile) => {
        if (!ignored) setPassengerProfile(profile);
      })
      .catch(() => {
        if (!ignored) setPassengerProfile(null);
      });
    return () => {
      ignored = true;
    };
  }, [passenger.avatarUrl, passenger.customerId, passenger.customer_id]);

  async function requestPayment() {
    const tripId = Number(sessionStorage.getItem('jpTaxiTripId'));
    if (!Number.isFinite(tripId) || tripId <= 0) {
      navigate('/xacnhancuocxe', { replace: true });
      return;
    }

    setLastInvoiceTripId(tripId);
    try {
      const result = await requestDriverPayment(tripId);
      localStorage.setItem('jpTaxiPaymentRequested', JSON.stringify({
        tripId,
        requestedAt: result?.requestedAt || Date.now(),
      }));
    } catch {
      localStorage.setItem('jpTaxiPaymentRequested', JSON.stringify({
        tripId,
        requestedAt: Date.now(),
      }));
    }
    navigate('/driver-invoice');
  }

  async function cancelRideByDriver() {
    if (isCancellingRide) return;

    const tripId = Number(sessionStorage.getItem('jpTaxiTripId'));
    if (!Number.isFinite(tripId) || tripId <= 0) {
      navigate('/xacnhancuocxe', { replace: true });
      return;
    }

    setIsCancellingRide(true);
    setCancelError('');

    try {
      await cancelDriverRide(tripId);
      sessionStorage.removeItem('jpTaxiRideRequestId');
      sessionStorage.removeItem('jpTaxiTripId');
      localStorage.removeItem('jpTaxiRideAccepted');
      localStorage.removeItem('jpTaxiPaymentRequested');
      navigate('/xacnhancuocxe', { replace: true });
    } catch (error) {
      setCancelError(error.message || '乗車をキャンセルできませんでした。');
      setIsCancellingRide(false);
    }
  }

  return (
    <PageShell>
      <main className="driver-tracking-screen">
        <Topbar
          brandTo="/driver-home"
          actions={(
            <>
              <Link to="/driver-home">ホーム</Link>
              <Link to="/messages/customer">メッセージ</Link>
              <Link to="/driver-info/basic">アカウント</Link>
              <ProfileAvatarSlot slot="topbar" className="driver-avatar-top" src={driverAvatar} fallbackText={driverName} />
            </>
          )}
        />

        <section className="driver-tracking-map">
          <InteractiveRouteMap
            alternateRoutePath={[]}
            className="tracking-route-map"
            compact
            currentLocation={driverMapPosition}
            driverLocation={driverLocation ? driverMapPosition : null}
            route={routePoints}
            routePath={driverRoutePath}
            routeSummary={`${selectedRoute.routeMetrics.distance} - ${selectedRoute.routeMetrics.duration}`}
            scrollWheelZoom
            showCurrentLocation={false}
            showDriver={Boolean(driverLocation)}
            showDetails={false}
          />

          <section className="driver-tracking-card">
            <div className="tracking-eta-header">
              <div>
                <span>到着予定時間</span>
                <strong>あと {selectedRoute.routeMetrics.duration}</strong>
              </div>
              <em>{selectedRoute.routeMetrics.distance}</em>
            </div>

            <div className="tracking-passenger-row">
                <ProfileAvatarSlot slot="tracking" src={passengerAvatar} fallbackText={passengerName} />
              <div>
                <strong>{passengerName} 様</strong>
                <small>{selectedRoute.pickup.name}で待機中</small>
                <em>{passengerPhone}</em>
              </div>
            </div>

            <div className="tracking-actions">
              <Link className="tracking-call" to={messageLink}>連絡する</Link>
              <button className="tracking-message" type="button" onClick={requestPayment}>請求書を発行</button>
              <button className="tracking-cancel-ride" type="button" onClick={cancelRideByDriver} disabled={isCancellingRide}>
                {isCancellingRide ? 'キャンセル中...' : '乗車をキャンセル'}
              </button>
            </div>
            {cancelError ? <p className="tracking-error-text">{cancelError}</p> : null}
          </section>
        </section>
      </main>
    </PageShell>
  );
}
