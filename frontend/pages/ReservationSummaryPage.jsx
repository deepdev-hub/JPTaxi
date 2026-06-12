import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getActiveRide } from '../api/rides.js';
import PageShell from '../components/PageShell.jsx';
import Topbar from '../components/Topbar.jsx';
import { useI18n } from '../i18n/I18nProvider.jsx';
import '../styles/app-pages.css';

function readSelectedRoute() {
  try {
    return JSON.parse(sessionStorage.getItem('jpTaxiSelectedRoute') || 'null');
  } catch {
    return null;
  }
}

export default function ReservationSummaryPage() {
  const { formatNumber, t } = useI18n();
  const formatVnd = (value) => `${formatNumber(Number(value) || 0)} VND`;
  const route = useMemo(readSelectedRoute, []);
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignored = false;
    getActiveRide()
      .then((activeRide) => {
        if (ignored) return;
        if (activeRide?.type !== 'request') {
          setError(t('reservation.none'));
          return;
        }
        setRequest(activeRide.data);
      })
      .catch((nextError) => {
        if (!ignored) {
          setError(t('reservation.loadFailed'));
        }
      })
      .finally(() => {
        if (!ignored) setLoading(false);
      });
    return () => {
      ignored = true;
    };
  }, [t]);

  const distanceKm = Number(route?.routeMetrics?.distanceMeters) / 1000;
  const durationMinutes = Math.max(
    1,
    Math.round(Number(route?.routeMetrics?.durationSeconds) / 60),
  );
  const totalFare = Number(request?.estimatedFareVnd);
  const rawFare = Number(request?.rawFareVnd ?? totalFare);
  const serviceFee = Math.max(0, totalFare - rawFare);

  return (
    <PageShell>
      <main className="app-screen reservation-summary-screen">
        <Topbar />
        <section className="app-shell">
          <div className="profile-header">
            <div>
              <h1>{t('reservation.title')}</h1>
              <p>{t('reservation.subtitle')}</p>
            </div>
          </div>

          {loading ? <p role="status">{t('reservation.loading')}</p> : null}
          {!loading && error ? (
            <section className="panel empty-state" role="alert">
              <p>{error}</p>
              <Link to="/location-search">{t('booking.chooseDestination')}</Link>
            </section>
          ) : null}

          {request ? (
            <div className="two-column-layout">
              <section className="panel">
                <h2 className="panel-title">{t('reservation.route')}</h2>
                <div className="route-line-card">
                  <div className="route-step">
                    <span className="step-dot">A</span>
                    <div>
                      <strong>{request.pickupAddress}</strong>
                      <span className="muted-small">{t('location.pickup')}</span>
                    </div>
                  </div>
                  <div className="route-step">
                    <span className="step-dot dark">B</span>
                    <div>
                      <strong>{request.dropoffAddress}</strong>
                      <span className="muted-small">{t('location.destination')}</span>
                    </div>
                  </div>
                </div>
                <div className="stat-grid stack">
                  <div className="stat-box">
                    <span>{t('location.distance')}</span>
                    <strong>
                      {Number.isFinite(distanceKm) ? `${distanceKm.toFixed(1)} km` : '-'}
                    </strong>
                  </div>
                  <div className="stat-box">
                    <span>{t('booking.duration')}</span>
                    <strong>
                      {Number.isFinite(durationMinutes) ? `${durationMinutes} min` : '-'}
                    </strong>
                  </div>
                  <div className="stat-box">
                    <span>{t('booking.vehicle')}</span>
                    <strong>{request.vehicleType === '4' ? t('booking.standard') : `${request.vehicleType}`}</strong>
                  </div>
                </div>
              </section>

              <aside className="panel">
                <h2 className="panel-title">{t('reservation.fare')}</h2>
                <div className="fare-table">
                  <div className="fare-row">
                    <span>{t('booking.tripFare')}</span>
                    <strong>{formatVnd(rawFare)}</strong>
                  </div>
                  <div className="fare-row">
                    <span>{t('booking.bookingFee')}</span>
                    <strong>{formatVnd(serviceFee)}</strong>
                  </div>
                  <div className="fare-row total">
                    <span>{t('booking.total')}</span>
                    <strong>{formatVnd(totalFare)}</strong>
                  </div>
                </div>
                <Link
                  aria-label={t('reservation.findDriver')}
                  className="submit-button stack reservation-action-link"
                  to="/search-car"
                >
                  {t('reservation.findDriver')}
                </Link>
                <Link
                  aria-label={t('reservation.changeRoute')}
                  className="secondary-button stack reservation-action-link"
                  to="/location-search"
                >
                  {t('reservation.changeRoute')}
                </Link>
              </aside>
            </div>
          ) : null}
        </section>
      </main>
    </PageShell>
  );
}
