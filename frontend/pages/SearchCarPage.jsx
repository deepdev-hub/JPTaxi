import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { cancelRideRequest, getActiveRide } from '../api/rides.js';
import InteractiveRouteMap from '../components/InteractiveRouteMap.jsx';
import PageShell from '../components/PageShell.jsx';
import Topbar from '../components/Topbar.jsx';
import { watchBrowserLocation } from '../utils/geolocation.js';
import '../styles/search-car.css';

const fallbackSelectedRoute = {
  hasRoute: false,
  destination: {
    name: 'ロッテホテル ハノイ',
    address: '54 Liễu Giai, Ba Đình, Hà Nội',
    position: [21.03205, 105.81283],
  },
  pickup: {
    name: '現在位置',
    position: [21.02878, 105.85204],
  },
  routeMetrics: {
    duration: '12分',
    distance: '4.8 km',
    fare: '¥680',
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

function normalizeDriver(driver) {
  const latitude = Number(driver?.location?.latitude ?? driver?.latitude);
  const longitude = Number(driver?.location?.longitude ?? driver?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const vehicle = driver.vehicle ?? {};
  const label = [driver.lastName, driver.firstName].filter(Boolean).join(' ')
    || vehicle.licensePlate
    || 'Taxi';
  const distanceKm = Number(driver.distanceKm);

  return {
    driverId: driver.driverId,
    label,
    distanceKm: Number.isFinite(distanceKm) ? distanceKm : null,
    position: [latitude, longitude],
    vehicle,
  };
}

function readSelectedRoute() {
  try {
    const rawRoute = window.sessionStorage.getItem('jpTaxiSelectedRoute');
    if (!rawRoute) return fallbackSelectedRoute;

    const parsedRoute = JSON.parse(rawRoute);
    const pickupPosition = parsedRoute.pickup?.position;
    const destinationPosition = parsedRoute.destination?.position;

    if (!Array.isArray(pickupPosition) || !Array.isArray(destinationPosition)) {
      return fallbackSelectedRoute;
    }

    return {
      ...fallbackSelectedRoute,
      ...parsedRoute,
      hasRoute: true,
      routePath: Array.isArray(parsedRoute.routePath) ? parsedRoute.routePath : fallbackSelectedRoute.routePath,
      routeMetrics: {
        ...fallbackSelectedRoute.routeMetrics,
        ...parsedRoute.routeMetrics,
      },
    };
  } catch {
    return fallbackSelectedRoute;
  }
}

export default function SearchCarPage() {
  const navigate = useNavigate();
  const [selectedRoute] = useState(readSelectedRoute);
  const [userLocation, setUserLocation] = useState({
    latitude: selectedRoute.pickup.position[0],
    longitude: selectedRoute.pickup.position[1],
  });
  const [drivers, setDrivers] = useState([]);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [driverCancelNoticeOpen, setDriverCancelNoticeOpen] = useState(() => (
    sessionStorage.getItem('jpTaxiDriverCancelledNotice') === '1'
  ));

  function closeDriverCancelNotice() {
    sessionStorage.removeItem('jpTaxiDriverCancelledNotice');
    setDriverCancelNoticeOpen(false);
  }

  useEffect(() => {
    return watchBrowserLocation(
      (location) => setUserLocation({
        latitude: location.latitude,
        longitude: location.longitude,
      }),
      {
        fallback: {
          latitude: selectedRoute.pickup.position[0],
          longitude: selectedRoute.pickup.position[1],
        },
        emitFallback: false,
      },
    );
  }, [selectedRoute.pickup.position]);

  useEffect(() => {
    let ignore = false;
    const params = new URLSearchParams({
      lat: String(userLocation.latitude),
      lng: String(userLocation.longitude),
      radiusKm: '2',
      maxLocationAgeMinutes: '1440',
      limit: '8',
      sort: 'distance',
    });

    setIsLoadingDrivers(true);
    apiRequest(`/drivers/search?${params.toString()}`)
      .then((data) => {
        if (ignore) return;
        const nextDrivers = (data?.drivers ?? []).map(normalizeDriver).filter(Boolean);
        setDrivers(nextDrivers);
      })
      .catch(() => {
        if (!ignore) {
          setDrivers([]);
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoadingDrivers(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [userLocation.latitude, userLocation.longitude]);

  useEffect(() => {
    let ignore = false;
    const currentRequestId = Number(sessionStorage.getItem('jpTaxiRideRequestId'));

    async function checkAssignedRide() {
      if (!currentRequestId) return;
      try {
        const activeRide = await getActiveRide();
        if (ignore) return;
        const activeRequestId = Number(
          activeRide?.data?.rideRequest?.requestId
          ?? activeRide?.data?.requestId
          ?? activeRide?.data?.rideRequest?.id,
        );
        if (activeRide?.type === 'trip' && activeRequestId === currentRequestId) {
          const tripId = activeRide.data?.tripId;
          if (tripId) {
            sessionStorage.setItem('jpTaxiTripId', String(tripId));
          }
          navigate('/ride-status', { replace: true });
        }
      } catch {
        /* keep waiting */
      }
    }

    checkAssignedRide();
    const timer = window.setInterval(checkAssignedRide, 2500);
    return () => {
      ignore = true;
      window.clearInterval(timer);
    };
  }, [navigate]);

  const mapCenter = useMemo(
    () => [userLocation.latitude, userLocation.longitude],
    [userLocation.latitude, userLocation.longitude],
  );
  const displayedRoutePath = useMemo(() => (
    selectedRoute.hasRoute ? [mapCenter, ...selectedRoute.routePath.slice(1)] : []
  ), [mapCenter, selectedRoute.hasRoute, selectedRoute.routePath]);
  const routePoints = useMemo(() => [
    {
      key: 'pickup',
      label: selectedRoute.pickup.name,
      meta: '出発地',
      time: '現在',
      position: mapCenter,
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
  ], [mapCenter, selectedRoute]);
  const driverCount = drivers.length;
  const requestId = sessionStorage.getItem('jpTaxiRideRequestId');
  const waitingCopy = isLoadingDrivers || driverCount === 0
    ? '近くの車両を検索しています。ドライバーの応答を待っています。'
    : `近くに${driverCount}台の車両が見つかりました。ドライバーの応答を待っています。`;

  async function handleCancelReservation() {
    if (isCancelling) return;
    setIsCancelling(true);

    try {
      const numericRequestId = Number(requestId);
      if (Number.isFinite(numericRequestId)) {
        await cancelRideRequest(numericRequestId);
      }
    } catch {
      /* Keep local cancellation usable if the request is already assigned/cancelled. */
    } finally {
      sessionStorage.removeItem('jpTaxiRideRequestId');
      sessionStorage.removeItem('jpTaxiTripId');
      localStorage.removeItem('jpTaxiRideAccepted');
      localStorage.removeItem('jpTaxiPaymentRequested');
      navigate('/bill-confirm', { replace: true });
    }
  }

  return (
    <PageShell>
      <main className="search-screen">
        <Topbar>
          <div className="location-chip" aria-label="現在位置">
            <span className="location-dot"></span>
            <span>ハノイ・ホアンキエム周辺</span>
          </div>
        </Topbar>

        <section className="map-stage" aria-label="配車マップ">
          <InteractiveRouteMap
            className="search-background-map"
            fitToRoute={selectedRoute.hasRoute}
            interactive
            alternateRoutePath={[]}
            currentLocation={mapCenter}
            mapCenter={mapCenter}
            mapZoom={15}
            nearbyDrivers={drivers}
            route={routePoints}
            routePath={displayedRoutePath}
            routeSummary={`${selectedRoute.routeMetrics.distance} - ${selectedRoute.routeMetrics.duration}`}
            scrollWheelZoom
            showControls
            showCurrentLocation
            showDetails={false}
            showDriver={false}
            showMarkers={selectedRoute.hasRoute}
            showRoute={selectedRoute.hasRoute}
          />
          <section className="status-card" aria-labelledby="search-title">
            <div className="status-info">
              <div className="spinner" aria-hidden="true"></div>
              <div className="text-group">
                <div className="waiting-title-row">
                  <h1 id="search-title">タクシーを呼び出し中...</h1>
                </div>
                <p>{waitingCopy}</p>
              </div>
            </div>

            <div className="card-actions">
              <button className="reservation-cancel-button" type="button" onClick={handleCancelReservation} disabled={isCancelling}>
                {isCancelling ? 'キャンセル中...' : '予約をキャンセル'}
              </button>
            </div>
          </section>
        </section>

        {driverCancelNoticeOpen ? (
          <div className="driver-cancel-popup-backdrop" role="presentation" onClick={closeDriverCancelNotice}>
            <section
              className="driver-cancel-popup"
              role="dialog"
              aria-modal="true"
              aria-labelledby="driver-cancel-title"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id="driver-cancel-title">ドライバーが乗車をキャンセルしました</h2>
              <p>別のドライバーを続けて検索しています。必要な場合は予約をキャンセルできます。</p>
              <button type="button" onClick={closeDriverCancelNotice}>閉じる</button>
            </section>
          </div>
        ) : null}
      </main>
    </PageShell>
  );
}
