import { useI18n } from '../i18n/I18nProvider.jsx';

export default function InvoiceTemplate({ invoice, id = 'invoice-print-area' }) {
  const { formatDateTime, formatNumber, t } = useI18n();
  if (!invoice) return null;
  const formatYen = (amount) => `¥${formatNumber(amount ?? 0)}`;
  const formatServiceDate = (iso) => iso
    ? formatDateTime(iso, { dateStyle: 'long', timeStyle: 'short' })
    : '-';
  const { amounts, lineItems = [], trip = {}, payment } = invoice;
  const vat = amounts?.jpy ?? {};
  const paymentLabel = payment
    ? (payment.lastFour
      ? t('payment.cardEnding', { brand: payment.method, lastFour: payment.lastFour })
      : payment.method)
    : '-';

  return (
    <div className="zip-invoice-paper" id={id}>
      <header>
        <div className="invoice-brand">🚕 JP TAXI</div>
        <div>
          <h1>{t('invoice.receipt')}</h1>
          <p>NO. {invoice.invoiceNumber}</p>
        </div>
      </header>

      <div className="invoice-details-grid">
        <article>
          <span>{t('invoice.serviceTime')}</span>
          <strong>{formatServiceDate(trip.endTime || trip.startTime)}</strong>
        </article>
        <article>
          <span>{t('invoice.paymentMethod')}</span>
          <strong>{paymentLabel}</strong>
        </article>
        <article>
          <span>{t('location.pickup')}</span>
          <strong>{trip.pickupAddress}</strong>
        </article>
        <article>
          <span>{t('invoice.dropoff')}</span>
          <strong>{trip.dropoffAddress}</strong>
        </article>
      </div>

      <table className="zip-invoice-table">
        <thead>
          <tr><th>{t('invoice.item')}</th><th>{t('invoice.amountJpy')}</th></tr>
        </thead>
        <tbody>
          {lineItems.map((row) => {
            let label = row.label || row.labelJa;
            if (row.code === 'TAXI_FARE') {
              label = t('invoice.taxiFare', { distance: formatNumber(trip.distanceKm) });
            } else if (row.code === 'SERVICE_FEE') {
              label = t('invoice.serviceFee');
            }
            return (
              <tr key={row.code}>
                <td>{label}</td>
                <td>{formatYen(row.amountJpy)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="invoice-summary">
        <div className="qr-code"><span /></div>
        <div>
          <span>{t('invoice.total')}</span>
          <strong>{formatYen(vat.totalInclTax)}</strong>
          <small>{t('invoice.vatIncluded', { rate: vat.vatRatePercent, amount: formatNumber(vat.vatAmount) })}</small>
        </div>
      </div>
    </div>
  );
}
