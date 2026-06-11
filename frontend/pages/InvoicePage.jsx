import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  downloadTripInvoicePdf,
  emailTripInvoice,
  getTripInvoice,
  issueTripInvoice,
} from '../api/invoices.js';
import InvoiceTemplate from '../components/InvoiceTemplate.jsx';
import PageShell from '../components/PageShell.jsx';
import { getLastInvoiceTripId, setLastInvoiceTripId } from '../utils/invoiceSession.js';
import '../styles/app-pages.css';
import { getAuthRole } from '../utils/session.js';

export default function InvoicePage() {
  const [searchParams] = useSearchParams();
  const role = getAuthRole();
  const tripId =
    Number(searchParams.get('tripId')) ||
    getLastInvoiceTripId() ||
    Number(sessionStorage.getItem('jpTaxiTripId')) ||
    null;
  const [invoice, setInvoice] = useState(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(Boolean(tripId));
  const [status, setStatus] = useState('');

  useEffect(() => {
    let ignored = false;
    if (!tripId) {
      setStatus('No completed trip was selected.');
      return undefined;
    }
    setLastInvoiceTripId(tripId);
    getTripInvoice(tripId)
      .then(async (payload) => {
        const next = payload.canIssue
          ? (await issueTripInvoice(tripId)).invoice
          : payload;
        if (!ignored) {
          setInvoice(next);
          setEmail(next.recipientEmail || next.buyer?.email || '');
        }
      })
      .catch((error) => {
        if (!ignored) setStatus(error.message || 'Unable to load the invoice.');
      })
      .finally(() => {
        if (!ignored) setLoading(false);
      });
    return () => {
      ignored = true;
    };
  }, [tripId]);

  async function downloadPdf() {
    setStatus('');
    try {
      const blob = await downloadTripInvoicePdf(tripId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${invoice.invoiceNumber}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setStatus(error.message || 'Unable to download the PDF.');
    }
  }

  async function sendEmail() {
    setStatus('');
    try {
      const result = await emailTripInvoice(tripId, {
        recipientEmail: email || undefined,
      });
      setStatus(result.message || 'Invoice email sent.');
    } catch (error) {
      setStatus(error.message || 'Unable to send the invoice.');
    }
  }

  const closePath = role === 'driver' ? '/driver-home' : '/driver-review';

  return (
    <PageShell withFooter={false}>
      <main className="invoice-screen">
        <section className="zip-invoice-container">
          {loading ? <p className="invoice-loading" role="status">Loading invoice...</p> : null}
          {!loading && invoice ? <InvoiceTemplate invoice={invoice} /> : null}
          {!loading && !invoice ? <p className="empty-state">{status}</p> : null}
          {invoice ? (
            <>
              <label className="payment-field">
                Recipient email
                <input
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  value={email}
                />
              </label>
              <div className="invoice-actions">
                <button onClick={downloadPdf} type="button">Download PDF</button>
                <button onClick={sendEmail} type="button">Send email</button>
              </div>
            </>
          ) : null}
          {status && invoice ? <p className="payment-status-text" role="status">{status}</p> : null}
          <Link className="invoice-close" to={closePath}>
            {role === 'driver' ? 'Close' : 'Rate driver'}
          </Link>
        </section>
      </main>
    </PageShell>
  );
}
