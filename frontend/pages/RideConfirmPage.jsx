import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { resolveAssetUrl } from '../api/accounts.js';
import { getActiveRide } from '../api/rides.js';
import PageShell from '../components/PageShell.jsx';
import ProfileAvatarSlot from '../components/ProfileAvatarSlot.jsx';
import Topbar from '../components/Topbar.jsx';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { translateApiError } from '../i18n/errors.js';
import '../styles/app-pages.css';

export default function RideConfirmPage() {
  const { t } = useI18n();
  const [ride, setRide] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let ignored = false;
    import('../api/customers.js').then(({ fetchCustomerProfile }) => {
      fetchCustomerProfile()
        .then(data => { if (!ignored && data) setProfile(data); })
        .catch(() => {});
    });
    return () => { ignored = true; };
  }, []);

  useEffect(() => {
    getActiveRide()
      .then((active) => {
        if (active?.type === 'trip') {
          setRide(active.data);
        } else {
          setStatus(t('ride.noAssigned'));
        }
      })
      .catch((error) => setStatus(translateApiError(error, t, t('ride.refreshFailed'))))
      .finally(() => setLoading(false));
  }, [t]);

  const driver = ride?.driver;
  const vehicle = ride?.vehicle;
  const rating = Number(driver?.rating ?? driver?.averageRating);
  const driverMeta = [
    driver?.japaneseLevel,
    Number.isFinite(rating) ? t('ride.rating', { rating: rating.toFixed(1) }) : '',
  ].filter(Boolean).join(' / ');
  return (
    <PageShell>
      <main className="app-screen ride-confirm-screen">
        <Topbar brandTo="/home" actions={<><Link to="/home">{t('common.home')}</Link><Link to="/user-info/profile">{t('common.account')}</Link><Link to="/user-info/profile" className="topbar-avatar-link" aria-label={t('common.account')}><img className="topbar-avatar" src={resolveAssetUrl(profile?.avatarUrl)} alt="" /></Link></>} />
        <section className="app-shell">
          <div className="profile-header">
            <div>
              <h1>{t('ride.confirmTitle')}</h1>
              <p>{t('ride.confirmSubtitle')}</p>
            </div>
          </div>
          {loading ? <p role="status">{t('ride.loading')}</p> : null}
          {!loading && !ride ? <p className="empty-state" role="alert">{status}</p> : null}
          {ride ? (
            <div className="two-column-layout">
              <section className="panel">
                <h2 className="panel-title">{t('ride.driverInfo')}</h2>
                <div className="driver-row">
                  <ProfileAvatarSlot src={resolveAssetUrl(driver?.avatarUrl)} fallbackText={driver?.name || ''} />
                  <div>
                    <strong>{driver?.name}</strong>
                    {driverMeta ? <span className="muted-small">{driverMeta}</span> : null}
                  </div>
                </div>
                <div className="stat-grid stack">
                  <div className="stat-box"><span>{t('ride.licensePlate')}</span><strong>{vehicle?.licensePlate}</strong></div>
                  <div className="stat-box"><span>{t('booking.vehicle')}</span><strong>{vehicle?.brand}</strong></div>
                  <div className="stat-box"><span>{t('ride.color')}</span><strong>{vehicle?.color}</strong></div>
                </div>
                <div className="notice-box stack">{t('ride.verifyDriver')}</div>
              </section>
              <aside className="panel">
                <h2 className="panel-title">{t('ride.route')}</h2>
                <div className="route-line-card">
                  <div className="route-step"><span className="step-dot">A</span><div><strong>{ride.rideRequest?.pickupAddress}</strong><span className="muted-small">{t('location.pickup')}</span></div></div>
                  <div className="route-step"><span className="step-dot dark">B</span><div><strong>{ride.rideRequest?.dropoffAddress}</strong><span className="muted-small">{t('location.destination')}</span></div></div>
                </div>
                <Link aria-label={t('ride.start')} className="submit-button stack reservation-action-link" to="/ride-status">{t('ride.start')}</Link>
                <Link className="secondary-button stack reservation-action-link" to="/messages/driver">{t('ride.contactDriver')}</Link>
              </aside>
            </div>
          ) : null}
        </section>
      </main>
    </PageShell>
  );
}
