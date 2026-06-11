function formatYen(amount) {
  return `¥${new Intl.NumberFormat('ja-JP').format(amount ?? 0)}`;
}

function formatVnd(amount) {
  return `${new Intl.NumberFormat('vi-VN').format(amount ?? 0)} VND`;
}

function formatServiceDate(iso) {
  if (!iso) return '-';
  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export default function InvoiceTemplate({ invoice, id = 'invoice-print-area' }) {
  if (!invoice) return null;
  const { amounts, lineItems = [], trip = {}, payment, seller = {} } = invoice;
  const vat = amounts?.jpy ?? {};
  const paymentLabel = payment
    ? `${payment.method}${payment.lastFour ? ` ending in ${payment.lastFour}` : ''}`
    : '-';

  return (
    <div className="zip-invoice-paper" id={id}>
      <header>
        <div className="invoice-brand">JP TAXI</div>
        <div>
          <h1>{invoice.title || 'Electronic receipt'}</h1>
          <p>NO. {invoice.invoiceNumber}</p>
          {invoice.issued ? <p className="invoice-issued-badge">Issued</p> : null}
        </div>
      </header>

      <div className="invoice-seller-block">
        <span>{seller.legalName || seller.legalNameJa}</span>
        <small>{seller.taxCode} · {seller.address || seller.addressJa}</small>
      </div>

      <div className="invoice-details-grid">
        <article>
          <span>Service time</span>
          <strong>{formatServiceDate(trip.endTime || trip.startTime)}</strong>
        </article>
        <article>
          <span>Payment method</span>
          <strong>{paymentLabel}</strong>
        </article>
        <article>
          <span>Pickup</span>
          <strong>{trip.pickupAddress}</strong>
        </article>
        <article>
          <span>Drop-off</span>
          <strong>{trip.dropoffAddress}</strong>
        </article>
      </div>

      <table className="zip-invoice-table">
        <thead>
          <tr><th>Item</th><th>Amount (JPY)</th></tr>
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
        <span>Reference: {formatVnd(amounts?.vnd?.totalInclTax)}</span>
        <span>VAT {vat.vatRatePercent}% included</span>
      </div>

      <div className="invoice-summary">
        <div>
          <span>Total</span>
          <strong>{formatYen(vat.totalInclTax)}</strong>
          <small>VAT: {formatYen(vat.vatAmount)}</small>
        </div>
      </div>

      {invoice.buyer ? (
        <footer className="invoice-buyer-footer">
          <span>Customer</span>
          <strong>{invoice.buyer.name}</strong>
        </footer>
      ) : null}
    </div>
  );
}
