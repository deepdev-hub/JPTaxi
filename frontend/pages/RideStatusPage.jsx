import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCustomerProfile, resolveAssetUrl } from '../api/accounts.js';
import { getDrivingRoute } from '../api/maps.js';
import { getActiveRide } from '../api/rides.js';
import InteractiveRouteMap from '../components/InteractiveRouteMap.jsx';
import PageShell from '../components/PageShell.jsx';
import ProfileAvatarSlot from '../components/ProfileAvatarSlot.jsx';
import Topbar from '../components/Topbar.jsx';
import '../styles/app-pages.css';

function driverPosition(driver) {
  const latitude = Number(driver?.location?.latitude);
  const longitude = Number(driver?.location?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? [latitude, longitude]
    : null;
}

export default function RideStatusPage() {
  const navigate = useNavigate();
  const [ride, setRide] = useState(null);
  const [profile, setProfile] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let stopped = false;
    getCustomerProfile().then((value) => {
      if (!stopped) setProfile(value);
    }).catch(() => {});

    async function poll() {
      try {
        const active = await getActiveRide();
        if (stopped) return;
        if (active?.type === 'request') {
          navigate('/search-car', { replace: true });
          return;
        }
        if (active?.type !== 'trip') {
          setRide(null);
          setStatus('No active trip.');
          return;
        }
        setRide(active.data);
        sessionStorage.setItem('jpTaxiTripId', String(active.data.tripId));
        if (active.paymentRequested) {
          navigate('/payment', { replace: true });
        }
      } catch (error) {
        if (!stopped) setStatus(error.message || 'Unable to refresh the trip.');
      }
    }
    poll();
    const timer = window.setInterval(poll, 2500);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [navigate]);

  const request = ride?.rideRequest;
  const pickup = request
    ? [Number(request.pickupLat), Number(request.pickupLng)]
    : null;
  const destination = request
    ? [Number(request.dropoffLat), Number(request.dropoffLng)]
    : null;

  useEffect(() => {
    if (!pickup || !destination) {
      setRoutePath([]);
      return;
    }
    getDrivingRoute(pickup, destination)
      .then((route) => setRoutePath(route.path))
      .catch((error) => {
        setRoutePath([]);
        setStatus(error.message || 'Unable to load the route.');
      });
  }, [request?.requestId]);

  const routePoints = useMemo(() => request ? [
    { key: 'pickup', label: request.pickupAddress, position: pickup, type: 'pickup' },
    { key: 'destination', label: request.dropoffAddress, position: destination, type: 'destination' },
  ] : [], [request]);

  const driver = ride?.driver;
  const vehicle = ride?.vehicle;
  const customerName = [profile?.lastName, profile?.firstName].filter(Boolean).join(' ') || profile?.email || '';

  return (
    <PageShell>
      <main className="user-tracking-screen">
        <Topbar
          brandTo="/home"
          actions={(
            <>
              <Link to="/home">Home</Link>
              <Link to="/user-info/profile">Account</Link>
              <ProfileAvatarSlot slot="topbar" src={resolveAssetUrl(profile?.avatarUrl)} fallbackText={customerName} />
            </>
          )}
        />
        {!ride ? <p className="empty-state">{status || 'Loading active trip...'}</p> : (
          <>
            <section className="user-tracking-map">
              <InteractiveRouteMap
                alternateRoutePath={[]}
                className="tracking-route-map"
                currentLocation={pickup}
                driverLocation={driverPosition(driver)}
                route={routePoints}
                routePath={routePath}
                showCurrentLocation={Boolean(pickup)}
                showDetails={false}
                showDriver={Boolean(driverPosition(driver))}
              />
            </section>
            <section className="tracking-driver-card">
              <ProfileAvatarSlot src={resolveAssetUrl(driver?.avatarUrl)} fallbackText={driver?.name || ''} />
              <div>
                <strong>{driver?.name || 'Driver information unavailable'}</strong>
                <span>{[vehicle?.brand, vehicle?.color].filter(Boolean).join(' / ')}</span>
                <span>{vehicle?.licensePlate || ''}</span>
              </div>
              <Link to={`/messages/driver?peerId=${driver?.driverId || ''}`}>Message</Link>
            </section>
            {status ? <p className="payment-status-text">{status}</p> : null}
          </>
        )}
      </main>
    </PageShell>
  );
}
