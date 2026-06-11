import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getReviewContext, submitTripRating } from '../api/ratings.js';
import PageShell from '../components/PageShell.jsx';
import { getLastInvoiceTripId } from '../utils/invoiceSession.js';
import '../styles/app-pages.css';

const tags = ['丁寧な対応', '安全運転', '車内が清潔', 'ルートが最適', '日本語が上手'];

function scoreLabel(score) {
  if (score === 0) return '未評価';
  if (score < 2) return '改善が必要';
  if (score < 3.5) return '普通';
  if (score < 4.5) return 'とても良い';
  return '素晴らしい!';
}

export default function DriverReviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tripId = searchParams.get('tripId') || sessionStorage.getItem('jpTaxiTripId') || getLastInvoiceTripId() || null;
  const [score, setScore] = useState(0);
  const [hoverScore, setHoverScore] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [comment, setComment] = useState('');
  const [reviewContext, setReviewContext] = useState(null);
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const displayScore = hoverScore ?? score;
  const label = scoreLabel(displayScore);
  const displayScoreText = displayScore.toFixed(1);
  const driverName = reviewContext?.driver?.name || '';
  const vehicle = reviewContext?.driver?.vehicle;
  const vehicleLabel = vehicle
    ? `${vehicle.brand || ''} ${vehicle.color || ''} • ${vehicle.licensePlate || ''}`.trim()
    : '';
  const driverInitial = driverName.trim().charAt(0) || '?';

  useEffect(() => {
    const numericTripId = Number(tripId);
    if (!Number.isFinite(numericTripId) || numericTripId <= 0) {
      setStatus('No completed trip was selected.');
      return undefined;
    }

    let ignored = false;
    getReviewContext(numericTripId)
      .then((context) => {
        if (ignored) return;
        setReviewContext(context);
        if (context.existingRating) {
          setScore(Number(context.existingRating.score) || 0);
          setSelectedTags(Array.isArray(context.existingRating.tags) ? context.existingRating.tags : []);
          setComment(context.existingRating.comment || '');
        }
      })
      .catch((error) => {
        if (!ignored) setStatus(error.message || '評価情報を取得できませんでした。');
      });
    return () => {
      ignored = true;
    };
  }, [tripId]);

  function toggleTag(tag) {
    setSelectedTags((current) => current.includes(tag)
      ? current.filter((item) => item !== tag)
      : [...current, tag]);
  }

  async function submitReview(event) {
    event.preventDefault();
    if (score < 0.5) {
      setStatus('星を0.5以上選択してください。');
      return;
    }

    const numericTripId = Number(tripId);
    if (!Number.isFinite(numericTripId) || numericTripId <= 0) {
      setStatus('No completed trip was selected.');
      return;
    }

    setIsSubmitting(true);
    setStatus('');
    try {
      await submitTripRating(
        numericTripId,
        { score, tags: selectedTags, comment: comment.trim() },
        { update: Boolean(reviewContext?.existingRating) },
      );
    } catch (error) {
      setStatus(error.message || '評価を送信できませんでした。');
      setIsSubmitting(false);
      return;
    }
    navigate('/home', { replace: true });
  }

  return (
    <PageShell withFooter={false}>
      <main className="review-screen">
        <section className="rating-window">
          <header className="review-topbar">
            <Link to="/home">×</Link>
            <strong>フィードバック</strong>
            <button type="submit" form="driver-review-form" disabled={isSubmitting}>送信</button>
          </header>

          <form id="driver-review-form" className="review-content" onSubmit={submitReview}>
            <div className="driver-avatar-ring"><div className="review-driver-avatar">{driverInitial}</div></div>
            <h1>{driverName}</h1>
            <p>{vehicleLabel}</p>

            <section className="review-rating">
              <strong>今回の乗車はいかがでしたか?</strong>
              <div className="review-stars half-stars" aria-label={`${displayScore} stars`} onMouseLeave={() => setHoverScore(null)}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const fill = Math.max(0, Math.min(1, displayScore - (star - 1))) * 100;
                  return (
                    <span
                      className="review-star-control"
                      key={star}
                      style={{ '--star-fill': `${fill}%` }}
                    >
                      <span aria-hidden="true">★</span>
                      {[star - 0.5, star].map((value, index) => (
                        <button
                          aria-label={`${value.toFixed(1)}星`}
                          className={`star-hit ${index === 0 ? 'left' : 'right'}`}
                          key={value}
                          onBlur={() => setHoverScore(null)}
                          onClick={() => { setScore(value); setHoverScore(value); setStatus(''); }}
                          onFocus={() => setHoverScore(value)}
                          onMouseEnter={() => setHoverScore(value)}
                          type="button"
                        />
                      ))}
                    </span>
                  );
                })}
                <button className="clear-rating" type="button" aria-label="評価を0に戻す" title="クリックして0に戻す" onClick={() => { setScore(0); setHoverScore(null); }}>{displayScoreText}</button>
              </div>
              <span className="review-rating-label">{label} ({displayScoreText})</span>
              {status ? <small className="review-status">{status}</small> : null}
            </section>

            <section className="review-tags">
              <strong>良かった点 (複数選択可)</strong>
              <div>
                {tags.map((tag) => (
                  <button className={selectedTags.includes(tag) ? 'selected' : ''} type="button" key={tag} onClick={() => toggleTag(tag)}>{tag}</button>
                ))}
              </div>
            </section>

            <textarea className="review-comment" placeholder="ドライバーへのメッセージ (任意)" value={comment} onChange={(event) => setComment(event.target.value)} />
            <button className="review-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? '送信中...' : '評価を送信する'}</button>
          </form>
        </section>
      </main>
    </PageShell>
  );
}
