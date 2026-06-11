function formatYen(amount) {
  return `¥${new Intl.NumberFormat('ja-JP').format(amount ?? 0)}`;
}

function formatVnd(amount) {
  return `${new Intl.NumberFormat('vi-VN').format(amount ?? 0)} ₫`;
}

function formatServiceDate(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/**
 * Mẫu hóa đơn / biên lai điện tử — nhận payload từ GET /trips/:id/invoice
 */
export default function InvoiceTemplate({ invoice, id = 'invoice-print-area' }) {
  if (!invoice) return null;

  const { amounts, lineItems, trip, payment, seller } = invoice;
  const vat = amounts?.jpy;

  return (
    <div className="zip-invoice-paper" id={id}>
      <header>
        <div className="invoice-brand">🚕 JP TAXI</div>
        <div>
          <h1>{invoice.title}</h1>
          <p>NO. {invoice.invoiceNumber}</p>
          {invoice.issued && (
            <p className="invoice-issued-badge">発行済 · Đã xuất HĐ VAT</p>
          )}
        </div>
      </header>

      <div className="invoice-seller-block">
        <span>{seller.legalNameJa}</span>
        <small>{seller.taxCode} · {seller.addressJa}</small>
      </div>

      <div className="invoice-details-grid">
        <article>
          <span>利用日時</span>
          <strong>{formatServiceDate(trip.serviceTime)}</strong>
        </article>
        <article>
          <span>決済方法</span>
          <strong>{payment?.methodLabelJa ?? '—'}</strong>
        </article>
        <article>
          <span>乗車場所</span>
          <strong>{trip.pickupAddress}</strong>
        </article>
        <article>
          <span>降車場所</span>
          <strong>{trip.dropoffAddress}</strong>
        </article>
      </div>

      <table className="zip-invoice-table">
        <thead>
          <tr>
            <th>項目</th>
            <th>金額 (JPY)</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((row) => (
            <tr key={row.code}>
              <td>{row.labelJa}</td>
              <td>{formatYen(row.amountJpy)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="invoice-vat-note">
        <span>参考 (VND): {formatVnd(amounts.vnd.totalInclTax)}</span>
        <span>Thuế GTGT {vat.vatRatePercent}% (đã bao gồm)</span>
      </div>

      <div className="invoice-summary">
        <div className="qr-code" aria-hidden="true" title={invoice.qrPayload}>
          <span></span>
        </div>
        <div>
          <span>領収金額 (税込)</span>
          <strong>{formatYen(vat.totalInclTax)}</strong>
          <small>
            （内消費税{vat.vatRatePercent}%：{formatYen(vat.vatAmount)}）
          </small>
        </div>
      </div>

      {invoice.buyer && (
        <footer className="invoice-buyer-footer">
          <span>お客様</span>
          <strong>{invoice.buyer.name}</strong>
        </footer>
      )}
    </div>
  );
}
