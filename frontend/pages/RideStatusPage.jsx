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
import { useChatNotification } from '../contexts/ChatContext.jsx';
import { formatDistance, formatDuration } from '../utils/routePlanner.js';
import '../styles/app-pages.css';

function driverPosition(driver) {
  const latitude = Number(driver?.location?.latitude);
  const longitude = Number(driver?.location?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? [latitude, longitude]
    : null;
}

const formatDualCurrency = (vnd, jpy, fallbackRate = 166.6667) => {
  if (jpy != null) return `¥${Number(jpy).toLocaleString()}`;
  if (vnd != null) return `¥${Math.round(Number(vnd) / fallbackRate).toLocaleString()}`;
  return '--';
};

export default function RideStatusPage() {
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const { totalUnread } = useChatNotification();
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
                
                <div className="tracking-trip-info">
                  <div className="tracking-info-row">
                    <div className="tracking-info-icon">
                      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <div className="tracking-info-text">
                      <span>{t('location.destination') || '目的地'}</span>
                      <strong>{request?.dropoffAddress || '--'}</strong>
                    </div>
                  </div>
                  <div className="tracking-info-row">
                    <div className="tracking-info-icon">
                      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div className="tracking-info-text">
                      <span>{t('reservation.fare') || '料金'}</span>
                      <strong>{request ? formatDualCurrency(request.estimatedFareVnd, request.estimatedFareJpy) : '--'}</strong>
                    </div>
                  </div>
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
                  <Link className="tracking-message icon-with-badge" to={messageLink} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {t('common.messages')}
                    {totalUnread > 0 && <span className="badge-notification">{totalUnread}</span>}
                  </Link>
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
