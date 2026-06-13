import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createRideRequest, estimateRide, getActiveRide } from '../api/rides.js';
import { resolveAssetUrl } from '../api/accounts.js';
import InteractiveRouteMap from '../components/InteractiveRouteMap.jsx';
import Footer from '../components/Footer.jsx';
import PageShell from '../components/PageShell.jsx';
import Topbar from '../components/Topbar.jsx';
import Modal from '../components/Modal.jsx';
import { useI18n } from '../i18n/I18nProvider.jsx';
import '../styles/booking.css';

function readSelectedRoute() {
  try {
    const route = JSON.parse(sessionStorage.getItem('jpTaxiSelectedRoute') || 'null');
    return (
      Array.isArray(route?.pickup?.position) &&
      Array.isArray(route?.destination?.position) &&
      Array.isArray(route?.routePath) &&
      route.routePath.length
    ) ? route : null;
  } catch {
    return null;
  }
}

export default function BillConfirmPage() {
  const navigate = useNavigate();
  const { formatNumber, t } = useI18n();
  const formatVnd = (value) => `${formatNumber(Number(value) || 0)} VND`;
  const [selectedRoute] = useState(readSelectedRoute);
  const [estimate, setEstimate] = useState(null);
  const [bookingMode, setBookingMode] = useState('self');
  const [proxyPassenger, setProxyPassenger] = useState({ name: '', phone: '' });
  const [noteToDriver, setNoteToDriver] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [createdRequest, setCreatedRequest] = useState(null);

  useEffect(() => {
    let ignored = false;
    import('../api/customers.js').then(({ fetchCustomerProfile }) => {
      fetchCustomerProfile()
        .then(data => { if (!ignored && data) setProfile(data); })
        .catch(() => {});
    });
    return () => { ignored = true; };
  }, []);

  useEffect(() => {
    if (!selectedRoute) return;
    const [startLat, startLng] = selectedRoute.pickup.position;
    const [endLat, endLng] = selectedRoute.destination.position;
    estimateRide({ startLat, startLng, endLat, endLng, vehicleType: '4' })
      .then(setEstimate)
      .catch(() => setStatus(t('booking.estimateFailed')));
  }, [selectedRoute, t]);

  const routePoints = useMemo(() => selectedRoute ? [
    {
      key: 'pickup',
      label: selectedRoute.pickup.name,
      meta: selectedRoute.pickup.address,
      position: selectedRoute.pickup.position,
      type: 'pickup',
    },
    {
      key: 'destination',
      label: selectedRoute.destination.name,
      meta: selectedRoute.destination.address,
      position: selectedRoute.destination.position,
      type: 'destination',
    },
  ] : [], [selectedRoute]);
  const rawFareVnd = Number(estimate?.rawFareVnd ?? estimate?.fareVnd);
  const serviceFeeVnd = Number(
    estimate?.serviceFeeVnd
      ?? Math.max(0, Number(estimate?.fareVnd) - rawFareVnd),
  );
  const hasFareBreakdown =
    Number.isFinite(Number(estimate?.rawFareVnd))
    && Number.isFinite(Number(estimate?.serviceFeeVnd));

  async function confirmBooking() {
    if (!selectedRoute || !estimate || submitting) return;
    if (
      bookingMode === 'proxy' &&
      (!proxyPassenger.name.trim() || !proxyPassenger.phone.trim())
    ) {
      setStatus(t('booking.proxyRequired'));
      return;
    }
    setSubmitting(true);
    setStatus('');
    const [pickupLat, pickupLng] = selectedRoute.pickup.position;
    const [dropoffLat, dropoffLng] = selectedRoute.destination.position;
    try {
      let request;
      try {
        request = await createRideRequest({
          pickupAddress: selectedRoute.pickup.address || selectedRoute.pickup.name,
          pickupLat,
          pickupLng,
          dropoffAddress: selectedRoute.destination.address || selectedRoute.destination.name,
          dropoffLat,
          dropoffLng,
          vehicleType: '4',
          noteToDriver,
          actualPassengerName: bookingMode === 'proxy' ? proxyPassenger.name.trim() : undefined,
          actualPassengerPhone: bookingMode === 'proxy' ? proxyPassenger.phone.trim() : undefined,
        });
      } catch (error) {
        const active = await getActiveRide().catch(() => null);
        if (active?.type === 'request') request = active.data;
        else throw error;
      }
      sessionStorage.setItem('jpTaxiRideRequestId', String(request.requestId));
      setCreatedRequest(request);
      setShowSummaryModal(true);
      setSubmitting(false);
    } catch (error) {
      setStatus(t('booking.createFailed'));
      setSubmitting(false);
    }
  }

  if (!selectedRoute) {
    return (
      <PageShell>
        <main className="booking-screen">
          <Topbar brandTo="/home" actions={<><Link to="/home">{t('common.home')}</Link><Link to="/user-info/profile">{t('common.account')}</Link><Link to="/user-info/profile" className="topbar-avatar-link" aria-label={t('common.account')}><img className="topbar-avatar" src={resolveAssetUrl(profile?.avatarUrl)} alt="" /></Link></>} />
          <section className="empty-state">
            <p>{t('booking.noRoute')}</p>
            <Link to="/location-search">{t('booking.chooseDestination')}</Link>
          </section>
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <main className="booking-screen">
        <Topbar brandTo="/home" actions={<><Link to="/home">{t('common.home')}</Link><Link to="/user-info/profile">{t('common.account')}</Link><Link to="/user-info/profile" className="topbar-avatar-link" aria-label={t('common.account')}><img className="topbar-avatar" src={resolveAssetUrl(profile?.avatarUrl)} alt="" /></Link></>} />
        <section className="booking-layout booking-reference-layout">
          <section className="confirm-panel">
            <div className="page-heading">
              <h1>{t('booking.title')}</h1>
              <p>{t('booking.subtitle')}</p>
            </div>
            <section className="section-card">
              <h2>{t('booking.route')}</h2>
              <div className="route-list">
                <div className="route-point pickup"><span className="point-dot" /><div><span>{t('booking.departure')}</span><strong>{selectedRoute.pickup.name}</strong><small>{selectedRoute.pickup.address}</small></div></div>
                <div className="route-line" />
                <div className="route-point destination"><span className="point-dot" /><div><span>{t('location.destination')}</span><strong>{selectedRoute.destination.name}</strong><small>{selectedRoute.destination.address}</small></div></div>
              </div>
              {estimate ? (
                <div className="trip-summary">
                  <article><span>{t('booking.tripTime')}</span><strong>{t('common.current')}</strong></article>
                  <article><span>{t('booking.duration')}</span><strong>{Math.ceil(estimate.durationSeconds / 60)} min</strong></article>
                  <article><span>{t('location.distance')}</span><strong>{(estimate.distanceMeters / 1000).toFixed(1)} km</strong></article>
                </div>
              ) : <p role="status">{t('booking.calculating')}</p>}
            </section>
            {estimate ? (
              <section className="section-card">
                <h2>{t('booking.vehicle')}</h2>
                <div className="vehicle-card">
                  <span className="vehicle-icon" aria-hidden="true">🚖</span>
                  <div>
                    <strong>{t('booking.standard')}</strong>
                    <span>{t('booking.standardCopy')}</span>
                  </div>
                  <strong className="vehicle-price">{t('booking.seats')}</strong>
                </div>
              </section>
            ) : null}
            <section className="section-card">
              <label className="memo-field">
                <span>{t('booking.note')}</span>
                <textarea
                  onChange={(event) => setNoteToDriver(event.target.value)}
                  placeholder={t('booking.notePlaceholder')}
                  value={noteToDriver}
                />
              </label>
            </section>
            {estimate ? (
              <section className="section-card fare-card">
                <h2>{t('booking.fareDetails')}</h2>
                {hasFareBreakdown && (
                  <dl>
                    <div><dt>{t('booking.tripFare')}</dt><dd>{formatVnd(rawFareVnd)}</dd></div>
                    <div><dt>{t('booking.bookingFee')}</dt><dd>{formatVnd(serviceFeeVnd)}</dd></div>
                  </dl>
                )}
                <div className="total-row">
                  <span>{t('booking.total')}</span>
                  <strong>{formatVnd(estimate.fareVnd)}</strong>
                </div>
              </section>
            ) : null}
            <div className="booking-mode">
              <button aria-label={t('booking.forMe')} className={bookingMode === 'self' ? 'mode-button active' : 'mode-button'} onClick={() => setBookingMode('self')} type="button">{t('booking.forMe')}</button>
              <button aria-label={t('booking.forOther')} className={bookingMode === 'proxy' ? 'mode-button active' : 'mode-button'} onClick={() => setBookingMode('proxy')} type="button">{t('booking.forOther')}</button>
            </div>
            {bookingMode === 'proxy' ? (
              <section className="proxy-fields">
                <label><span>{t('booking.passengerName')}</span><input value={proxyPassenger.name} placeholder={t('booking.passengerNamePlaceholder')} onChange={(event) => setProxyPassenger((value) => ({ ...value, name: event.target.value }))} /></label>
                <label><span>{t('booking.passengerPhone')}</span><input value={proxyPassenger.phone} placeholder={t('booking.passengerPhonePlaceholder')} onChange={(event) => setProxyPassenger((value) => ({ ...value, phone: event.target.value }))} /></label>
              </section>
            ) : null}
            {status ? <p className="payment-status-text" role="alert">{status}</p> : null}
            <div className="action-row">
              <Link className="secondary-button" to="/location-search">{t('common.back')}</Link>
              <button aria-label={t('booking.confirm')} className="primary-button" disabled={!estimate || submitting} onClick={confirmBooking} type="button">
                {submitting ? t('booking.confirming') : t('booking.confirm')}
              </button>
            </div>
          </section>
          <section className="map-panel booking-route-map">
            <InteractiveRouteMap
              alternateRoutePath={[]}
              currentLocation={selectedRoute.pickup.position}
              fitToRoute
              interactive
              mapCenter={selectedRoute.pickup.position}
              route={routePoints}
              routePath={estimate?.path || selectedRoute.routePath}
              routeSummary={estimate ? `${(estimate.distanceMeters / 1000).toFixed(1)} km` : ''}
              scrollWheelZoom
              showControls
              showCurrentLocation
              showDriver={false}
            />
          </section>
        </section>
      </main>
      <Modal open={showSummaryModal} onClose={() => setShowSummaryModal(false)} title={t('reservation.title')}>
        {createdRequest ? (
          <div style={{ padding: '0 24px 24px' }}>
            <div className="route-list" style={{ marginBottom: '28px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e5eaf0', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
              <div className="route-point pickup">
                <span className="point-dot" />
                <div>
                  <span>{t('booking.departure')}</span>
                  <strong style={{ fontSize: '14px', color: '#1e293b' }}>{selectedRoute.pickup.name}</strong>
                  {selectedRoute.pickup.address && <small style={{ display: 'block', color: '#64748b', fontSize: '12px', marginTop: '2px', lineHeight: 1.3 }}>{selectedRoute.pickup.address}</small>}
                </div>
              </div>
              <div className="route-line" style={{ height: '24px', margin: '4px 0 4px 9px' }} />
              <div className="route-point destination">
                <span className="point-dot" />
                <div>
                  <span>{t('location.destination')}</span>
                  <strong style={{ fontSize: '14px', color: '#1e293b' }}>{selectedRoute.destination.name}</strong>
                  {selectedRoute.destination.address && <small style={{ display: 'block', color: '#64748b', fontSize: '12px', marginTop: '2px', lineHeight: 1.3 }}>{selectedRoute.destination.address}</small>}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '32px', padding: '20px 16px', background: 'linear-gradient(145deg, #ecfdf5, #d1fae5)', borderRadius: '16px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)' }}>
              <span style={{ display: 'block', fontSize: '13px', color: '#047857', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {t('booking.total')}
              </span>
              <strong style={{ display: 'block', fontSize: '32px', color: '#065f46', lineHeight: 1 }}>
                {formatVnd(Number(createdRequest.estimatedFareVnd))}
              </strong>
            </div>

            <div className="action-row" style={{ gap: '12px' }}>
              <button className="secondary-button" onClick={() => setShowSummaryModal(false)} type="button" style={{ background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: 700 }}>
                {t('common.close')}
              </button>
              <Link className="primary-button" to="/search-car" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                {t('reservation.findDriver')}
              </Link>
            </div>
          </div>
        ) : null}
      </Modal>
    </PageShell>
  );
}
