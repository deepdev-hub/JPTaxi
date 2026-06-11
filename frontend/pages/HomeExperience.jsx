import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getActiveDriverRide, getActiveRide } from '../api/rides.js';
import InteractiveRouteMap from '../components/InteractiveRouteMap.jsx';
import PageShell from '../components/PageShell.jsx';
import Topbar from '../components/Topbar.jsx';
import '../styles/app-pages.css';
import { buildSelectedRoute, geocodePlace, getCurrentPosition } from '../utils/routePlanner.js';
import { readSavedPlaces } from '../utils/savedPlaces.js';
import { getRideContinuationPath, syncActiveRideSession } from '../utils/activeRideNavigation.js';

const userHome = {
  brandTo: '/home',
  actions: (
    <>
      <Link to="/home">ホーム</Link>
      <Link to="/user-info">アカウント</Link>
      <img className="topbar-avatar" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80" alt="" />
    </>
  ),
  heading: 'こんにちは！',
  question: 'どこへ行きますか?',
  searchTo: '/location-search',
  searchTitle: 'どこへ行きますか？',
  searchCopy: '目的地・住所を入力、または履歴から選択',
  quickItems: [
    { icon: '🕒', title: '職場', copy: '123 Duong ABC' },
    { icon: '🏠', title: '自宅', copy: '456 Duong XYZ' },
    { icon: '⭐', title: 'お気に', copy: 'もっと見る', to: '/location-search' },
  ],
  fastTo: '/location-search',
  fastTitle: '今すぐタクシーを呼ぶ',
  fastCopy: 'すぐに予約',
};

const driverHome = {
  brandTo: '/driver-home',
  actions: (
    <>
      <Link to="/driver-home">ホーム</Link>
      <Link to="/driver-info/basic">ドライバー情報</Link>
      <img className="topbar-avatar" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80" alt="" />
    </>
  ),
  heading: 'こんにちは！',
  question: '次の配車を確認しますか?',
  searchTo: '/xacnhancuocxe',
  searchTitle: '予約内容を確認',
  searchCopy: '乗車場所・目的地・料金を確認して受付へ進む',
  quickItems: [
    { icon: '👤', title: 'プロフィール', copy: '公開情報を編集', to: '/driver-info/basic' },
    { icon: '💬', title: 'チャット', copy: '利用者へ連絡', to: '/messages/customer' },
    { icon: '📍', title: '待機状況', copy: '時間と距離を表示', to: '/driver-ride-status' },
  ],
  fastTo: '/xacnhancuocxe',
  fastTitle: '配車確認へ進む',
  fastCopy: '確認後、チャット・待機状況・請求書へ',
};

export default function HomeExperience({ mode = 'user' }) {
  const navigate = useNavigate();
  const content = mode === 'driver' ? driverHome : userHome;
  const isUserMode = mode !== 'driver';
  const [savedPlaces] = useState(readSavedPlaces);
  const [quickLoading, setQuickLoading] = useState(null);
  const [rideContinuationPath, setRideContinuationPath] = useState(null);

  const quickItems = isUserMode
    ? Object.entries(savedPlaces).map(([key, place]) => ({ ...place, key }))
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

    setQuickLoading(item.key);

    try {
      const [pickup, destination] = await Promise.all([
        getCurrentPosition(),
        geocodePlace(item.address),
      ]);
      const selectedRoute = await buildSelectedRoute({
        ...destination,
        name: item.title,
        address: destination.address || item.address,
      }, pickup);

      window.sessionStorage.setItem('jpTaxiSelectedRoute', JSON.stringify(selectedRoute));
      navigate('/bill-confirm');
    } catch {
      navigate('/location-search');
    } finally {
      setQuickLoading(null);
    }
  }

  return (
    <PageShell>
      <main className="home-window">
        <Topbar brandTo={content.brandTo} actions={content.actions} />

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
            <h1>{content.heading}</h1>
            <p className="zip-home-question">{content.question}</p>

            <Link className="zip-search-card" to={rideContinuationPath || content.searchTo} onClick={(event) => openRideAwarePath(event, content.searchTo)}>
              <span className="zip-search-icon" aria-hidden="true">📍</span>
              <span>
                <strong>{content.searchTitle}</strong>
                <small>{content.searchCopy}</small>
              </span>
            </Link>

            <div className="zip-quick-row">
              {quickItems.map((item) => {
                const body = (
                  <>
                    <span>{item.icon}</span>
                    <div>
                      <strong>{quickLoading === item.key ? '検索中...' : item.title}</strong>
                      <small>{item.address || item.copy || 'プロフィールで住所を設定'}</small>
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
              <span><strong>{content.fastTitle}</strong><small>{content.fastCopy}</small></span>
            </Link>
          </div>

        </section>
      </main>
    </PageShell>
  );
}
