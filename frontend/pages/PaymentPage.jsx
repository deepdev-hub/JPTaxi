import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getPaymentMethods } from '../api/customers.js';
import { getActiveRide, processRidePayment } from '../api/rides.js';
import PageShell from '../components/PageShell.jsx';
import { setLastInvoiceTripId } from '../utils/invoiceSession.js';
import { buildPaymentPayload } from '../utils/payment.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { translateApiError } from '../i18n/errors.js';
import '../styles/app-pages.css';

const simulatedMethods = [
  { key: 'simulated-cash', code: 'CASH', labelKey: 'payment.cash', icon: '$' },
  { key: 'simulated-paypay', code: 'PAYPAY', label: 'PayPay', icon: 'P' },
  { key: 'simulated-apple-pay', code: 'APPLE_PAY', label: 'Apple Pay', icon: 'A' },
];

export default function PaymentPage() {
  const navigate = useNavigate();
  const { formatDateTime, formatNumber, t } = useI18n();
  const formatVnd = (amount) => `${formatNumber(Number(amount) || 0)} VND`;
  const formatTime = (value) => value ? formatDateTime(value, {
    hour: '2-digit',
    minute: '2-digit',
  }) : '';
  const [trip, setTrip] = useState(null);
  const [methods, setMethods] = useState([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [methodOpen, setMethodOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const paymentOptions = useMemo(() => [
    ...methods.map((item) => ({
      ...item,
      key: `card-${item.paymentMethodId}`,
      code: item.brand,
      label: t('payment.cardEnding', { brand: item.brand, lastFour: item.lastFour }),
      icon: 'C',
    })),
    ...simulatedMethods.map((item) => ({
      ...item,
      label: item.labelKey ? t(item.labelKey) : item.label,
    })),
  ], [methods, t]);
  const selectedMethod = useMemo(
    () => paymentOptions.find((item) => item.key === selectedKey) ?? null,
    [paymentOptions, selectedKey],
  );

  useEffect(() => {
    let ignored = false;
    Promise.all([getActiveRide(), getPaymentMethods()])
      .then(([activeRide, paymentMethods]) => {
        if (ignored) return;
        if (activeRide?.type !== 'trip') {
          setStatus(t('payment.noTrip'));
          return;
        }
        if (!activeRide.paymentRequested) {
          setStatus(t('payment.notRequested'));
          return;
        }
        const nextTrip = activeRide.data;
        const nextMethods = Array.isArray(paymentMethods) ? paymentMethods : [];
        setTrip(nextTrip);
        setMethods(nextMethods);
        const preferred = nextMethods.find((item) => item.isDefault) ?? nextMethods[0];
        setSelectedKey(preferred ? `card-${preferred.paymentMethodId}` : 'simulated-cash');
        sessionStorage.setItem('jpTaxiTripId', String(nextTrip.tripId));
      })
      .catch((error) => setStatus(translateApiError(error, t, t('payment.loadFailed'))))
      .finally(() => {
        if (!ignored) setLoading(false);
      });
    return () => {
      ignored = true;
    };
  }, [t]);

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
      setStatus(translateApiError(error, t, t('payment.failed')));
      setSubmitting(false);
    }
  }

  const request = trip?.rideRequest;

  return (
    <PageShell withFooter={false}>
      <main className="payment-complete-screen">
        <section className="receipt-card">
          <header className="receipt-header">
            <span>{t('payment.arrived')}</span>
            <h1>{t('payment.destinationReached')}</h1>
            <p>{t('payment.review')}</p>
          </header>

          <div className="receipt-body">
            {loading ? <p role="status">{t('payment.loading')}</p> : null}
            {!loading && !trip ? <p className="empty-state">{status || t('payment.noTrip')}</p> : null}
            {trip ? (
              <form onSubmit={confirmPayment}>
                <section className="receipt-route">
                  <div>
                    <span className="route-dot green" />
                    <div>
                      <strong>{request?.pickupAddress}</strong>
                      <small>{formatTime(trip.startTime)} {t('payment.departure')}</small>
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
                    <span>{t('booking.tripFare')}</span>
                    <strong>{formatVnd(trip.rawFareVnd ?? trip.finalFareVnd)}</strong>
                  </div>
                  <div>
                    <span>{t('payment.serviceFee')}</span>
                    <strong>
                      {formatVnd(
                        Math.max(
                          0,
                          Number(trip.finalFareVnd) - Number(trip.rawFareVnd ?? trip.finalFareVnd),
                        ),
                      )}
                    </strong>
                  </div>
                  <div className="receipt-total">
                    <span>{t('payment.total')}</span>
                    <strong>{formatVnd(trip.finalFareVnd)}</strong>
                  </div>
                </section>

                <section className="payment-preview">
                  <div>
                    <span aria-hidden="true">{selectedMethod?.icon || 'C'}</span>
                    <strong>{selectedMethod?.label || t('payment.chooseMethod')}</strong>
                  </div>
                  <button onClick={() => setMethodOpen(true)} type="button">{t('payment.change')}</button>
                </section>

                {selectedMethod?.code !== 'CASH' && (
                  <label className="payment-field">
                    {t('payment.accountPassword')}
                    <input
                      autoComplete="current-password"
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      type="password"
                      value={password}
                    />
                  </label>
                )}

                {status ? <p className="payment-status-text" role="alert">{status}</p> : null}
                <div className="receipt-actions">
                  <Link className="payment-back-link" to="/ride-status">{t('common.back')}</Link>
                  <button
                    aria-label={t('payment.confirm')}
                    className="pay-confirm"
                    disabled={submitting || !selectedMethod}
                    type="submit"
                  >
                    {submitting ? t('common.processing') : t('payment.confirm')}
                  </button>
                  <Link className="support-link" to="/messages/driver">{t('payment.contactSupport')}</Link>
                </div>
              </form>
            ) : null}
          </div>
        </section>

        <div
          className={`payment-method-backdrop ${methodOpen ? 'open' : ''}`}
          onClick={() => setMethodOpen(false)}
        >
          <section
            aria-labelledby="payment-method-title"
            aria-modal="true"
            className="payment-method-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header>
              <h2 id="payment-method-title">{t('payment.chooseMethod')}</h2>
              <button
                aria-label={t('common.close')}
                onClick={() => setMethodOpen(false)}
                type="button"
              >
                x
              </button>
            </header>
            <div className="payment-method-list">
              {paymentOptions.map((item) => (
                <button
                  aria-label={item.label}
                  className={selectedKey === item.key ? 'selected' : ''}
                  key={item.key}
                  onClick={() => setSelectedKey(item.key)}
                  type="button"
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <strong>{item.label}</strong>
                  <em>{selectedKey === item.key ? t('common.selected') : t('common.select')}</em>
                </button>
              ))}
            </div>
            <button
              className="payment-method-confirm"
              onClick={() => setMethodOpen(false)}
              type="button"
            >
              {t('payment.useMethod')}
            </button>
          </section>
        </div>
      </main>
    </PageShell>
  );
}
