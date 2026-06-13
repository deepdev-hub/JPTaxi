import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getActiveDriverRide } from '../api/rides.js';
import { resolveAssetUrl } from '../api/accounts.js';
import ProfileAvatarSlot from '../components/ProfileAvatarSlot.jsx';
import PageShell from '../components/PageShell.jsx';
import Topbar from '../components/Topbar.jsx';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { translateApiError } from '../i18n/errors.js';
import { useChatNotification } from '../contexts/ChatContext.jsx';
import '../styles/app-pages.css';

export default function DriverAvailablePage() {
  const { t } = useI18n();
  const { totalUnread } = useChatNotification();
  const [ride, setRide] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let ignored = false;
    getActiveDriverRide()
      .then((result) => {
        if (!ignored) setRide(result?.type === 'trip' ? result.data : null);
      })
      .catch((error) => {
        if (!ignored) setStatus(translateApiError(error, t, t('ride.refreshFailed')));
      });
    return () => {
      ignored = true;
    };
  }, [t]);

  const passenger = ride?.passenger;
  return (
    <PageShell>
      <main className="available-screen">
        <Topbar />
        <section className="available-card">
          {!ride ? <p className="empty-state">{status || t('ride.noActive')}</p> : (
            <>
              <div className="arrival-row">
                <div>
                  <span>{t('ride.pickup')}</span>
                  <h1>{ride.rideRequest?.pickupAddress}</h1>
                </div>
                <strong>{Number(ride.actualDistanceKm).toFixed(1)} km</strong>
              </div>
              <div className="driver-row">
                <ProfileAvatarSlot
                  src={resolveAssetUrl(passenger?.avatarUrl)}
                  fallbackText={passenger?.name || ''}
                />
                <div>
                  <strong>{passenger?.name || t('common.passenger')}</strong>
                  <p>{ride.rideRequest?.dropoffAddress}</p>
                  <span>{passenger?.phone}</span>
                </div>
              </div>
              <div className="card-actions">
                <a className="submit-button" href={`tel:${passenger?.phone || ''}`}>{t('ride.call')}</a>
                <Link className="secondary-button icon-with-badge" to="/messages/customer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {t('common.messages')}
                  {totalUnread > 0 && <span className="badge-notification">{totalUnread}</span>}
                </Link>
              </div>
            </>
          )}
        </section>
      </main>
    </PageShell>
  );
}
