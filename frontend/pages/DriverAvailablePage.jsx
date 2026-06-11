import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getActiveDriverRide } from '../api/rides.js';
import { resolveAssetUrl } from '../api/accounts.js';
import ProfileAvatarSlot from '../components/ProfileAvatarSlot.jsx';
import PageShell from '../components/PageShell.jsx';
import Topbar from '../components/Topbar.jsx';
import '../styles/app-pages.css';

export default function DriverAvailablePage() {
  const [ride, setRide] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let ignored = false;
    getActiveDriverRide()
      .then((result) => {
        if (!ignored) setRide(result?.type === 'trip' ? result.data : null);
      })
      .catch((error) => {
        if (!ignored) setStatus(error.message || 'Unable to load the active ride.');
      });
    return () => {
      ignored = true;
    };
  }, []);

  const passenger = ride?.passenger;
  return (
    <PageShell>
      <main className="available-screen">
        <Topbar />
        <section className="available-card">
          {!ride ? <p className="empty-state">{status || 'No active ride.'}</p> : (
            <>
              <div className="arrival-row">
                <div>
                  <span>Pickup</span>
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
                  <strong>{passenger?.name || 'Passenger'}</strong>
                  <p>{ride.rideRequest?.dropoffAddress}</p>
                  <span>{passenger?.phone}</span>
                </div>
              </div>
              <div className="card-actions">
                <a className="submit-button" href={`tel:${passenger?.phone || ''}`}>Call</a>
                <Link className="secondary-button" to="/messages/customer">Message</Link>
              </div>
            </>
          )}
        </section>
      </main>
    </PageShell>
  );
}
