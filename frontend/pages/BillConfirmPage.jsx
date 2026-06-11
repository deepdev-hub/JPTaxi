import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createRideRequest, estimateRide, getActiveRide } from '../api/rides.js';
import InteractiveRouteMap from '../components/InteractiveRouteMap.jsx';
import Footer from '../components/Footer.jsx';
import PageShell from '../components/PageShell.jsx';
import Topbar from '../components/Topbar.jsx';
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

function formatVnd(value) {
  return `${new Intl.NumberFormat('vi-VN').format(Number(value) || 0)} VND`;
}

export default function BillConfirmPage() {
  const navigate = useNavigate();
  const [selectedRoute] = useState(readSelectedRoute);
  const [estimate, setEstimate] = useState(null);
  const [bookingMode, setBookingMode] = useState('self');
  const [proxyPassenger, setProxyPassenger] = useState({ name: '', phone: '' });
  const [noteToDriver, setNoteToDriver] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedRoute) return;
    const [startLat, startLng] = selectedRoute.pickup.position;
    const [endLat, endLng] = selectedRoute.destination.position;
    estimateRide({ startLat, startLng, endLat, endLng, vehicleType: '4' })
      .then(setEstimate)
      .catch((error) => setStatus(error.message || 'Unable to calculate the fare.'));
  }, [selectedRoute]);

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

  async function confirmBooking() {
    if (!selectedRoute || !estimate || submitting) return;
    if (
      bookingMode === 'proxy' &&
      (!proxyPassenger.name.trim() || !proxyPassenger.phone.trim())
    ) {
      setStatus('Enter the passenger name and phone number.');
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
      navigate('/search-car');
    } catch (error) {
      setStatus(error.message || 'Unable to create the ride request.');
      setSubmitting(false);
    }
  }

  if (!selectedRoute) {
    return (
      <PageShell>
        <main className="booking-screen">
          <Topbar />
          <section className="empty-state">
            <p>No route selected.</p>
            <Link to="/location-search">Choose a destination</Link>
          </section>
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell withFooter={false}>
      <main className="booking-screen booking-reference-screen">
        <Topbar brandTo="/home" />
        <section className="booking-layout booking-reference-layout">
          <section className="confirm-panel">
            <div className="page-heading">
              <h1>Confirm booking</h1>
              <p>Review the route and fare calculated by JP Taxi.</p>
            </div>
            <section className="section-card">
              <h2>Route</h2>
              <div className="route-list">
                <div className="route-point pickup"><span className="point-dot" /><div><strong>{selectedRoute.pickup.name}</strong><small>{selectedRoute.pickup.address}</small></div></div>
                <div className="route-line" />
                <div className="route-point destination"><span className="point-dot" /><div><strong>{selectedRoute.destination.name}</strong><small>{selectedRoute.destination.address}</small></div></div>
              </div>
              {estimate ? (
                <div className="trip-summary">
                  <article><span>Duration</span><strong>{Math.ceil(estimate.durationSeconds / 60)} min</strong></article>
                  <article><span>Distance</span><strong>{(estimate.distanceMeters / 1000).toFixed(1)} km</strong></article>
                  <article><span>Fare</span><strong>{formatVnd(estimate.fareVnd)}</strong></article>
                </div>
              ) : <p role="status">Calculating fare...</p>}
            </section>
            <section className="section-card">
              <label className="memo-field">
                <span>Note to driver</span>
                <textarea onChange={(event) => setNoteToDriver(event.target.value)} value={noteToDriver} />
              </label>
            </section>
            <div className="booking-mode">
              <button className={bookingMode === 'self' ? 'mode-button active' : 'mode-button'} onClick={() => setBookingMode('self')} type="button">For me</button>
              <button className={bookingMode === 'proxy' ? 'mode-button active' : 'mode-button'} onClick={() => setBookingMode('proxy')} type="button">For someone else</button>
            </div>
            {bookingMode === 'proxy' ? (
              <section className="section-card">
                <label>Passenger name<input value={proxyPassenger.name} onChange={(event) => setProxyPassenger((value) => ({ ...value, name: event.target.value }))} /></label>
                <label>Passenger phone<input value={proxyPassenger.phone} onChange={(event) => setProxyPassenger((value) => ({ ...value, phone: event.target.value }))} /></label>
              </section>
            ) : null}
            {status ? <p className="payment-status-text" role="alert">{status}</p> : null}
            <div className="action-row">
              <Link className="secondary-button" to="/location-search">Back</Link>
              <button className="primary-button" disabled={!estimate || submitting} onClick={confirmBooking} type="button">
                {submitting ? 'Booking...' : 'Confirm booking'}
              </button>
            </div>
          </section>
          <section className="map-panel booking-route-map">
            <InteractiveRouteMap
              alternateRoutePath={[]}
              currentLocation={selectedRoute.pickup.position}
              route={routePoints}
              routePath={estimate?.path || selectedRoute.routePath}
              routeSummary={estimate ? `${(estimate.distanceMeters / 1000).toFixed(1)} km` : ''}
              showCurrentLocation
              showDriver={false}
            />
          </section>
        </section>
      </main>
      <div className="booking-reference-footer"><Footer /></div>
    </PageShell>
  );
}
