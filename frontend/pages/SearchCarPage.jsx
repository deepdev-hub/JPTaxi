import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchDrivers } from '../api/drivers.js';
import { cancelRideRequest, getActiveRide } from '../api/rides.js';
import InteractiveRouteMap from '../components/InteractiveRouteMap.jsx';
import PageShell from '../components/PageShell.jsx';
import Topbar from '../components/Topbar.jsx';
import '../styles/search-car.css';

function readRoute() {
  try {
    const route = JSON.parse(sessionStorage.getItem('jpTaxiSelectedRoute') || 'null');
    return Array.isArray(route?.pickup?.position) ? route : null;
  } catch {
    return null;
  }
}

function normalizeDriver(driver) {
  const latitude = Number(driver?.location?.latitude);
  const longitude = Number(driver?.location?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    ...driver,
    label: `${driver.lastName || ''} ${driver.firstName || ''}`.trim() || 'Taxi',
    position: [latitude, longitude],
  };
}

export default function SearchCarPage() {
  const navigate = useNavigate();
  const [route] = useState(readRoute);
  const [drivers, setDrivers] = useState([]);
  const [status, setStatus] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const pickup = route?.pickup?.position;
  const requestId = Number(sessionStorage.getItem('jpTaxiRideRequestId'));

  useEffect(() => {
    if (!pickup) return;
    searchDrivers({
      lat: pickup[0],
      lng: pickup[1],
      radiusKm: 10,
      maxLocationAgeMinutes: 30,
      limit: 8,
      sort: 'distance',
    })
      .then((data) => setDrivers((data?.drivers ?? []).map(normalizeDriver).filter(Boolean)))
      .catch((error) => setStatus(error.message || 'Unable to find nearby drivers.'));
  }, [pickup]);

  useEffect(() => {
    let stopped = false;
    async function poll() {
      try {
        const active = await getActiveRide();
        if (stopped) return;
        if (active?.type === 'trip') {
          sessionStorage.setItem('jpTaxiTripId', String(active.data.tripId));
          navigate('/ride-status', { replace: true });
        } else if (!active) {
          setStatus('The ride request is no longer active.');
        }
      } catch (error) {
        if (!stopped) setStatus(error.message || 'Unable to refresh the ride request.');
      }
    }
    poll();
    const timer = window.setInterval(poll, 2500);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [navigate]);

  const routePoints = useMemo(() => route ? [
    { key: 'pickup', label: route.pickup.name, position: route.pickup.position, type: 'pickup' },
    { key: 'destination', label: route.destination.name, position: route.destination.position, type: 'destination' },
  ] : [], [route]);

  async function cancel() {
    if (!requestId || cancelling) return;
    setCancelling(true);
    try {
      await cancelRideRequest(requestId);
      sessionStorage.removeItem('jpTaxiRideRequestId');
      navigate('/home', { replace: true });
    } catch (error) {
      setStatus(error.message || 'Unable to cancel the ride request.');
      setCancelling(false);
    }
  }

  if (!route || !requestId) {
    return <PageShell><main className="search-screen"><Topbar /><p className="empty-state">No active ride request.</p></main></PageShell>;
  }

  return (
    <PageShell>
      <main className="search-screen">
        <Topbar />
        <section className="map-stage">
          <InteractiveRouteMap
            alternateRoutePath={[]}
            className="search-background-map"
            currentLocation={pickup}
            nearbyDrivers={drivers}
            route={routePoints}
            routePath={route.routePath}
            showCurrentLocation
            showDetails={false}
            showDriver={false}
          />
          <section className="status-card">
            <div className="status-info">
              <div className="spinner" />
              <div className="text-group">
                <h1>Finding a driver...</h1>
                <p>{drivers.length ? `${drivers.length} online drivers are nearby.` : 'Waiting for an online driver.'}</p>
                {status ? <small role="alert">{status}</small> : null}
              </div>
            </div>
            <button className="reservation-cancel-button" disabled={cancelling} onClick={cancel} type="button">
              {cancelling ? 'Cancelling...' : 'Cancel booking'}
            </button>
          </section>
        </section>
      </main>
    </PageShell>
  );
}
