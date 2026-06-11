import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getPaymentMethods } from '../api/customers.js';
import { getActiveRide, processRidePayment } from '../api/rides.js';
import PageShell from '../components/PageShell.jsx';
import { setLastInvoiceTripId } from '../utils/invoiceSession.js';
import { buildPaymentPayload } from '../utils/payment.js';
import '../styles/app-pages.css';

function formatVnd(amount) {
  return `${new Intl.NumberFormat('vi-VN').format(Number(amount) || 0)} VND`;
}

function formatTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [methods, setMethods] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const selectedMethod = useMemo(
    () => methods.find((item) => String(item.paymentMethodId) === selectedId) ?? null,
    [methods, selectedId],
  );

  useEffect(() => {
    let ignored = false;
    Promise.all([getActiveRide(), getPaymentMethods()])
      .then(([activeRide, paymentMethods]) => {
        if (ignored) return;
        if (activeRide?.type !== 'trip') {
          setStatus('There is no active trip ready for payment.');
          return;
        }
        const nextTrip = activeRide.data;
        const nextMethods = Array.isArray(paymentMethods) ? paymentMethods : [];
        setTrip(nextTrip);
        setMethods(nextMethods);
        const preferred = nextMethods.find((item) => item.isDefault) ?? nextMethods[0];
        setSelectedId(preferred ? String(preferred.paymentMethodId) : '');
        sessionStorage.setItem('jpTaxiTripId', String(nextTrip.tripId));
      })
      .catch((error) => setStatus(error.message || 'Unable to load payment details.'))
      .finally(() => {
        if (!ignored) setLoading(false);
      });
    return () => {
      ignored = true;
    };
  }, []);

  async function confirmPayment(event) {
    event.preventDefault();
    if (submitting) return;
    setStatus('');
    setSubmitting(true);
    try {
      const payload = buildPaymentPayload({
        tripId: trip?.tripId,
        paymentMethod: selectedMethod,
        password,
      });
      await processRidePayment(payload);
      setLastInvoiceTripId(trip.tripId);
      navigate(`/invoice?tripId=${trip.tripId}`, { replace: true });
    } catch (error) {
      setStatus(error.message || 'Payment failed.');
      setSubmitting(false);
    }
  }

  const request = trip?.rideRequest;

  return (
    <PageShell withFooter={false}>
      <main className="payment-complete-screen">
        <section className="receipt-card">
          <header className="receipt-header">
            <span>JP Taxi</span>
            <h1>Trip payment</h1>
            <p>Confirm the real trip details before paying.</p>
          </header>

          <div className="receipt-body">
            {loading ? <p role="status">Loading payment details...</p> : null}
            {!loading && !trip ? <p className="empty-state">{status || 'No trip found.'}</p> : null}
            {trip ? (
              <form onSubmit={confirmPayment}>
                <section className="receipt-route">
                  <div>
                    <span className="route-dot green" />
                    <div>
                      <strong>{request?.pickupAddress}</strong>
                      <small>{formatTime(trip.startTime)} departure</small>
                    </div>
                  </div>
                  <div>
                    <span className="route-dot dark" />
                    <div>
                      <strong>{request?.dropoffAddress}</strong>
                      <small>{Number(trip.actualDistanceKm).toFixed(1)} km</small>
                    </div>
                  </div>
                </section>

                <section className="receipt-billing">
                  <div>
                    <span>Trip fare</span>
                    <strong>{formatVnd(trip.rawFareVnd ?? trip.finalFareVnd)}</strong>
                  </div>
                  <div className="receipt-total">
                    <span>Total</span>
                    <strong>{formatVnd(trip.finalFareVnd)}</strong>
                  </div>
                </section>

                <label className="payment-field">
                  Saved payment method
                  <select
                    value={selectedId}
                    onChange={(event) => setSelectedId(event.target.value)}
                    required
                  >
                    <option value="">Select a payment method</option>
                    {methods.map((item) => (
                      <option key={item.paymentMethodId} value={item.paymentMethodId}>
                        {item.brand} ending in {item.lastFour}
                      </option>
                    ))}
                  </select>
                </label>

                {!methods.length ? (
                  <p className="empty-state">
                    Add a payment method in <Link to="/user-info/payment">account settings</Link>.
                  </p>
                ) : null}

                <label className="payment-field">
                  Account password
                  <input
                    autoComplete="current-password"
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    type="password"
                    value={password}
                  />
                </label>

                {status ? <p className="payment-status-text" role="alert">{status}</p> : null}
                <div className="receipt-actions">
                  <Link className="payment-back-link" to="/ride-status">Back</Link>
                  <button
                    className="pay-confirm"
                    disabled={submitting || !selectedMethod}
                    type="submit"
                  >
                    {submitting ? 'Processing...' : 'Pay now'}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </section>
      </main>
    </PageShell>
  );
}
