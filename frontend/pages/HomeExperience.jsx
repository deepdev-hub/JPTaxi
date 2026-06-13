import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getActiveDriverRide, getActiveRide } from '../api/rides.js';
import { getCustomerProfile, getDriverProfile, resolveAssetUrl } from '../api/accounts.js';
import { getSavedPlaces } from '../api/customers.js';
import InteractiveRouteMap from '../components/InteractiveRouteMap.jsx';
import PageShell from '../components/PageShell.jsx';
import Topbar from '../components/Topbar.jsx';
import '../styles/app-pages.css';
import { buildSelectedRoute, geocodePlace, getCurrentPosition } from '../utils/routePlanner.js';
import { normalizePlace } from '../utils/place.js';
import { getRideContinuationPath, syncActiveRideSession } from '../utils/activeRideNavigation.js';
import { useI18n } from '../i18n/I18nProvider.jsx';

const userHome = {
  brandTo: '/home',
  heading: 'home.greeting',
  question: 'home.customerQuestion',
  searchTo: '/location-search',
  searchTitle: 'home.customerSearchTitle',
  searchCopy: 'home.customerSearchCopy',
  quickItems: [],
  fastTo: '/bill-confirm',
  fastTitle: 'home.callTaxi',
  fastCopy: 'home.bookNow',
};

const driverHome = {
  brandTo: '/driver-home',
  heading: 'home.greeting',
  question: 'home.driverQuestion',
  searchTo: '/xacnhancuocxe',
  searchTitle: 'home.driverSearchTitle',
  searchCopy: 'home.driverSearchCopy',
  quickItems: [
    { icon: '👤', title: 'home.profile', copy: 'home.profileCopy', to: '/driver-info/basic' },
    { icon: '💬', title: 'home.chat', copy: 'home.chatCopy', to: '/messages/customer' },
    { icon: '📍', title: 'home.rideStatus', copy: 'home.rideStatusCopy', to: '/driver-ride-status' },
  ],
  fastTo: '/xacnhancuocxe',
  fastTitle: 'home.openDispatch',
  fastCopy: 'home.openDispatchCopy',
};

