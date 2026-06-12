import { useI18n } from '../i18n/I18nProvider.jsx';

export default function InvoiceTemplate({ invoice, id = 'invoice-print-area' }) {
  const { formatDateTime, formatNumber, t } = useI18n();
  if (!invoice) return null;
  const formatYen = (amount) => `¥${formatNumber(amount ?? 0)}`;
  const formatVnd = (amount) => `${formatNumber(amount ?? 0)} VND`;
  const formatServiceDate = (iso) => iso
    ? formatDateTime(iso, { dateStyle: 'medium', timeStyle: 'short' })
    : '-';
  const { amounts, lineItems = [], trip = {}, payment, seller = {} } = invoice;
  const vat = amounts?.jpy ?? {};
  const paymentLabel = payment
    ? (payment.lastFour
      ? t('payment.cardEnding', { brand: payment.method, lastFour: payment.lastFour })
      : payment.method)
    : '-';

  return (
    <div className="zip-invoice-paper" id={id}>
      <header>
        <div className="invoice-brand">JP TAXI</div>
        <div>
          <h1>{invoice.title || t('invoice.receipt')}</h1>
          <p>NO. {invoice.invoiceNumber}</p>
          {invoice.issued ? <p className="invoice-issued-badge">{t('invoice.issued')}</p> : null}
        </div>
      </header>

      <div className="invoice-seller-block">
        <span>{seller.legalName || seller.legalNameJa}</span>
        <small>{seller.taxCode} · {seller.address || seller.addressJa}</small>
      </div>

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
          {lineItems.map((row) => (
            <tr key={row.code}>
              <td>{row.label || row.labelJa}</td>
              <td>{formatYen(row.amountJpy)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="invoice-vat-note">
        <span>{t('invoice.reference')}: {formatVnd(amounts?.vnd?.totalInclTax)}</span>
        <span>{t('invoice.vatIncluded', { rate: vat.vatRatePercent })}</span>
      </div>

      <div className="invoice-summary">
        <div>
          <span>{t('invoice.total')}</span>
          <strong>{formatYen(vat.totalInclTax)}</strong>
          <small>VAT: {formatYen(vat.vatAmount)}</small>
        </div>
      </div>

      {invoice.buyer ? (
        <footer className="invoice-buyer-footer">
          <span>{t('common.customer')}</span>
          <strong>{invoice.buyer.name}</strong>
        </footer>
      ) : null}
    </div>
  );
}
