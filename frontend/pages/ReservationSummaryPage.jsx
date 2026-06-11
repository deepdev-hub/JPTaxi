import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell.jsx';
import Topbar from '../components/Topbar.jsx';
import '../styles/app-pages.css';

export default function ReservationSummaryPage() {
  return (
    <PageShell>
      <main className="app-screen">
        <Topbar />
        <section className="app-shell">
          <div className="profile-header">
            <div>
              <h1>予約確認</h1>
              <p>予約内容と支払い方法を確認してください。</p>
            </div>
          </div>

          <div className="two-column-layout">
            <section className="panel">
              <h2 className="panel-title">移動ルート</h2>
              <div className="route-line-card">
                <div className="route-step"><span className="step-dot">A</span><div><strong>ハノイ・ホアンキエム周辺</strong><span className="muted-small">2026/05/15 09:30 出発</span></div></div>
                <div className="route-step"><span className="step-dot dark">B</span><div><strong>ノイバイ国際空港</strong><span className="muted-small">到着予定 10:08</span></div></div>
              </div>
              <div className="stat-grid stack">
                <div className="stat-box"><span>距離</span><strong>28.4 km</strong></div>
                <div className="stat-box"><span>所要時間</span><strong>38分</strong></div>
                <div className="stat-box"><span>車種</span><strong>標準</strong></div>
              </div>
            </section>

            <aside className="panel">
              <h2 className="panel-title">料金</h2>
              <div className="fare-table">
                <div className="fare-row"><span>乗車料金</span><strong>¥4,800</strong></div>
                <div className="fare-row"><span>予約手数料</span><strong>¥400</strong></div>
                <div className="fare-row total"><span>合計</span><strong>¥5,200</strong></div>
              </div>
              <Link className="submit-button stack" style={{ display: 'grid', placeItems: 'center', textDecoration: 'none' }} to="/search-car">予約を確定する</Link>
              <Link className="secondary-button stack" style={{ display: 'grid', placeItems: 'center', textDecoration: 'none' }} to="/location-search">修正する</Link>
            </aside>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
