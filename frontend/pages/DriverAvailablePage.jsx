import PageShell from '../components/PageShell.jsx';
import Topbar from '../components/Topbar.jsx';
import '../styles/app-pages.css';

export default function DriverAvailablePage() {
  return (
    <PageShell>
      <main className="available-screen">
        <Topbar />
        <section className="available-card">
          <div className="arrival-row">
            <div>
              <span>お迎え予定時間</span>
              <h1>あと 3 分</h1>
            </div>
            <strong>0.8 km</strong>
          </div>

          <div className="driver-row">
            <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80" alt="" />
            <div>
              <strong>田中 ドライバー</strong>
              <p>トヨタ・クラウン / ホワイト</p>
              <span>30A-123.45</span>
            </div>
          </div>

          <div className="card-actions">
            <button className="submit-button" type="button">電話</button>
            <button className="secondary-button" type="button">メッセージ</button>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
