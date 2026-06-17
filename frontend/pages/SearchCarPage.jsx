import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cancelRideRequest, getActiveRide } from '../api/rides.js';
import InteractiveRouteMap from '../components/InteractiveRouteMap.jsx';
import PageShell from '../components/PageShell.jsx';
import Topbar from '../components/Topbar.jsx';
import { useRideSocket } from '../hooks/useRideSocket.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { translateApiError } from '../i18n/errors.js';
import '../styles/search-car.css';

function readRoute() {
  try {
    const route = JSON.parse(sessionStorage.getItem('jpTaxiSelectedRoute') || 'null');
    return Array.isArray(route?.pickup?.position) ? route : null;
  } catch {
    return null;
  }
}

function routeFromActiveRequest(request) {
  if (!request) return null;
  const pickupLat = Number(request.pickupLat);
  const pickupLng = Number(request.pickupLng);
  const dropoffLat = Number(request.dropoffLat);
  const dropoffLng = Number(request.dropoffLng);
  if (
    !Number.isFinite(pickupLat) ||
    !Number.isFinite(pickupLng) ||
    !Number.isFinite(dropoffLat) ||
    !Number.isFinite(dropoffLng)
  ) {
    return null;
  }

  return {
    pickup: {
      name: request.pickupAddress,
      address: request.pickupAddress,
      position: [pickupLat, pickupLng],
    },
    destination: {
      name: request.dropoffAddress,
      address: request.dropoffAddress,
      position: [dropoffLat, dropoffLng],
    },
    routePath: [],
    routeMetrics: null,
  };
}

export default function SearchCarPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useI18n();
  const [route, setRoute] = useState(readRoute);
  const [activeRequestId, setActiveRequestId] = useState(() => Number(searchParams.get('requestId')) || null);
  const [dispatch, setDispatch] = useState({
    phase: 'expanding',
    radiusKm: 2,
    offerExpiresAt: null,
    diagnostic: null,
  });
  const [status, setStatus] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const pickup = route?.pickup?.position;
  const requestId = activeRequestId;

  const openTrip = useCallback((tripId) => {
    navigate('/ride-status', { replace: true });
  }, [navigate]);

  const refresh = useCallback(async () => {
    const active = await getActiveRide();
    if (active?.type === 'trip') {
      openTrip(active.data.tripId);
      return;
    }
    if (active?.type === 'request') {
      setActiveRequestId(Number(active.data?.requestId) || null);
      setRoute((current) => current || routeFromActiveRequest(active.data));
      setDispatch({
        phase: active.dispatch?.phase || 'expanding',
        radiusKm: Number(active.dispatch?.radiusKm) || 2,
        offerExpiresAt: active.dispatch?.offerExpiresAt || null,
        diagnostic: active.dispatch?.diagnostic || null,
      });
      setStatus('');
      return;
    }
    setStatus(t('dispatch.customer.inactive'));
  }, [openTrip, t]);

  useRideSocket({
    requestId,
    handlers: {
      dispatchRadiusUpdated: (payload) => {
        if (Number(payload?.requestId) !== requestId) return;
        setDispatch((current) => ({
          ...current,
          phase: 'expanding',
          radiusKm: Number(payload.radiusKm) || current.radiusKm,
          offerExpiresAt: null,
          diagnostic: null,
        }));
      },
      dispatchOfferCreated: (payload) => {
        if (Number(payload?.requestId) !== requestId) return;
        setDispatch({
          phase: 'waiting_driver',
          radiusKm: Number(payload.radiusKm) || 2,
          offerExpiresAt: payload.offerExpiresAt || null,
          diagnostic: null,
        });
      },
      dispatchReset: (payload) => {
        if (Number(payload?.requestId) !== requestId) return;
        setDispatch({
          phase: 'expanding',
          radiusKm: Number(payload.radiusKm) || 2,
          offerExpiresAt: null,
          diagnostic: null,
        });
      },
      rideAccepted: (payload) => {
        if (Number(payload?.requestId) === requestId) openTrip(payload.tripId);
      },
      driverCancelledRide: () => {
        setDispatch({ phase: 'expanding', radiusKm: 2, offerExpiresAt: null, diagnostic: null });
        refresh().catch(() => {});
      },
    },
  });

  useEffect(() => {
    let stopped = false;
    async function poll() {
      try {
        await refresh();
      } catch (error) {
        if (!stopped) setStatus(translateApiError(error, t, t('dispatch.customer.refreshFailed')));
      }
    }
    poll();
    const timer = window.setInterval(poll, 2000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [refresh, t]);

  const routePoints = useMemo(() => route ? [
    {
      key: 'pickup',
      label: route.pickup.name,
      meta: route.pickup.address,
      position: route.pickup.position,
      type: 'pickup',
    },
    {
      key: 'destination',
      label: route.destination.name,
      meta: route.destination.address,
      position: route.destination.position,
      type: 'destination',
    },
  ] : [], [route]);

  async function cancel() {
    if (!requestId || cancelling) return;
    setCancelling(true);
    try {
      await cancelRideRequest(requestId);
      navigate('/home', { replace: true });
    } catch (error) {
      setStatus(translateApiError(error, t, t('dispatch.customer.cancelFailed')));
      setCancelling(false);
    }
  }

  if (!route) {
    return (
      <PageShell>
        <main className="search-screen">
          <Topbar />
          <p className="empty-state">{t('dispatch.customer.inactive')}</p>
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <main className="search-screen">
        <Topbar>
          <div className="location-chip" aria-label={t('dispatch.customer.pickupLabel')}>
            <span className="location-dot" aria-hidden="true" />
            <span>{route.pickup.address || route.pickup.name}</span>
          </div>
        </Topbar>
        <section className="map-stage" aria-label={t('dispatch.customer.mapLabel')}>
          <InteractiveRouteMap
            alternateRoutePath={[]}
            className="search-background-map"
            currentLocation={pickup}
            fitToRoute
            interactive
            mapCenter={pickup}
            mapZoom={15}
            nearbyDrivers={[]}
            route={routePoints}
            routePath={route.routePath}
            routeSummary={route.routeMetrics
              ? `${route.routeMetrics.distance || ''} - ${route.routeMetrics.duration || ''}`
              : ''}
            scrollWheelZoom
            showControls
            showCurrentLocation
            showDetails={false}
            showDriver={false}
            showMarkers
            showRoute={Boolean(route.routePath?.length)}
          />
          <section className="status-card" aria-labelledby="search-title">
            <div className="status-info">
              <div className="spinner" aria-hidden="true" />
              <div className="text-group">
                <div className="waiting-title-row">
                  <h1 id="search-title">{t('dispatch.customer.title')}</h1>
                </div>
                <p>
                  {dispatch.phase === 'waiting_driver'
                    ? t('dispatch.customer.waiting', { radius: dispatch.radiusKm })
                    : t('dispatch.customer.expanding', { radius: dispatch.radiusKm })}
                </p>
                {dispatch.phase === 'expanding' && dispatch.diagnostic
                  ? <small>{t(`dispatch.diagnostic.${dispatch.diagnostic}`)}</small>
                  : null}
                {status ? <small role="alert">{status}</small> : null}
              </div>
            </div>
            <div className="card-actions">
              <button className="reservation-cancel-button" disabled={cancelling} onClick={cancel} type="button">
                {cancelling ? t('common.cancelling') : t('dispatch.customer.cancelReservation')}
              </button>
            </div>
          </section>
        </section>
      </main>
    </PageShell>
  );
}
