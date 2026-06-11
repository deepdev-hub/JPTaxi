import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell.jsx';
import Topbar from '../components/Topbar.jsx';
import '../styles/app-pages.css';

export default function RideConfirmPage() {
  return (
    <PageShell>
      <main className="app-screen">
        <Topbar />
        <section className="app-shell">
          <div className="profile-header">
            <div>
              <h1>乗車確認</h1>
              <p>ドライバーと車両情報を確認してから乗車してください。</p>
            </div>
          </div>

          <div className="two-column-layout">
            <section className="panel">
              <h2 className="panel-title">ドライバー</h2>
              <div className="driver-row">
                <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80" alt="driver" />
                <div>
                  <strong>田中 太郎</strong>
                  <span className="muted-small">認証済みドライバー / 評価 4.9</span>
                </div>
              </div>
              <div className="stat-grid stack">
                <div className="stat-box"><span>車両番号</span><strong>JP-248</strong></div>
                <div className="stat-box"><span>車種</span><strong>Prius</strong></div>
                <div className="stat-box"><span>色</span><strong>白</strong></div>
              </div>
              <div className="notice-box stack">乗車前に車両番号とドライバー名が一致していることを確認してください。</div>
            </section>

            <aside className="panel">
              <h2 className="panel-title">ルート</h2>
              <div className="route-line-card">
                <div className="route-step"><span className="step-dot">A</span><div><strong>ホアンキエム周辺</strong><span className="muted-small">乗車地</span></div></div>
                <div className="route-step"><span className="step-dot dark">B</span><div><strong>ノイバイ国際空港</strong><span className="muted-small">目的地</span></div></div>
              </div>
              <Link className="submit-button stack" style={{ display: 'grid', placeItems: 'center', textDecoration: 'none' }} to="/ride-status">乗車を開始</Link>
              <Link className="secondary-button stack" style={{ display: 'grid', placeItems: 'center', textDecoration: 'none' }} to="/messages/driver">ドライバーに連絡</Link>
            </aside>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