export default function HomeExperience({ mode = 'user' }) {
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const content = mode === 'driver' ? driverHome : userHome;
  const isUserMode = mode !== 'driver';
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [profile, setProfile] = useState(null);
  const [quickLoading, setQuickLoading] = useState(null);
  const [rideContinuationPath, setRideContinuationPath] = useState(null);

  const quickItems = isUserMode
    ? savedPlaces.map((place) => ({
        ...place,
        key: place.savedPlaceId,
        title: place.label,
        icon: place.type === 'home' ? '🏠' : place.type === 'work' ? '🏢' : '★',
      }))
    : content.quickItems;

  useEffect(() => {
    let ignored = false;
    const role = isUserMode ? 'customer' : 'driver';
    const loadActiveRide = isUserMode ? getActiveRide : getActiveDriverRide;

    loadActiveRide()
      .then((activeRide) => {
        if (ignored) return;
        syncActiveRideSession(activeRide);
        setRideContinuationPath(getRideContinuationPath(role, activeRide));
      })
      .catch(() => {
        if (!ignored) setRideContinuationPath(null);
      });

    return () => {
      ignored = true;
    };
  }, [isUserMode]);

  useEffect(() => {
    let ignored = false;
    const load = isUserMode
      ? Promise.all([getCustomerProfile(), getSavedPlaces()])
      : Promise.all([getDriverProfile(), Promise.resolve([])]);
    load
      .then(([nextProfile, places]) => {
        if (ignored) return;
        setProfile(nextProfile);
        setSavedPlaces(Array.isArray(places) ? places : []);
      })
      .catch(() => {
        if (!ignored) {
          setProfile(null);
          setSavedPlaces([]);
        }
      });
    return () => {
      ignored = true;
    };
  }, [isUserMode]);

  async function openRideAwarePath(event, fallbackPath) {
    event.preventDefault();
    const role = isUserMode ? 'customer' : 'driver';
    const loadActiveRide = isUserMode ? getActiveRide : getActiveDriverRide;

    try {
      const activeRide = await loadActiveRide();
      syncActiveRideSession(activeRide);
      navigate(getRideContinuationPath(role, activeRide) || fallbackPath);
    } catch {
      navigate(rideContinuationPath || fallbackPath);
    }
  }

  async function openQuickPlace(item) {
    if (!isUserMode) return;

    if (!item.address?.trim()) {
      navigate('/user-info/profile');
      return;
    }

    const normalizedItem = normalizePlace(item);

    navigate('/location-search', {
      state: {
        autoFillDestination: {
          name: item.title,
          address: item.address,
          position: normalizedItem?.position,
        }
      }
    });
  }

  return (
    <PageShell>
      <main className="home-window">
        <Topbar
          brandTo={content.brandTo}
          actions={(
            <>
              <Link to={content.brandTo}>{t('common.home')}</Link>
              <Link to={isUserMode ? '/user-info/profile' : '/driver-info/basic'}>{t('common.account')}</Link>
              <Link to={isUserMode ? '/user-info/profile' : '/driver-info/basic'} className="topbar-avatar-link" aria-label={t('common.account')}>
                <img className="topbar-avatar" src={resolveAssetUrl(profile?.avatarUrl)} alt="" />
              </Link>
            </>
          )}
        />

        <section className="zip-home-hero">
          <InteractiveRouteMap
            className="home-background-map"
            centerOnCurrentLocation
            fitToRoute={false}
            interactive
            mapZoom={15}
            scrollWheelZoom
            showControls
            showCurrentLocation
            showDetails={false}
            showDriver={false}
            showMarkers={false}
            showRoute={false}
          />

          <div className="zip-home-panel">
            <h1>{t(content.heading)}</h1>
            <p className="zip-home-question">{t(content.question)}</p>

            <Link className="zip-search-card" to={rideContinuationPath || content.searchTo} onClick={(event) => openRideAwarePath(event, content.searchTo)}>
              <span className="zip-search-icon" aria-hidden="true">📍</span>
              <span>
                <strong>{t(content.searchTitle)}</strong>
                <small>{t(content.searchCopy)}</small>
              </span>
            </Link>

            <div className="zip-quick-row">
              {isUserMode && !quickItems.length ? (
                <Link className="zip-quick-box" to="/user-info/profile">
                  <span>+</span>
                  <div><strong>{t('home.savedPlaces')}</strong><small>{t('home.noSavedPlaces')}</small></div>
                </Link>
              ) : null}
              {quickItems.map((item) => {
                const body = (
                  <>
                    <span>{item.icon}</span>
                    <div>
                      <strong>{quickLoading === item.key ? t('home.searching') : (isUserMode ? item.title : t(item.title))}</strong>
                      <small>{item.address || (item.copy ? t(item.copy) : t('home.setAddress'))}</small>
                    </div>
                  </>
                );

                if (isUserMode) {
                  return (
                    <button className="zip-quick-box" type="button" key={item.key} onClick={() => openQuickPlace(item)}>
                      {body}
                    </button>
                  );
                }

                return item.to ? (
                  <Link className="zip-quick-box" to={item.to} key={item.title}>
                    {body}
                  </Link>
                ) : (
                  <article className="zip-quick-box" key={item.title}>
                    {body}
                  </article>
                );
              })}
            </div>

            <Link className="zip-fast-button" to={rideContinuationPath || content.fastTo} onClick={(event) => openRideAwarePath(event, content.fastTo)}>
              <span aria-hidden="true">🚖</span>
              <span><strong>{t(content.fastTitle)}</strong><small>{t(content.fastCopy)}</small></span>
            </Link>
          </div>

        </section>
      </main>
    </PageShell>
  );
}
