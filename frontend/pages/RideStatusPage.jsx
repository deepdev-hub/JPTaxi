import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCustomerProfile, resolveAssetUrl } from '../api/accounts.js';
import { getDrivingRoute } from '../api/maps.js';
import { getActiveRide } from '../api/rides.js';
import InteractiveRouteMap from '../components/InteractiveRouteMap.jsx';
import PageShell from '../components/PageShell.jsx';
import ProfileAvatarSlot from '../components/ProfileAvatarSlot.jsx';
import Topbar from '../components/Topbar.jsx';
import { useRideSocket } from '../hooks/useRideSocket.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { translateApiError } from '../i18n/errors.js';
import { formatDistance, formatDuration } from '../utils/routePlanner.js';
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
  const { locale, t } = useI18n();
  const [ride, setRide] = useState(null);
  const [profile, setProfile] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [routeMetrics, setRouteMetrics] = useState(null);
  const [status, setStatus] = useState('');

  useRideSocket({
    requestId: ride?.rideRequest?.requestId,
    tripId: ride?.tripId,
    handlers: {
      paymentRequested: () => navigate('/payment', { replace: true }),
      driverCancelledRide: () => navigate('/search-car', { replace: true }),
      locationUpdated: (payload) => {
        setRide((current) => current ? {
          ...current,
          driver: {
            ...current.driver,
            location: payload,
          },
        } : current);
      },
    },
  });

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
          setStatus(t('ride.noActive'));
          return;
        }
        setRide(active.data);
        sessionStorage.setItem('jpTaxiTripId', String(active.data.tripId));
        if (active.paymentRequested) {
          navigate('/payment', { replace: true });
        }
      } catch (error) {
        if (!stopped) setStatus(translateApiError(error, t, t('ride.refreshFailed')));
      }
    }
    poll();
    const timer = window.setInterval(poll, 2000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [navigate, t]);

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
      setRouteMetrics(null);
      return;
    }
    getDrivingRoute(pickup, destination)
      .then((route) => {
        setRoutePath(route.path);
        setRouteMetrics(
          Number.isFinite(route.distanceMeters) && Number.isFinite(route.durationSeconds)
            ? {
                distance: formatDistance(route.distanceMeters),
                duration: formatDuration(route.durationSeconds, route.distanceMeters, locale),
              }
            : null,
        );
      })
      .catch((error) => {
        setRoutePath([]);
        setRouteMetrics(null);
        setStatus(translateApiError(error, t, t('ride.routeFailed')));
      });
  }, [locale, request?.requestId, t]);

  const routePoints = useMemo(() => request ? [
    { key: 'pickup', label: request.pickupAddress, position: pickup, type: 'pickup' },
    { key: 'destination', label: request.dropoffAddress, position: destination, type: 'destination' },
  ] : [], [request]);

  const driver = ride?.driver;
  const vehicle = ride?.vehicle;
  const customerName = [profile?.lastName, profile?.firstName].filter(Boolean).join(' ') || profile?.email || '';
  const tripDistance = routeMetrics?.distance
    || (Number.isFinite(Number(ride?.actualDistanceKm))
      ? `${Number(ride.actualDistanceKm).toFixed(1)} km`
      : '--');
  const tripDuration = routeMetrics?.duration || t('ride.calculating');
  const messageLink = `/messages/driver?peerId=${driver?.driverId || ''}`;

  return (
    <PageShell>
      <main className="user-tracking-screen">
        <Topbar
          brandTo="/home"
          actions={(
            <>
              <Link to="/home">{t('common.home')}</Link>
              <Link to="/user-info/profile">{t('common.account')}</Link>
              <ProfileAvatarSlot slot="topbar" src={resolveAssetUrl(profile?.avatarUrl)} fallbackText={customerName} />
            </>
          )}
        />
        {!ride ? <p className="empty-state">{status || t('ride.loading')}</p> : (
          <>
            <section className="user-tracking-map">
              <InteractiveRouteMap
                alternateRoutePath={[]}
                className="tracking-route-map"
                compact
                currentLocation={pickup}
                driverLocation={driverPosition(driver)}
                route={routePoints}
                routePath={routePath}
                routeSummary={routeMetrics ? `${routeMetrics.distance} - ${routeMetrics.duration}` : ''}
                scrollWheelZoom
                showCurrentLocation={Boolean(pickup)}
                showDetails={false}
                showDriver={Boolean(driverPosition(driver))}
              />
              <section className="tracking-card">
                <div className="tracking-eta-header">
                  <div>
                    <span>{t('ride.eta')}</span>
                    <strong>{t('ride.remaining', { duration: tripDuration })}</strong>
                  </div>
                  <em>{tripDistance}</em>
                </div>
                <div className="tracking-driver-row">
                  <ProfileAvatarSlot
                    slot="tracking"
                    src={resolveAssetUrl(driver?.avatarUrl)}
                    fallbackText={driver?.name || ''}
                  />
                  <div>
                    <strong>{driver?.name || t('common.unavailable')}</strong>
                    <small>{[vehicle?.brand, vehicle?.color].filter(Boolean).join(' / ')}</small>
                    <em>{vehicle?.licensePlate || ''}</em>
                  </div>
                </div>
                <div className="tracking-actions">
                  <Link className="tracking-call" to={messageLink}>{t('ride.contact')}</Link>
                  <Link className="tracking-message" to={messageLink}>{t('common.messages')}</Link>
                </div>
                {status ? <p className="tracking-error-text">{status}</p> : null}
              </section>
            </section>
          </>
        )}
      </main>
    </PageShell>
  );
}
