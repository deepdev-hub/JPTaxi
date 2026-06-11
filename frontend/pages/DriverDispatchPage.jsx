import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDriverProfile, resolveAssetUrl } from '../api/accounts.js';
import {
  acceptDriverRide,
  getPendingDriverRide,
  rejectDriverRide,
  updateDriverLocation,
} from '../api/rides.js';
import InteractiveRouteMap from '../components/InteractiveRouteMap.jsx';
import PageShell from '../components/PageShell.jsx';
import ProfileAvatarSlot from '../components/ProfileAvatarSlot.jsx';
import Topbar from '../components/Topbar.jsx';
import { fetchDrivingRoute, formatDistance, formatDuration } from '../utils/routePlanner.js';
import '../styles/app-pages.css';

function watchLocation(onLocation) {
  if (!navigator.geolocation) return () => {};
  const id = navigator.geolocation.watchPosition(
    ({ coords }) => onLocation([coords.latitude, coords.longitude]),
    () => {},
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}

export default function DriverDispatchPage() {
  const navigate = useNavigate();
  const [pendingRide, setPendingRide] = useState(null);
  const [profile, setProfile] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [route, setRoute] = useState(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let stopped = false;
    getDriverProfile().then((value) => {
      if (!stopped) setProfile(value);
    }).catch(() => {});

    async function poll() {
      try {
        const result = await getPendingDriverRide();
        if (!stopped) {
          setPendingRide(result?.request ?? null);
          setStatus(result?.request ? '' : result?.message || 'No pending ride requests.');
        }
      } catch (error) {
        if (!stopped) setStatus(error.message || 'Unable to load ride requests.');
      }
    }
    poll();
    const timer = window.setInterval(poll, 2500);
    const stopLocation = watchLocation((position) => {
      setDriverLocation(position);
      updateDriverLocation({ lat: position[0], lng: position[1] }).catch(() => {});
    });
    return () => {
      stopped = true;
      stopLocation();
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!pendingRide) {
      setRoute(null);
      return;
    }
    fetchDrivingRoute(
      [pendingRide.pickupLat, pendingRide.pickupLng],
      [pendingRide.dropoffLat, pendingRide.dropoffLng],
    )
      .then(setRoute)
      .catch((error) => {
        setRoute(null);
        setStatus(error.message || 'Unable to load the trip route.');
      });
  }, [pendingRide?.requestId]);

  const routePoints = useMemo(() => pendingRide ? [
    { key: 'pickup', label: pendingRide.pickupAddress, position: [pendingRide.pickupLat, pendingRide.pickupLng], type: 'pickup' },
    { key: 'destination', label: pendingRide.dropoffAddress, position: [pendingRide.dropoffLat, pendingRide.dropoffLng], type: 'destination' },
  ] : [], [pendingRide]);

  async function accept() {
    if (!pendingRide || busy) return;
    setBusy(true);
    try {
      const result = await acceptDriverRide(pendingRide.requestId);
      sessionStorage.setItem('jpTaxiRideRequestId', String(pendingRide.requestId));
      if (result?.tripId) sessionStorage.setItem('jpTaxiTripId', String(result.tripId));
      navigate('/driver-ride-status');
    } catch (error) {
      setStatus(error.message || 'Unable to accept this ride.');
      setBusy(false);
    }
  }

  async function reject() {
    if (!pendingRide || busy) return;
    setBusy(true);
    try {
      await rejectDriverRide(pendingRide.requestId);
      setPendingRide(null);
      setStatus('Looking for another request...');
    } catch (error) {
      setStatus(error.message || 'Unable to reject this ride.');
    } finally {
      setBusy(false);
    }
  }

  const profileName = [profile?.lastName, profile?.firstName].filter(Boolean).join(' ') || profile?.email || '';
  const passengerName = pendingRide?.actualPassengerName || pendingRide?.customer?.name || '';

  return (
    <PageShell>
      <main className="driver-dispatch-screen driver-dispatch-reference">
        <Topbar
          brandTo="/driver-home"
          actions={(
            <>
              <Link to="/driver-home">Home</Link>
              <Link to="/messages/customer">Messages</Link>
              <ProfileAvatarSlot slot="topbar" src={resolveAssetUrl(profile?.avatarUrl)} fallbackText={profileName} />
            </>
          )}
        />
        <section className="driver-dispatch-main">
          <div className="driver-dispatch-left">
            <h1>Ride request</h1>
            {!pendingRide ? <section className="dispatch-empty-card"><p className="empty-state">{status || 'Loading...'}</p></section> : (
              <>
                <section className="dispatch-card">
                  <span>Pickup distance</span>
                  <strong>{Number.isFinite(Number(pendingRide.distanceKm)) ? `${Number(pendingRide.distanceKm).toFixed(1)} km` : 'Unavailable'}</strong>
                  <div className="dispatch-actions">
                    <button className="dispatch-decline" disabled={busy} onClick={reject} type="button">Skip</button>
                    <button className="dispatch-accept" disabled={busy} onClick={accept} type="button">Accept</button>
                  </div>
                </section>
                <section className="dispatch-customer-card">
                  <p>Passenger</p>
                  <strong>{passengerName || 'Name unavailable'}</strong>
                  <em>{pendingRide.actualPassengerPhone || pendingRide.customer?.phone || ''}</em>
                  <p>{pendingRide.pickupAddress}</p>
                  <p>{pendingRide.dropoffAddress}</p>
                  {route ? <small>{formatDistance(route.distance)} · {formatDuration(route.duration, route.distance)}</small> : null}
                </section>
              </>
            )}
          </div>
          <div className="driver-dispatch-map">
            <InteractiveRouteMap
              alternateRoutePath={[]}
              className="dispatch-route-map"
              currentLocation={driverLocation}
              mapCenter={driverLocation || pendingRide ? [pendingRide?.pickupLat || driverLocation?.[0], pendingRide?.pickupLng || driverLocation?.[1]] : undefined}
              route={routePoints}
              routePath={route?.routePath || []}
              showCurrentLocation={Boolean(driverLocation)}
              showDetails={false}
              showDriver={false}
              showMarkers={Boolean(pendingRide)}
              showRoute={Boolean(route?.routePath?.length)}
            />
          </div>
        </section>
      </main>
    </PageShell>
  );
}
