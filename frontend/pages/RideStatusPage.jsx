import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCustomerProfile, resolveAssetUrl } from '../api/accounts.js';
import { getActiveRide } from '../api/rides.js';
import InteractiveRouteMap from '../components/InteractiveRouteMap.jsx';
import PageShell from '../components/PageShell.jsx';
import ProfileAvatarSlot from '../components/ProfileAvatarSlot.jsx';
import Topbar from '../components/Topbar.jsx';
import { watchBrowserLocation } from '../utils/geolocation.js';
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

function normalizeDriverLocation(driver) {
  const latitude = Number(driver?.location?.latitude ?? driver?.latitude);
  const longitude = Number(driver?.location?.longitude ?? driver?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? [latitude, longitude] : null;
}

export default function RideStatusPage() {
  const navigate = useNavigate();
  const [selectedRoute] = useState(readSelectedRoute);
  const [assignedRide, setAssignedRide] = useState(null);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const driver = assignedRide?.driver ?? {};
  const vehicle = assignedRide?.vehicle ?? {};
  const driverName = driver.name || 'ドライバー確認中';
  const driverAvatar = resolveAssetUrl(driver.avatarUrl) || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80';
  const driverLocation = normalizeDriverLocation(driver);
  const userMapPosition = userLocation ?? selectedRoute.pickup.position;
  const customerName = [customerProfile?.lastName, customerProfile?.firstName].filter(Boolean).join(' ')
    || customerProfile?.email
    || 'Customer';
  const customerAvatar = resolveAssetUrl(customerProfile?.avatarUrl);
  const vehicleLabel = [vehicle.brand, vehicle.color].filter(Boolean).join(' / ') || '車両情報を確認中';
  const vehiclePlate = vehicle.licensePlate || 'ナンバー確認中';
  const driverPeerId = driver.driverId ?? driver.driver_id;
  const requestId = assignedRide?.requestId ?? assignedRide?.request_id;
  const messageLink = Number.isFinite(Number(driverPeerId))
    ? `/messages/driver?peerId=${driverPeerId}${Number.isFinite(Number(requestId)) ? `&requestId=${requestId}` : ''}`
    : '/messages/driver';
  const routePoints = [
    {
      key: 'pickup',
      label: selectedRoute.pickup.name,
      meta: '出発地',
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

  useEffect(() => {
    let stopped = false;
    const currentTripId = Number(sessionStorage.getItem('jpTaxiTripId')) || null;

    function shouldOpenPayment(payload) {
      if (!payload) return false;
      const payloadTripId = Number(payload.tripId);
      const isSameTrip = !currentTripId || !payloadTripId || payloadTripId === currentTripId;
      return isSameTrip;
    }

    function goToPayment(event) {
      if (event && event.key !== 'jpTaxiPaymentRequested') return;
      try {
        const payload = JSON.parse(localStorage.getItem('jpTaxiPaymentRequested') || 'null');
        if (shouldOpenPayment(payload)) {
          navigate('/payment', { replace: true });
        }
      } catch {
        /* ignore malformed local state */
      }
    }

    const paymentRequested = localStorage.getItem('jpTaxiPaymentRequested');
    if (paymentRequested) {
      try {
        const parsed = JSON.parse(paymentRequested);
        if (shouldOpenPayment(parsed)) {
          navigate('/payment', { replace: true });
        }
      } catch {
        /* ignore stale value */
      }
    }

    async function pollPaymentRequest() {
      try {
        const activeRide = await getActiveRide();
        if (stopped) return;

        if (activeRide?.type === 'request') {
          const requestId = activeRide.data?.requestId;
          if (requestId) {
            sessionStorage.setItem('jpTaxiRideRequestId', String(requestId));
          }
          sessionStorage.removeItem('jpTaxiTripId');
          localStorage.removeItem('jpTaxiRideAccepted');
          localStorage.removeItem('jpTaxiPaymentRequested');
          sessionStorage.setItem('jpTaxiDriverCancelledNotice', '1');
          navigate('/search-car', { replace: true });
          return;
        }

        if (activeRide?.type === 'trip') {
          const tripId = activeRide.data?.tripId;
          if (tripId) {
            sessionStorage.setItem('jpTaxiTripId', String(tripId));
          }
          setAssignedRide(activeRide.data);
        }

        if (activeRide?.type === 'trip' && activeRide.paymentRequested) {
          navigate('/payment', { replace: true });
        }
      } catch {
        /* keep the localStorage listener as fallback */
      }
    }

    pollPaymentRequest();
    const pollId = window.setInterval(pollPaymentRequest, 2500);
    window.addEventListener('storage', goToPayment);
    return () => {
      stopped = true;
      window.clearInterval(pollId);
      window.removeEventListener('storage', goToPayment);
    };
  }, [navigate]);

  useEffect(() => watchBrowserLocation(
    (location) => setUserLocation([location.latitude, location.longitude]),
    {
      fallback: {
        latitude: selectedRoute.pickup.position[0],
        longitude: selectedRoute.pickup.position[1],
      },
      emitFallback: false,
    },
  ), [selectedRoute.pickup.position]);

  useEffect(() => {
    let ignored = false;
    getCustomerProfile()
      .then((profile) => {
        if (!ignored) setCustomerProfile(profile);
      })
      .catch(() => {
        if (!ignored) setCustomerProfile(null);
      });
    return () => {
      ignored = true;
    };
  }, []);

  return (
    <PageShell>
      <main className="user-tracking-screen">
        <Topbar
          brandTo="/home"
          actions={(
            <>
              <Link to="/home">ホーム</Link>
              <Link to="/user-info/profile">アカウント</Link>
              <ProfileAvatarSlot slot="topbar" src={customerAvatar} fallbackText={customerName} />
            </>
          )}
        />

        <section className="user-tracking-map">
          <InteractiveRouteMap
            alternateRoutePath={[]}
            className="tracking-route-map"
            compact
            currentLocation={userMapPosition}
            driverLocation={driverLocation}
            route={routePoints}
            routePath={selectedRoute.routePath}
            routeSummary={`${selectedRoute.routeMetrics.distance} - ${selectedRoute.routeMetrics.duration}`}
            scrollWheelZoom
            showCurrentLocation={Boolean(userLocation)}
            showDriver={Boolean(driverLocation)}
            showDetails={false}
          />

          <section className="tracking-card">
            <div className="tracking-eta-header">
              <div>
                <span>到着予定時間</span>
                <strong>あと {selectedRoute.routeMetrics.duration}</strong>
              </div>
              <em>{selectedRoute.routeMetrics.distance}</em>
            </div>

            <div className="tracking-driver-row">
                <ProfileAvatarSlot slot="tracking" src={driverAvatar} fallbackText={driverName} />
              <div>
                <strong>{driverName}</strong>
                <small>{vehicleLabel}</small>
                <em>{vehiclePlate}</em>
              </div>
            </div>

            <div className="tracking-actions">
              <Link className="tracking-call" to={messageLink}>📞 電話する</Link>
              <Link className="tracking-message" to={messageLink}>💬 メッセージ</Link>
            </div>
          </section>
        </section>
      </main>
    </PageShell>
  );
}
