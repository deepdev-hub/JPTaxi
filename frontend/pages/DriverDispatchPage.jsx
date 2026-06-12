import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useRideSocket } from '../hooks/useRideSocket.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { translateApiError } from '../i18n/errors.js';
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
  const { locale, t } = useI18n();
  const [pendingRide, setPendingRide] = useState(null);
  const [profile, setProfile] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [route, setRoute] = useState(null);
  const [radiusKm, setRadiusKm] = useState(null);
  const [offerExpiresAt, setOfferExpiresAt] = useState(null);
  const [clock, setClock] = useState(Date.now());
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const refreshPendingRide = useCallback(async () => {
    const result = await getPendingDriverRide();
    setPendingRide(result?.request ?? null);
    setRadiusKm(Number.isFinite(Number(result?.radiusKm)) ? Number(result.radiusKm) : null);
    setOfferExpiresAt(result?.offerExpiresAt || null);
    setStatus((current) => (
      result?.request ? '' : current || t('dispatch.driver.empty')
    ));
  }, [t]);

  useRideSocket({
    requestId: pendingRide?.requestId,
    handlers: {
      dispatchOfferCreated: () => {
        refreshPendingRide().catch(() => {});
      },
      dispatchOfferExpired: (payload) => {
        if (!pendingRide || Number(payload?.requestId) === pendingRide.requestId) {
          setPendingRide(null);
          setOfferExpiresAt(null);
          setStatus(t('dispatch.driver.expired'));
        }
      },
      dispatchOfferRejected: (payload) => {
        if (!pendingRide || Number(payload?.requestId) === pendingRide.requestId) {
          setPendingRide(null);
          setOfferExpiresAt(null);
        }
      },
      rideRequestCancelled: (payload) => {
        if (!pendingRide || Number(payload?.requestId) === pendingRide.requestId) {
          setPendingRide(null);
          setOfferExpiresAt(null);
          setStatus(t('dispatch.driver.customerCancelled'));
        }
      },
      rideAccepted: (payload) => {
        if (payload?.tripId) sessionStorage.setItem('jpTaxiTripId', String(payload.tripId));
        navigate('/driver-ride-status', { replace: true });
      },
    },
  });

  useEffect(() => {
    let stopped = false;
    getDriverProfile().then((value) => {
      if (!stopped) setProfile(value);
    }).catch(() => {});

    async function poll() {
      try {
        if (!stopped) await refreshPendingRide();
      } catch (error) {
        if (!stopped) setStatus(translateApiError(error, t, t('dispatch.driver.loadFailed')));
      }
    }
    poll();
    const timer = window.setInterval(poll, 2000);
    const stopLocation = watchLocation((position) => {
      setDriverLocation(position);
      updateDriverLocation({ lat: position[0], lng: position[1] }).catch(() => {});
    });
    return () => {
      stopped = true;
      stopLocation();
      window.clearInterval(timer);
    };
  }, [refreshPendingRide, t]);

  useEffect(() => {
    if (!offerExpiresAt) return undefined;
    setClock(Date.now());
    const timer = window.setInterval(() => setClock(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [offerExpiresAt]);

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
        setStatus(translateApiError(error, t, t('dispatch.driver.routeFailed')));
      });
  }, [locale, pendingRide?.requestId, t]);

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
      setStatus(translateApiError(error, t, t('dispatch.driver.acceptFailed')));
      setBusy(false);
    }
  }

  async function reject() {
    if (!pendingRide || busy) return;
    setBusy(true);
    try {
      await rejectDriverRide(pendingRide.requestId);
      setPendingRide(null);
      setOfferExpiresAt(null);
      setStatus(t('dispatch.driver.rejected'));
    } catch (error) {
      setStatus(translateApiError(error, t, t('dispatch.driver.rejectFailed')));
    } finally {
      setBusy(false);
    }
  }

  const profileName = [profile?.lastName, profile?.firstName].filter(Boolean).join(' ') || profile?.email || '';
  const passengerName = pendingRide?.actualPassengerName || pendingRide?.customer?.name || '';
  const passengerPhone = pendingRide?.actualPassengerPhone || pendingRide?.customer?.phone || '';
  const pickupDistance = Number.isFinite(Number(pendingRide?.distanceKm))
    ? `${Number(pendingRide.distanceKm).toFixed(1)} km`
    : t('common.unavailable');
  const routeDistance = route ? formatDistance(route.distance) : null;
  const routeDuration = route
    ? formatDuration(route.duration, route.distance, locale)
    : null;
  const mapCenter = pendingRide
    ? [Number(pendingRide.pickupLat), Number(pendingRide.pickupLng)]
    : driverLocation || undefined;
  const secondsRemaining = offerExpiresAt
    ? Math.max(0, Math.ceil((new Date(offerExpiresAt).getTime() - clock) / 1000))
    : 0;
  const offerExpired = Boolean(pendingRide && offerExpiresAt && secondsRemaining <= 0);

  return (
    <PageShell>
      <main className="driver-dispatch-screen driver-dispatch-reference">
        <Topbar
          brandTo="/driver-home"
          actions={(
            <>
              <Link to="/driver-home">{t('common.home')}</Link>
              <Link to="/messages/customer">{t('common.notifications')}</Link>
              <ProfileAvatarSlot slot="topbar" src={resolveAssetUrl(profile?.avatarUrl)} fallbackText={profileName} />
            </>
          )}
        />
        <section className="driver-dispatch-main">
          <div className="driver-dispatch-left">
            <h1>{t('dispatch.driver.title')}</h1>
            <p>{t('dispatch.driver.subtitle')}</p>
            <div className="dispatch-driver-box">
              <ProfileAvatarSlot
                slot="tracking"
                src={resolveAssetUrl(profile?.avatarUrl)}
                fallbackText={profileName}
              />
              <div>
                <strong>{profileName || t('dispatch.driver.profileLoading')}</strong>
                <span>{radiusKm == null ? t('dispatch.driver.rangeLoading') : t('dispatch.driver.range', { radius: radiusKm })}</span>
              </div>
            </div>
            {!pendingRide ? (
              <section className="dispatch-empty-card">
                <div className="spinner" aria-hidden="true" />
                <h2>{t('dispatch.driver.searching')}</h2>
                <p className="empty-state">{status || t('common.loading')}</p>
              </section>
            ) : (
              <>
                <section className="dispatch-card">
                  <div className="dispatch-countdown">{offerExpiresAt ? `${secondsRemaining}s` : '--'}</div>
                  <small>{radiusKm == null ? '' : t('dispatch.driver.range', { radius: radiusKm })}</small>
                  <span>{t('dispatch.driver.toPickup')}</span>
                  <strong>{pickupDistance}</strong>
                  <div className="dispatch-actions">
                    <button className="dispatch-decline" disabled={busy} onClick={reject} type="button">{t('common.reject')}</button>
                    <button className="dispatch-accept" disabled={busy || offerExpired} onClick={accept} type="button">{t('common.accept')}</button>
                  </div>
                </section>
                <section className="dispatch-customer-card">
                  <p>{t('dispatch.driver.customerInfo')}</p>
                  <div>
                    <span>
                      <strong>{passengerName || t('common.unavailable')}</strong>
                      <em>{passengerPhone}</em>
                    </span>
                  </div>
                  <p>{pendingRide.pickupAddress}</p>
                  <p>{pendingRide.dropoffAddress}</p>
                  {route ? <small>{routeDistance} · {routeDuration}</small> : null}
                </section>
              </>
            )}
          </div>
          <div className="driver-dispatch-map">
            <InteractiveRouteMap
              alternateRoutePath={[]}
              className="dispatch-route-map"
              currentLocation={driverLocation}
              fitToRoute={Boolean(pendingRide)}
              interactive
              mapCenter={mapCenter}
              mapZoom={15}
              route={routePoints}
              routePath={route?.routePath || []}
              routeSummary={route ? `${routeDistance} - ${routeDuration}` : ''}
              scrollWheelZoom
              showControls
              showCurrentLocation={Boolean(driverLocation)}
              showDetails={false}
              showDriver={false}
              showMarkers={Boolean(pendingRide)}
              showRoute={Boolean(route?.routePath?.length)}
            />
            {pendingRide ? (
              <section className="dispatch-floating-details">
                <div className="dispatch-passenger-row">
                  <ProfileAvatarSlot
                    slot="tracking"
                    src={resolveAssetUrl(pendingRide.customer?.avatarUrl)}
                    fallbackText={passengerName}
                  />
                  <div>
                    <strong>{t('dispatch.driver.customer', { name: passengerName || t('common.unavailable') })}</strong>
                    <small>{passengerPhone || t('dispatch.driver.contactLoading')}</small>
                  </div>
                </div>
                <div className="dispatch-stats">
                  <article><span>{t('dispatch.driver.pickup')}</span><strong>{pickupDistance}</strong></article>
                  <article><span>{t('dispatch.driver.distance')}</span><strong>{routeDistance || '--'}</strong></article>
                  <article><span>{t('dispatch.driver.duration')}</span><strong>{routeDuration || '--'}</strong></article>
                </div>
              </section>
            ) : (
              <section className="dispatch-floating-details dispatch-waiting-details">
                <div className="dispatch-passenger-row">
                  <span>...</span>
                  <div>
                    <strong>{t('dispatch.driver.waitingNearby')}</strong>
                    <small>{t('dispatch.driver.waitingCopy')}</small>
                  </div>
                </div>
              </section>
            )}
          </div>
        </section>
      </main>
    </PageShell>
  );
}
