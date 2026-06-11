import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDriverProfile, resolveAssetUrl } from '../api/accounts.js';
import { getDrivingRoute } from '../api/maps.js';
import {
  cancelDriverRide,
  getActiveDriverRide,
  requestDriverPayment,
  updateDriverLocation,
} from '../api/rides.js';
import InteractiveRouteMap from '../components/InteractiveRouteMap.jsx';
import PageShell from '../components/PageShell.jsx';
import ProfileAvatarSlot from '../components/ProfileAvatarSlot.jsx';
import Topbar from '../components/Topbar.jsx';
import { setLastInvoiceTripId } from '../utils/invoiceSession.js';
import '../styles/app-pages.css';

function watchDriverLocation(onLocation) {
  if (!navigator.geolocation) return () => {};
  const id = navigator.geolocation.watchPosition(
    ({ coords }) => onLocation([coords.latitude, coords.longitude]),
    () => {},
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}

export default function DriverRideStatusPage() {
  const navigate = useNavigate();
  const [ride, setRide] = useState(null);
  const [profile, setProfile] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let stopped = false;
    getDriverProfile().then((value) => {
      if (!stopped) setProfile(value);
    }).catch(() => {});
    async function poll() {
      try {
        const active = await getActiveDriverRide();
        if (stopped) return;
        if (active?.type === 'trip') {
          setRide(active.data);
          sessionStorage.setItem('jpTaxiTripId', String(active.data.tripId));
        } else {
          setRide(null);
          setStatus('No active trip.');
        }
      } catch (error) {
        if (!stopped) setStatus(error.message || 'Unable to load the active trip.');
      }
    }
    poll();
    const timer = window.setInterval(poll, 2500);
    const stopLocation = watchDriverLocation((position) => {
      setDriverLocation(position);
      updateDriverLocation({ lat: position[0], lng: position[1] }).catch(() => {});
    });
    return () => {
      stopped = true;
      stopLocation();
      window.clearInterval(timer);
    };
  }, []);

  const request = ride?.rideRequest;
  const pickup = request ? [Number(request.pickupLat), Number(request.pickupLng)] : null;
  const destination = request ? [Number(request.dropoffLat), Number(request.dropoffLng)] : null;

  useEffect(() => {
    if (!pickup || !destination) {
      setRoutePath([]);
      return;
    }
    const start = driverLocation || pickup;
    Promise.all([
      getDrivingRoute(start, pickup),
      getDrivingRoute(pickup, destination),
    ])
      .then(([toPickup, tripRoute]) => setRoutePath([
        ...toPickup.path,
        ...tripRoute.path.slice(1),
      ]))
      .catch((error) => {
        setRoutePath([]);
        setStatus(error.message || 'Unable to load the route.');
      });
  }, [driverLocation, request?.requestId]);

  const routePoints = useMemo(() => request ? [
    { key: 'pickup', label: request.pickupAddress, position: pickup, type: 'pickup' },
    { key: 'destination', label: request.dropoffAddress, position: destination, type: 'destination' },
  ] : [], [request]);

  async function requestPayment() {
    if (!ride || busy) return;
    setBusy(true);
    setStatus('');
    try {
      await requestDriverPayment(ride.tripId);
      setLastInvoiceTripId(ride.tripId);
      setStatus('Payment request sent to the customer.');
    } catch (error) {
      setStatus(error.message || 'Unable to request payment.');
    } finally {
      setBusy(false);
    }
  }

  async function cancelRide() {
    if (!ride || busy) return;
    setBusy(true);
    try {
      await cancelDriverRide(ride.tripId);
      sessionStorage.removeItem('jpTaxiTripId');
      navigate('/xacnhancuocxe', { replace: true });
    } catch (error) {
      setStatus(error.message || 'Unable to cancel the trip.');
      setBusy(false);
    }
  }

  const passenger = ride?.passenger;
  const profileName = [profile?.lastName, profile?.firstName].filter(Boolean).join(' ') || profile?.email || '';

  return (
    <PageShell>
      <main className="driver-tracking-screen">
        <Topbar
          brandTo="/driver-home"
          actions={(
            <>
              <Link to="/driver-home">Home</Link>
              <Link to="/driver-info/basic">Account</Link>
              <ProfileAvatarSlot slot="topbar" src={resolveAssetUrl(profile?.avatarUrl)} fallbackText={profileName} />
            </>
          )}
        />
        {!ride ? <p className="empty-state">{status || 'Loading active trip...'}</p> : (
          <section className="driver-tracking-map">
            <InteractiveRouteMap
              alternateRoutePath={[]}
              className="tracking-route-map"
              currentLocation={driverLocation}
              driverLocation={driverLocation}
              route={routePoints}
              routePath={routePath}
              showCurrentLocation={Boolean(driverLocation)}
              showDetails={false}
              showDriver={Boolean(driverLocation)}
            />
            <section className="driver-tracking-card">
              <div className="tracking-passenger-row">
                <ProfileAvatarSlot src={resolveAssetUrl(passenger?.avatarUrl)} fallbackText={passenger?.name || ''} />
                <div>
                  <strong>{passenger?.name || 'Passenger'}</strong>
                  <small>{request?.pickupAddress}</small>
                  <em>{passenger?.phone}</em>
                </div>
              </div>
              <div className="tracking-actions">
                <Link className="tracking-call" to={`/messages/customer?peerId=${passenger?.customerId || ''}`}>Message</Link>
                <button className="tracking-message" disabled={busy} onClick={requestPayment} type="button">Request payment</button>
                <button className="tracking-cancel-ride" disabled={busy} onClick={cancelRide} type="button">Cancel trip</button>
              </div>
              {status ? <p className="tracking-error-text">{status}</p> : null}
            </section>
          </section>
        )}
      </main>
    </PageShell>
  );
}
