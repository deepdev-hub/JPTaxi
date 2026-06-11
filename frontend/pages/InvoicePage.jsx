import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getTripInvoice } from '../api/invoices.js';
import InvoiceTemplate from '../components/InvoiceTemplate.jsx';
import PageShell from '../components/PageShell.jsx';
import {
  calculateTripFareBreakdown,
  JPY_TO_VND_RATE,
} from '../utils/fare.js';
import { getLastInvoiceTripId, setLastInvoiceTripId } from '../utils/invoiceSession.js';
import '../styles/app-pages.css';

function readStoredRoute() {
  try {
    return JSON.parse(sessionStorage.getItem('jpTaxiSelectedRoute') || 'null') || {};
  } catch {
    return {};
  }
}

function inclusiveVat(total) {
  return Math.round(Number(total || 0) - Number(total || 0) / 1.1);
}

function buildFallbackInvoice(tripId) {
  const route = readStoredRoute();
  const fare = calculateTripFareBreakdown(null, route.routeMetrics?.distance ?? 4.8);
  const vatJpy = inclusiveVat(fare.totalJpy);
  const vatVnd = inclusiveVat(fare.totalFareVnd);

  return {
    tripId,
    invoiceNumber: `JPT-${tripId || 'PREVIEW'}`,
    title: '電子領収書',
    seller: {
      legalNameJa: 'JP TAXI',
      taxCode: 'JP TAXI',
      addressJa: 'Hanoi, Vietnam',
    },
    trip: {
      pickupAddress: route.pickup?.name || '出発地',
      dropoffAddress: route.destination?.name || '目的地',
      distanceKm: fare.distanceKm,
      serviceTime: new Date().toISOString(),
    },
    payment: null,
    lineItems: [
      { code: 'BASE_FARE', labelJa: '基本運賃', amountJpy: fare.baseFareJpy },
      { code: 'DISTANCE_FARE', labelJa: `距離加算 (${fare.distanceKm.toFixed(1)} km)`, amountJpy: fare.distanceFareJpy },
      { code: 'SERVICE_FEE', labelJa: '予約手数料', amountJpy: fare.reservationFeeJpy },
    ],
    amounts: {
      jpy: {
        totalInclTax: fare.totalJpy,
        vatAmount: vatJpy,
        vatRatePercent: 10,
      },
      vnd: {
        totalInclTax: fare.totalFareVnd,
        vatAmount: vatVnd,
        vatRatePercent: 10,
      },
      exchangeRateVndToJpy: JPY_TO_VND_RATE,
    },
    qrPayload: `JPTAXI|${tripId || 'PREVIEW'}|${fare.totalJpy}|JPY`,
  };
}

export default function InvoicePage() {
  const location = useLocation();
  const isDriver = localStorage.getItem('jpTaxiRole') === 'driver' || location.pathname.startsWith('/driver');
  const closePath = isDriver ? '/driver-home' : '/driver-review';
  const closeLabel = isDriver ? '閉じる' : 'ドライバー評価へ';
  const tripId = getLastInvoiceTripId() || Number(sessionStorage.getItem('jpTaxiTripId')) || null;
  const fallbackInvoice = useMemo(() => buildFallbackInvoice(tripId), [tripId]);
  const [invoice, setInvoice] = useState(null);
  const [status, setStatus] = useState('');
  const displayedInvoice = invoice || (!tripId ? fallbackInvoice : null);

  useEffect(() => {
    let ignored = false;
    if (!tripId) return undefined;
    setLastInvoiceTripId(tripId);
    getTripInvoice(tripId)
      .then((payload) => {
        if (!ignored) setInvoice(payload);
      })
      .catch((error) => {
        if (!ignored) setStatus(error.message || '領収書を取得できませんでした。');
      });
    return () => {
      ignored = true;
    };
  }, [tripId]);

  return (
    <PageShell withFooter={false}>
      <main className="invoice-screen">
        <section className="zip-invoice-container">
          {displayedInvoice ? <InvoiceTemplate invoice={displayedInvoice} /> : <p className="invoice-loading">領収書を読み込んでいます...</p>}
          {status ? <p className="payment-status-text">{status}</p> : null}
          <div className="invoice-actions">
            <button type="button">📄 PDF保存</button>
            <button type="button">📧 メールで送信</button>
          </div>
          <Link className="invoice-close" to={closePath}>{closeLabel}</Link>
        </section>
      </main>
    </PageShell>
  );
}
