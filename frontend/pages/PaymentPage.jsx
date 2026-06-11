import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getActiveRide, getFallbackRide, processRidePayment } from '../api/rides.js';
import PageShell from '../components/PageShell.jsx';
import { calculateTripFareBreakdown, formatYen } from '../utils/fare.js';
import { setLastInvoiceTripId } from '../utils/invoiceSession.js';
import '../styles/app-pages.css';

const paymentMethodMap = {
  'クレジットカード (**** 4821)': 'VISA',
  現金: 'VISA',
  PayPay: 'VNPAY',
  'Apple Pay': 'VISA',
};

function readSelectedDistance() {
  try {
    const route = JSON.parse(sessionStorage.getItem('jpTaxiSelectedRoute') || 'null');
    return route?.routeMetrics?.distance ?? 4.8;
  } catch {
    return 4.8;
  }
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [method, setMethod] = useState('クレジットカード (**** 4821)');
  const [methodOpen, setMethodOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [trip, setTrip] = useState(() => getFallbackRide()?.trip ?? null);
  const methods = ['クレジットカード (**** 4821)', '現金', 'PayPay', 'Apple Pay'];
  const fare = calculateTripFareBreakdown(trip, readSelectedDistance());
  const backPath =
    searchParams.get('from') === 'driver' || localStorage.getItem('jpTaxiRole') === 'driver'
      ? '/driver-ride-status'
      : '/ride-status';

  useEffect(() => {
    let ignored = false;
    getActiveRide()
      .then((activeRide) => {
        if (ignored || activeRide?.type !== 'trip') return;
        setTrip(activeRide.data);
        if (activeRide.data?.tripId) {
          sessionStorage.setItem('jpTaxiTripId', String(activeRide.data.tripId));
          setLastInvoiceTripId(activeRide.data.tripId);
        }
      })
      .catch(() => {
        if (!ignored) setTrip(getFallbackRide()?.trip ?? null);
      });
    return () => {
      ignored = true;
    };
  }, []);

  function clearActiveRideState() {
    sessionStorage.removeItem('jpTaxiRideRequestId');
    sessionStorage.removeItem('jpTaxiTripId');
    localStorage.removeItem('jpTaxiRideAccepted');
    localStorage.removeItem('jpTaxiPaymentRequested');
  }

  async function confirmPayment() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setStatus('');
    setMethodOpen(false);

    const tripId = Number(sessionStorage.getItem('jpTaxiTripId'));
    if (Number.isFinite(tripId) && tripId > 0) setLastInvoiceTripId(tripId);

    if (Number.isFinite(tripId) && tripId > 0 && backPath !== '/driver-ride-status') {
      try {
        await processRidePayment({
          tripId,
          paymentMethod: paymentMethodMap[method] || 'VISA',
          password: 'password123',
        });
      } catch (error) {
        setStatus(error.message || '支払い処理を完了できませんでした。');
        setIsSubmitting(false);
        return;
      }
    }

    clearActiveRideState();
    navigate(backPath === '/driver-ride-status' ? '/driver-ride-status' : '/driver-review');
  }

  return (
    <PageShell withFooter={false}>
      <main className="payment-complete-screen">
        <section className="receipt-card">
          <header className="receipt-header">
            <span>Arrived Safely</span>
            <h1>目的地に到着</h1>
            <p>乗車記録と料金の確認</p>
          </header>

          <div className="receipt-body">
            <section className="receipt-route">
              <div>
                <span className="route-dot green"></span>
                <div><strong>ホアンキエム湖</strong><small>18:30 出発</small></div>
              </div>
              <div>
                <span className="route-dot dark"></span>
                <div><strong>ロッテホテル ハノイ</strong><small>18:42 到着</small></div>
              </div>
            </section>

            <section className="receipt-billing">
              <div><span>基本運賃</span><strong>{formatYen(fare.baseFareJpy)}</strong></div>
              <div><span>距離加算 ({fare.distanceKm.toFixed(1)} km)</span><strong>{formatYen(fare.distanceFareJpy)}</strong></div>
              <div><span>予約手数料</span><strong>{formatYen(fare.reservationFeeJpy)}</strong></div>
              <div className="receipt-total"><span>お支払い合計</span><strong>{formatYen(fare.totalJpy)}</strong></div>
            </section>

            <section className="payment-preview">
              <div><span>💳</span><strong>{method}</strong></div>
              <button type="button" onClick={() => setMethodOpen(true)}>変更 〉</button>
            </section>

            <div className="receipt-actions">
              <Link className="payment-back-link" to={backPath}>戻る</Link>
              <button className="pay-confirm" type="button" onClick={confirmPayment} disabled={isSubmitting}>
                {isSubmitting ? '処理中...' : 'お支払いを確定する'}
              </button>
              <Link className="invoice-link" to="/invoice"><span>📄</span> 領収書を発行する</Link>
              <Link className="support-link" to="/messages/driver">お問い合わせはこちら</Link>
            </div>
            {status ? <p className="payment-status-text">{status}</p> : null}
          </div>
        </section>

        <div className={`payment-method-backdrop ${methodOpen ? 'open' : ''}`} onClick={() => setMethodOpen(false)}>
          <section className="payment-method-modal" role="dialog" aria-modal="true" aria-labelledby="payment-method-title" onClick={(event) => event.stopPropagation()}>
            <header>
              <h2 id="payment-method-title">支払い方法を選択</h2>
              <button type="button" aria-label="閉じる" onClick={() => setMethodOpen(false)}>×</button>
            </header>
            <div className="payment-method-list">
              {methods.map((item) => (
                <button className={method === item ? 'selected' : ''} type="button" key={item} onClick={() => setMethod(item)}>
                  <span>{item === '現金' ? '💵' : '💳'}</span>
                  <strong>{item}</strong>
                  <em>{method === item ? '選択中' : '選択'}</em>
                </button>
              ))}
            </div>
            <button className="payment-method-confirm" type="button" onClick={() => setMethodOpen(false)}>この方法にする</button>
          </section>
        </div>
      </main>
    </PageShell>
  );
}
