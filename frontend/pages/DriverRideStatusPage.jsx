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
import { useRideSocket } from '../hooks/useRideSocket.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { translateApiError } from '../i18n/errors.js';
import { setLastInvoiceTripId } from '../utils/invoiceSession.js';
import { formatDistance, formatDuration } from '../utils/routePlanner.js';
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
  const { locale, t } = useI18n();
  const [ride, setRide] = useState(null);
  const [profile, setProfile] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [routeMetrics, setRouteMetrics] = useState(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useRideSocket({
    requestId: ride?.rideRequest?.requestId,
    tripId: ride?.tripId,
    handlers: {
      rideRequestCancelled: () => navigate('/xacnhancuocxe', { replace: true }),
      tripPaid: () => navigate('/driver-invoice', { replace: true }),
    },
  });

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
          setStatus(t('ride.noActive'));
        }
      } catch (error) {
        if (!stopped) setStatus(translateApiError(error, t, t('ride.refreshFailed')));
      }
    }
    poll();
    const timer = window.setInterval(poll, 2000);
    const stopLocation = watchDriverLocation((position) => {
      setDriverLocation(position);
      updateDriverLocation({ lat: position[0], lng: position[1] }).catch(() => {});
    });
    return () => {
      stopped = true;
      stopLocation();
      window.clearInterval(timer);
    };
  }, [navigate, t]);

  const request = ride?.rideRequest;
  const pickup = request ? [Number(request.pickupLat), Number(request.pickupLng)] : null;
  const destination = request ? [Number(request.dropoffLat), Number(request.dropoffLng)] : null;

  useEffect(() => {
    if (!pickup || !destination) {
      setRoutePath([]);
      setRouteMetrics(null);
      return;
    }
    const start = driverLocation || pickup;
    Promise.all([
      getDrivingRoute(start, pickup),
      getDrivingRoute(pickup, destination),
    ])
      .then(([toPickup, tripRoute]) => {
        setRoutePath([
          ...toPickup.path,
          ...tripRoute.path.slice(1),
        ]);
        const distanceMeters = Number(toPickup.distanceMeters) + Number(tripRoute.distanceMeters);
        const durationSeconds = Number(toPickup.durationSeconds) + Number(tripRoute.durationSeconds);
        setRouteMetrics(
          Number.isFinite(distanceMeters) && Number.isFinite(durationSeconds)
            ? {
                distance: formatDistance(distanceMeters),
                duration: formatDuration(durationSeconds, distanceMeters, locale),
              }
            : null,
        );
      })
      .catch((error) => {
        setRoutePath([]);
        setRouteMetrics(null);
        setStatus(translateApiError(error, t, t('ride.routeFailed')));
      });
  }, [driverLocation, locale, request?.requestId, t]);

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
      setStatus(t('ride.paymentSent'));
    } catch (error) {
      setStatus(translateApiError(error, t, t('ride.paymentFailed')));
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
      setStatus(translateApiError(error, t, t('ride.cancelFailed')));
      setBusy(false);
    }
  }

  const passenger = ride?.passenger;
  const profileName = [profile?.lastName, profile?.firstName].filter(Boolean).join(' ') || profile?.email || '';
  const tripDistance = routeMetrics?.distance
    || (Number.isFinite(Number(ride?.actualDistanceKm))
      ? `${Number(ride.actualDistanceKm).toFixed(1)} km`
      : '--');
  const tripDuration = routeMetrics?.duration || t('ride.calculating');

  return (
    <PageShell>
      <main className="driver-tracking-screen">
        <Topbar
          brandTo="/driver-home"
          actions={(
            <>
              <Link to="/driver-home">{t('common.home')}</Link>
              <Link to="/driver-info/basic">{t('common.account')}</Link>
              <ProfileAvatarSlot slot="topbar" src={resolveAssetUrl(profile?.avatarUrl)} fallbackText={profileName} />
            </>
          )}
        />
        {!ride ? <p className="empty-state">{status || t('ride.loading')}</p> : (
          <section className="driver-tracking-map">
            <InteractiveRouteMap
              alternateRoutePath={[]}
              className="tracking-route-map"
              compact
              currentLocation={driverLocation}
              driverLocation={driverLocation}
              route={routePoints}
              routePath={routePath}
              routeSummary={routeMetrics ? `${routeMetrics.distance} - ${routeMetrics.duration}` : ''}
              scrollWheelZoom
              showCurrentLocation={Boolean(driverLocation)}
              showDetails={false}
              showDriver={Boolean(driverLocation)}
            />
            <section className="driver-tracking-card">
              <div className="tracking-eta-header">
                <div>
                  <span>{t('ride.eta')}</span>
                  <strong>{t('ride.remaining', { duration: tripDuration })}</strong>
                </div>
                <em>{tripDistance}</em>
              </div>
              <div className="tracking-passenger-row">
                <ProfileAvatarSlot slot="tracking" src={resolveAssetUrl(passenger?.avatarUrl)} fallbackText={passenger?.name || ''} />
                <div>
                  <strong>{passenger?.name || t('common.passenger')}</strong>
                  <small>{request?.pickupAddress}</small>
                  <em>{passenger?.phone}</em>
                </div>
              </div>
              <div className="tracking-actions">
                <Link className="tracking-call" to={`/messages/customer?peerId=${passenger?.customerId || ''}`}>{t('common.messages')}</Link>
                <button className="tracking-message" disabled={busy} onClick={requestPayment} type="button">{t('ride.requestPayment')}</button>
                <button className="tracking-cancel-ride" disabled={busy} onClick={cancelRide} type="button">{t('ride.cancelTrip')}</button>
              </div>
              {status ? <p className="tracking-error-text">{status}</p> : null}
            </section>
          </section>
        )}
      </main>
    </PageShell>
  );
}
