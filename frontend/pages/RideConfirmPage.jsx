import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { resolveAssetUrl } from '../api/accounts.js';
import { getActiveRide } from '../api/rides.js';
import PageShell from '../components/PageShell.jsx';
import ProfileAvatarSlot from '../components/ProfileAvatarSlot.jsx';
import Topbar from '../components/Topbar.jsx';
import '../styles/app-pages.css';

export default function RideConfirmPage() {
  const [ride, setRide] = useState(null);
  const [status, setStatus] = useState('');
  useEffect(() => {
    getActiveRide()
      .then((active) => setRide(active?.type === 'trip' ? active.data : null))
      .catch((error) => setStatus(error.message || 'Unable to load the trip.'));
  }, []);

  const driver = ride?.driver;
  const vehicle = ride?.vehicle;
  return (
    <PageShell>
      <main className="app-screen">
        <Topbar />
        <section className="app-shell">
          {!ride ? <p className="empty-state">{status || 'No assigned ride.'}</p> : (
            <div className="two-column-layout">
              <section className="panel">
                <h2 className="panel-title">Driver</h2>
                <div className="driver-row">
                  <ProfileAvatarSlot src={resolveAssetUrl(driver?.avatarUrl)} fallbackText={driver?.name || ''} />
                  <div><strong>{driver?.name}</strong><span>{driver?.japaneseLevel}</span></div>
                </div>
                <div className="stat-grid stack">
                  <div className="stat-box"><span>License plate</span><strong>{vehicle?.licensePlate}</strong></div>
                  <div className="stat-box"><span>Vehicle</span><strong>{vehicle?.brand}</strong></div>
                  <div className="stat-box"><span>Color</span><strong>{vehicle?.color}</strong></div>
                </div>
              </section>
              <aside className="panel">
                <h2 className="panel-title">Route</h2>
                <div className="route-line-card">
                  <div className="route-step"><span className="step-dot">A</span><strong>{ride.rideRequest?.pickupAddress}</strong></div>
                  <div className="route-step"><span className="step-dot dark">B</span><strong>{ride.rideRequest?.dropoffAddress}</strong></div>
                </div>
                <Link className="submit-button stack" to="/ride-status">Open trip tracking</Link>
              </aside>
            </div>
          )}
        </section>
      </main>
    </PageShell>
  );
}
