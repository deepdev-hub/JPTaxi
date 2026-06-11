import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createRideRequest, getActiveRide } from '../api/rides.js';
import InteractiveRouteMap from '../components/InteractiveRouteMap.jsx';
import Footer from '../components/Footer.jsx';
import PageShell from '../components/PageShell.jsx';
import Topbar from '../components/Topbar.jsx';
import { calculateFareBreakdown, formatYen } from '../utils/fare.js';
import { watchBrowserLocation } from '../utils/geolocation.js';
import '../styles/booking.css';

const fallbackRoute = {
  destination: {
    name: 'ロッテホテル ハノイ',
    address: '54 Liễu Giai, Ba Đình, Hà Nội',
    position: [21.03205, 105.81283],
  },
  pickup: {
    name: 'ホアンキエム湖',
    position: [21.02878, 105.85204],
  },
  routeMetrics: {
    duration: '12分',
    distance: '4.8 km',
    fare: '¥680',
  },
  routePath: [
    [21.02878, 105.85204],
    [21.02812, 105.85046],
    [21.02672, 105.84817],
    [21.02482, 105.85672],
    [21.02621, 105.84666],
    [21.02942, 105.83628],
    [21.03162, 105.82084],
    [21.03205, 105.81283],
  ],
};

function readSelectedRoute() {
  try {
    const rawRoute = window.sessionStorage.getItem('jpTaxiSelectedRoute');
    if (!rawRoute) return fallbackRoute;

    const parsedRoute = JSON.parse(rawRoute);
    const destinationPosition = parsedRoute.destination?.position;
    const pickupPosition = parsedRoute.pickup?.position;

    if (!Array.isArray(destinationPosition) || !Array.isArray(pickupPosition)) {
      return fallbackRoute;
    }

    return {
      ...fallbackRoute,
      ...parsedRoute,
      routePath: Array.isArray(parsedRoute.routePath) ? parsedRoute.routePath : fallbackRoute.routePath,
      routeMetrics: {
        ...fallbackRoute.routeMetrics,
        ...parsedRoute.routeMetrics,
      },
    };
  } catch {
    return fallbackRoute;
  }
}

