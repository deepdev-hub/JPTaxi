import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getReviewContext, submitTripRating } from '../api/ratings.js';
import PageShell from '../components/PageShell.jsx';
import { getLastInvoiceTripId } from '../utils/invoiceSession.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { translateApiError } from '../i18n/errors.js';
import '../styles/app-pages.css';

const tags = [
  { code: 'polite', labelKey: 'review.tag.polite' },
  { code: 'safe_driving', labelKey: 'review.tag.safe' },
  { code: 'clean_vehicle', labelKey: 'review.tag.clean' },
  { code: 'optimal_route', labelKey: 'review.tag.route' },
  { code: 'good_communication', labelKey: 'review.tag.language' },
];

function scoreLabel(score, t) {
  if (score === 0) return t('review.notRated');
  if (score < 2) return t('review.needsImprovement');
  if (score < 3.5) return t('review.average');
  if (score < 4.5) return t('review.veryGood');
  return t('review.excellent');
}

export default function DriverReviewPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const tripId = searchParams.get('tripId') || getLastInvoiceTripId() || null;
  const [score, setScore] = useState(0);
  const [hoverScore, setHoverScore] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [comment, setComment] = useState('');
  const [reviewContext, setReviewContext] = useState(null);
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const displayScore = hoverScore ?? score;
  const label = scoreLabel(displayScore, t);
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
      setStatus(t('review.noTrip'));
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
        if (!ignored) setStatus(translateApiError(error, t, t('review.loadFailed')));
      });
    return () => {
      ignored = true;
    };
  }, [t, tripId]);

  function toggleTag(tag) {
    setSelectedTags((current) => current.includes(tag)
      ? current.filter((item) => item !== tag)
      : [...current, tag]);
  }

  async function submitReview(event) {
    event.preventDefault();
    if (score < 0.5) {
      setStatus(t('review.scoreRequired'));
      return;
    }

    const numericTripId = Number(tripId);
    if (!Number.isFinite(numericTripId) || numericTripId <= 0) {
      setStatus(t('review.noTrip'));
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
      setStatus(translateApiError(error, t, t('review.submitFailed')));
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
            <strong>{t('review.feedback')}</strong>
            <button type="submit" form="driver-review-form" disabled={isSubmitting}>{t('common.send')}</button>
          </header>

          <form id="driver-review-form" className="review-content" onSubmit={submitReview}>
            <div className="driver-avatar-ring"><div className="review-driver-avatar">{driverInitial}</div></div>
            <h1>{driverName}</h1>
            <p>{vehicleLabel}</p>

            <section className="review-rating">
              <strong>{t('review.question')}</strong>
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
                          aria-label={`${value.toFixed(1)} stars`}
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
                <button className="clear-rating" type="button" aria-label={t('review.clear')} title={t('review.clear')} onClick={() => { setScore(0); setHoverScore(null); }}>{displayScoreText}</button>
              </div>
              <span className="review-rating-label">{label} ({displayScoreText})</span>
              {status ? <small className="review-status">{status}</small> : null}
            </section>

            <section className="review-tags">
              <strong>{t('review.goodPoints')}</strong>
              <div>
                {tags.map((tag) => (
                  <button className={selectedTags.includes(tag.code) ? 'selected' : ''} type="button" key={tag.code} onClick={() => toggleTag(tag.code)}>{t(tag.labelKey)}</button>
                ))}
              </div>
            </section>

            <textarea className="review-comment" placeholder={t('review.comment')} value={comment} onChange={(event) => setComment(event.target.value)} />
            <button className="review-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? t('common.sending') : t('review.submit')}</button>
          </form>
        </section>
      </main>
    </PageShell>
  );
}
