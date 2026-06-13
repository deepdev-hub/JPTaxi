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
import { useI18n } from '../i18n/I18nProvider.jsx';
import { translateApiError } from '../i18n/errors.js';

export default function InvoicePage() {
  const { t } = useI18n();
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
      setStatus(t('invoice.none'));
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
        if (!ignored) setStatus(translateApiError(error, t, t('invoice.loadFailed')));
      })
      .finally(() => {
        if (!ignored) setLoading(false);
      });
    return () => {
      ignored = true;
    };
  }, [tripId, t]);

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
      setStatus(translateApiError(error, t, t('invoice.downloadFailed')));
    }
  }

  async function sendEmail() {
    setStatus('');
    try {
      const result = await emailTripInvoice(tripId, {
        recipientEmail: email || undefined,
      });
      setStatus(t('invoice.emailSent'));
    } catch (error) {
      setStatus(translateApiError(error, t, t('invoice.emailFailed')));
    }
  }

  const closePath = role === 'driver' ? '/driver-home' : '/driver-review';

  return (
    <PageShell withFooter={false}>
      <main className="invoice-screen">
        <section className="zip-invoice-container">
          {loading ? <p className="invoice-loading" role="status">{t('invoice.loading')}</p> : null}
          {!loading && invoice ? <InvoiceTemplate invoice={invoice} /> : null}
          {!loading && !invoice ? <p className="empty-state">{status}</p> : null}
          {invoice ? (
            <div className="invoice-actions">
              <button onClick={downloadPdf} type="button">📄 {t('invoice.download')}</button>
              <button onClick={sendEmail} type="button">📧 {t('invoice.sendEmail')}</button>
            </div>
          ) : null}
          {status && invoice ? <p className="payment-status-text" role="status">{status}</p> : null}
          <Link className="invoice-close" to={closePath}>
            {t('common.close')}
          </Link>
        </section>
      </main>
    </PageShell>
  );
}