export default function BillConfirmPage() {
  const navigate = useNavigate();
  const homePath = '/home';
  const accountPath = '/user-info';
  const [bookingMode, setBookingMode] = useState('self');
  const [accountOpen, setAccountOpen] = useState(false);
  const [proxyOpen, setProxyOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [noteToDriver, setNoteToDriver] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proxyPassenger, setProxyPassenger] = useState({ name: '', phone: '' });
  const [selectedRoute] = useState(readSelectedRoute);
  const [effectivePickup, setEffectivePickup] = useState(selectedRoute.pickup);
  const accountRef = useRef(null);
  const displayDistance = selectedRoute.routeMetrics.distance;
  const fare = calculateFareBreakdown(displayDistance);
  const fareLabel = formatYen(fare.totalJpy);
  const routeSummary = `${displayDistance} - ${selectedRoute.routeMetrics.duration}`;
  const pickupPosition = effectivePickup.position;
  const shouldUseLivePickup = selectedRoute.pickup?.id === 'current-location'
    || selectedRoute.pickup?.name === '現在位置';

  const routePoints = [
    {
      key: 'pickup',
      label: effectivePickup.name,
      meta: '出発地',
      time: '現在',
      position: pickupPosition,
      type: 'pickup',
    },
    {
      key: 'destination',
      label: selectedRoute.destination.name,
      meta: selectedRoute.destination.address,
      time: `約${selectedRoute.routeMetrics.duration}`,
      position: selectedRoute.destination.position,
      type: 'destination',
    },
  ];

  function proceedToSearchCar(requestId) {
    sessionStorage.setItem('jpTaxiRideRequestId', String(requestId));
    window.setTimeout(() => navigate('/search-car'), 300);
  }

  useEffect(() => {
    function closeAccount(event) {
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountOpen(false);
      }
    }

    document.addEventListener('click', closeAccount);
    return () => document.removeEventListener('click', closeAccount);
  }, []);

  useEffect(() => {
    if (!shouldUseLivePickup) return undefined;

    return watchBrowserLocation(
      (location) => setEffectivePickup((current) => ({
        ...current,
        address: 'GPSで取得した現在位置',
        position: [location.latitude, location.longitude],
      })),
      {
        fallback: {
          latitude: selectedRoute.pickup.position[0],
          longitude: selectedRoute.pickup.position[1],
        },
        emitFallback: false,
      },
    );
  }, [selectedRoute.pickup, shouldUseLivePickup]);

  function selectMode(mode) {
    setBookingMode(mode);
    if (mode === 'proxy') {
      setProxyOpen(true);
    }
  }

  function closeProxyModal({ save = false } = {}) {
    const hasProxyInfo = proxyPassenger.name.trim() && proxyPassenger.phone.trim();
    if (!hasProxyInfo) {
      const shouldNotify = bookingMode === 'proxy';
      setBookingMode('self');
      if (save || shouldNotify) {
        setToast('代理予約の情報が空のため、自分用に戻しました');
      }
    }
    setProxyOpen(false);
  }

  async function confirmBooking() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setProxyOpen(false);
    setToast('予約内容を確認しました');
    sessionStorage.removeItem('jpTaxiRideRequestId');
    sessionStorage.removeItem('jpTaxiTripId');
    localStorage.removeItem('jpTaxiRideAccepted');
    localStorage.removeItem('jpTaxiPaymentRequested');
    sessionStorage.setItem('jpTaxiSelectedRoute', JSON.stringify({
      ...selectedRoute,
      pickup: effectivePickup,
      routePath: [pickupPosition, ...selectedRoute.routePath.slice(1)],
    }));
    const proxyInfoComplete = proxyPassenger.name.trim() && proxyPassenger.phone.trim();
    const finalBookingMode = bookingMode === 'proxy' && proxyInfoComplete ? 'proxy' : 'self';
    if (bookingMode === 'proxy' && finalBookingMode === 'self') {
      setBookingMode('self');
      setToast('代理予約の情報が未入力のため、本人予約に戻しました。');
    }

    const bookingPayload = {
      pickupAddress: effectivePickup.name,
      pickupLat: pickupPosition[0],
      pickupLng: pickupPosition[1],
      dropoffAddress: `${selectedRoute.destination.name} - ${selectedRoute.destination.address}`,
      dropoffLat: selectedRoute.destination.position[0],
      dropoffLng: selectedRoute.destination.position[1],
      vehicleType: '4',
      estimatedFareVnd: fare.totalFareVnd,
      estimatedFareJpy: fare.totalJpy,
      rawFareVnd: fare.rawFareVnd,
      noteToDriver,
      actualPassengerName: finalBookingMode === 'proxy' ? proxyPassenger.name.trim() : undefined,
      actualPassengerPhone: finalBookingMode === 'proxy' ? proxyPassenger.phone.trim() : undefined,
    };

    try {
      let request;
      try {
        request = await createRideRequest(bookingPayload);
      } catch (error) {
        const activeRide = await getActiveRide().catch(() => null);
        const requestId = activeRide?.type === 'request' ? activeRide.data?.requestId : null;
        const requestStatus = activeRide?.data?.status;
        if (requestId && ['pending', 'searching'].includes(requestStatus)) {
          request = activeRide.data;
        } else {
          throw error;
        }
      }

      if (!request?.requestId) {
        throw new Error('予約番号を取得できませんでした。もう一度お試しください。');
      }
      proceedToSearchCar(request.requestId);
    } catch (error) {
      setToast(error.message || '予約を作成できませんでした。もう一度お試しください。');
      setIsSubmitting(false);
    }
  }

  return (
    <PageShell withFooter={false}>
      <main className="booking-screen booking-reference-screen">
        <Topbar brandTo={homePath}>
          <div className="account-menu" ref={accountRef}>
            <button
              className="profile-button"
              type="button"
              aria-label="プロフィール"
              aria-expanded={accountOpen}
              onClick={(event) => {
                event.stopPropagation();
                setAccountOpen((current) => !current);
              }}
            >
              <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80" alt="" />
            </button>
            <div className={`account-dropdown ${accountOpen ? 'open' : ''}`} aria-hidden={!accountOpen}>
              <button type="button" onClick={() => navigate(accountPath)}>会員情報変更</button>
              <button type="button">ログアウト</button>
            </div>
          </div>
        </Topbar>

        <section className="booking-layout booking-reference-layout">
          <section className="confirm-panel" aria-labelledby="page-title">
            <div className="page-heading">
              <h1 id="page-title">予約内容を確認</h1>
              <p>最終的なルートと料金を確認してください。</p>
            </div>

            <section className="section-card">
              <h2>乗車ルート</h2>
              <div className="route-list">
                <div className="route-point pickup">
                  <span className="point-dot"></span>
                  <div>
                    <span>出発地</span>
                    <strong>{effectivePickup.name}</strong>
                  </div>
                </div>
                <div className="route-line"></div>
                <div className="route-point destination">
                  <span className="point-dot"></span>
                  <div>
                    <span>目的地</span>
                    <strong>{selectedRoute.destination.name}</strong>
                  </div>
                </div>
              </div>

              <div className="trip-summary">
                <article>
                  <span>乗車予定</span>
                  <strong>現在</strong>
                </article>
                <article>
                  <span>所要時間</span>
                  <strong>{selectedRoute.routeMetrics.duration}</strong>
                </article>
                <article>
                  <span>走行距離</span>
                  <strong>{displayDistance}</strong>
                </article>
              </div>
            </section>

            <section className="section-card">
              <h2>車種</h2>
              <div className="vehicle-card">
                <span className="vehicle-icon">🚖</span>
                <div>
                  <strong>スタンダード</strong>
                  <span>快適なセダン・禁煙車</span>
                </div>
                <strong className="vehicle-price">{fareLabel}</strong>
              </div>
            </section>

            <section className="section-card">
              <label className="memo-field">
                <span>ドライバーへのメモ (任意)</span>
                <textarea
                  onChange={(event) => setNoteToDriver(event.target.value)}
                  placeholder="例: 大きな荷物があります、または待ち合わせ場所の詳細など..."
                  value={noteToDriver}
                />
              </label>
            </section>

            <section className="section-card fare-card">
              <h2>料金詳細</h2>
              <dl>
                <div>
                  <dt>基本運賃</dt>
                  <dd>{formatYen(fare.baseFareJpy)}</dd>
                </div>
                <div>
                  <dt>距離加算</dt>
                  <dd>{formatYen(fare.distanceFareJpy)}</dd>
                </div>
                <div>
                  <dt>予約手数料</dt>
                  <dd>{formatYen(fare.reservationFeeJpy)}</dd>
                </div>
              </dl>
              <div className="total-row">
                <span>合計金額</span>
                <strong>{fareLabel}</strong>
              </div>
            </section>

            <div className="booking-mode" role="group" aria-label="予約タイプ">
              <button
                className={`mode-button ${bookingMode === 'self' ? 'active' : ''}`}
                type="button"
                onClick={() => selectMode('self')}
              >
                自分用
              </button>
              <button
                className={`mode-button ${bookingMode === 'proxy' ? 'active' : ''}`}
                type="button"
                onClick={() => selectMode('proxy')}
              >
                代理予約
              </button>
            </div>

            <div className="action-row">
              <Link className="secondary-button" style={{ display: 'grid', placeItems: 'center', textDecoration: 'none' }} to="/location-search">
                戻る
              </Link>
              <button className="primary-button" type="button" onClick={confirmBooking} disabled={isSubmitting}>
                {isSubmitting ? '送信中...' : '予約を確定する'}
              </button>
            </div>
          </section>

          <section className="map-panel booking-route-map" aria-label="ルートマップ">
            <InteractiveRouteMap
              alternateRoutePath={[]}
              currentLocation={pickupPosition}
              route={routePoints}
              routePath={selectedRoute.routePath}
              routeSummary={routeSummary}
              scrollWheelZoom
              showCurrentLocation={shouldUseLivePickup}
              showDriver={false}
            />
          </section>
        </section>

        <div className={`modal-backdrop ${proxyOpen ? 'open' : ''}`} aria-hidden={!proxyOpen} onClick={() => closeProxyModal()}>
          <section className="proxy-modal" role="dialog" aria-modal="true" aria-labelledby="proxy-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2 id="proxy-title">代理予約の乗車者情報</h2>
              <button className="modal-close" type="button" aria-label="閉じる" onClick={() => closeProxyModal()}>×</button>
            </div>
            <p className="modal-copy">代理予約に切り替えたため、実際に乗車する方の情報を入力してください。</p>
            <div className="proxy-fields">
              <label>
                <span>乗車者氏名</span>
                <input
                  type="text"
                  onChange={(event) => setProxyPassenger((current) => ({ ...current, name: event.target.value }))}
                  placeholder="例: 田中 太郎"
                  value={proxyPassenger.name}
                />
              </label>
              <label>
                <span>連絡先電話番号</span>
                <input
                  type="tel"
                  onChange={(event) => setProxyPassenger((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="090-0000-0000"
                  value={proxyPassenger.phone}
                />
              </label>
            </div>

            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={() => closeProxyModal()}>後で入力</button>
              <button className="primary-button" type="button" onClick={() => closeProxyModal({ save: true })}>保存する</button>
            </div>
          </section>
        </div>

        <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">{toast}</div>
      </main>
      <div className="booking-reference-footer">
        <Footer />
      </div>
    </PageShell>
  );
}
