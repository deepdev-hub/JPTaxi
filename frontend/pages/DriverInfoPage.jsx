import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Footer from '../components/Footer.jsx';
import AvatarCropper from '../components/AvatarCropper.jsx';
import Modal from '../components/Modal.jsx';
import PageShell from '../components/PageShell.jsx';
import Topbar from '../components/Topbar.jsx';
import {
  getDriverProfile,
  resolveAssetUrl,
  updateDriverBankAccount,
  updateDriverDocuments,
  updateDriverProfile,
  uploadAvatar,
  uploadDriverDocument,
} from '../api/accounts.js';
import { getDriverRatings, getDriverRatingsSummary, getPublicDriverRatingSummary } from '../api/ratings.js';
import {
  getStoredProfileLanguage,
  languageOptions,
  LANGUAGE_EVENT,
  profileText,
  setStoredProfileLanguage,
} from '../i18n/profileLanguage.js';
import '../styles/app-pages.css';

const driverMenu = [
  { id: 'basic', icon: '👤', to: '/driver-info/basic' },
  { id: 'vehicle', icon: '🚕', to: '/driver-info/vehicle' },
  { id: 'history', icon: '\u{1F552}', to: '/driver-info/history' },
  { id: 'payout', icon: '💳', to: '/driver-info/payout' },
  { id: 'language', icon: '🌐', to: '/driver-info/language' },
  { id: 'logout', icon: '🚪', to: '/driver-info/logout' },
];

const documentUploadTypes = {
  portrait: 'portrait',
  licenseFront: 'license_front',
  licenseBack: 'license_back',
  vehiclePhoto: 'vehicle_photo',
  registrationPaper: 'registration_paper',
};

const defaultVisaCard = {
  holderName: 'JP Taxi Driver',
  number: '4111111111114821',
  expiry: '12/29',
  securityCode: '',
  billingAddress: '',
};

function normalizeCardNumber(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 16);
}

function formatCardNumber(value) {
  return normalizeCardNumber(value).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value) {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function getCardLastFour(value) {
  return normalizeCardNumber(value).slice(-4) || '4821';
}

const fallbackDriver = {
  lastName: '',
  firstName: '',
  nationality: 'Japan',
  phone: '+84123456789',
  email: localStorage.getItem('jpTaxiDriverEmail') || localStorage.getItem('jpTaxiUserEmail') || '',
  japaneseLevel: 'N2',
  birthDate: '1990-01-01',
  gender: 'Male',
  idNumber: '',
  avatarUrl: '',
  vehicle: {
    brand: 'Toyota',
    color: 'White',
    licensePlate: '30A-123.45',
    vehicleType: '4',
    manufactureYear: new Date().getFullYear(),
    vehiclePhotoUrl: '',
    registrationPaperUrl: '',
  },
  licenses: [],
  documents: {},
  bankAccount: {
    bankName: 'Vietcombank',
    accountNumber: '00000291',
    accountHolder: 'TARO YAMADA',
  },
  trips: [],
  stats: null,
};

function normalizeProfile(profile = fallbackDriver) {
  const hasStats = profile.stats && typeof profile.stats === 'object';
  return {
    ...fallbackDriver,
    ...profile,
    birthDate: profile.birthDate ? String(profile.birthDate).slice(0, 10) : fallbackDriver.birthDate,
    avatarUrl: resolveAssetUrl(profile.avatarUrl),
    vehicle: profile.vehicle || fallbackDriver.vehicle,
    bankAccount: profile.bankAccount || fallbackDriver.bankAccount,
    licenses: Array.isArray(profile.licenses) ? profile.licenses : [],
    documents: profile.documents || {},
    trips: Array.isArray(profile.trips) ? profile.trips : [],
    stats: hasStats
      ? {
          ...(profile.stats || {}),
        }
      : null,
  };
}

function formatCurrency(value) {
  const amount = parseNumericAmount(value);
  if (!amount) return '¥0';
  return `¥${amount.toLocaleString('ja-JP')}`;
}

function parseNumericAmount(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = String(value ?? '').replace(/[^\d.-]/g, '');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function formatDate(value, locale = 'ja-JP') {
  if (!value) return '';
  return new Date(value).toLocaleDateString(locale);
}

function formatTripStatus(status) {
  return {
    completed: '完了',
    ongoing: '乗車中',
    cancelled: 'キャンセル済み',
  }[status] || status || '-';
}

const historyFilterLabels = {
  ja: {
    all: 'すべて',
    completed: '完了',
    rated: '評価あり',
    unrated: '未評価',
  },
  vi: {
    all: 'Tất cả',
    completed: 'Đã hoàn thành',
    rated: 'Đã đánh giá',
    unrated: 'Chưa đánh giá',
  },
  en: {
    all: 'All',
    completed: 'Completed',
    rated: 'Rated',
    unrated: 'Unrated',
  },
};

const historyDateFilterLabels = {
  ja: { date: '日付', clear: '解除' },
  vi: { date: 'Ngày', clear: 'Xóa' },
  en: { date: 'Date', clear: 'Clear' },
};

function formatDateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatHistoryPlace(value, language = 'ja') {
  const text = String(value ?? '').trim();
  if (!text) return '-';

  const repaired = text
    .replace(/H\?\s*G\?\?m/gi, 'Hồ Gươm')
    .replace(/Ho\?n\s*Ki\?m/gi, 'Hoàn Kiếm')
    .replace(/Hoan\s*Kiem/gi, 'Hoàn Kiếm')
    .replace(/Hanoi/gi, 'Hà Nội')
    .replace(/\s+/g, ' ');

  if (language === 'vi') {
    return repaired
      .replace(/West Lake/gi, 'Hồ Tây')
      .replace(/Hoan Kiem Lake/gi, 'Hồ Hoàn Kiếm');
  }

  return repaired;
}

function formatEmailDisplayName(value) {
  const localPart = String(value ?? '').split('@')[0].trim();
  if (!localPart) return '';
  return localPart
    .replace(/[._-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/(driver|customer|user)$/i, ' $1')
    .replace(/\s+/g, ' ')
    .trim();
}

function getDisplayName(profile, fallback = '') {
  const storedEmail = localStorage.getItem('jpTaxiDriverEmail') || localStorage.getItem('jpTaxiUserEmail') || '';
  const name = [profile.lastName, profile.firstName]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ');
  const emailName = formatEmailDisplayName(profile.email || storedEmail);
  return name
    || emailName
    || fallback
    || '';
}

function readStoredDriverRatings() {
  let stored = [];
  try {
    stored = JSON.parse(localStorage.getItem('jpTaxiDriverRatings') || '[]');
  } catch {
    stored = [];
  }

  if (!Array.isArray(stored)) return [];
  return stored
    .filter((item) => Number(item?.score) > 0)
    .map((item) => ({
      tripId: item.tripId,
      score: Number(item.score),
      tags: Array.isArray(item.tags) ? item.tags : [],
      comment: item.comment || null,
      createdAt: item.createdAt || null,
    }));
}

function readProfileTripRatings(trips = []) {
  return trips
    .map((trip) => ({
      tripId: trip.tripId,
      score: Number(trip.rating?.score),
      comment: trip.rating?.comment || null,
      createdAt: trip.rating?.createdAt || null,
    }))
    .filter((item) => Number.isFinite(item.score) && item.score > 0);
}

function mergeRatings(...ratingGroups) {
  const byTrip = new Map();
  ratingGroups.flat().forEach((rating) => {
    const score = Number(rating?.score);
    if (!Number.isFinite(score) || score <= 0) return;
    const key = String(rating.tripId ?? `local-${byTrip.size}`);
    if (!byTrip.has(key)) {
      byTrip.set(key, { ...rating, score });
    }
  });
  return [...byTrip.values()];
}

function summarizeRatings(items = []) {
  const scores = items.map((item) => Number(item.score)).filter((score) => Number.isFinite(score) && score > 0);
  if (!scores.length) return { averageScore: null, ratingCount: 0 };
  const total = scores.reduce((sum, score) => sum + score, 0);
  return {
    averageScore: Math.round((total / scores.length) * 100) / 100,
    ratingCount: scores.length,
  };
}

export default function DriverInfoPage() {
  const navigate = useNavigate();
  const { section } = useParams();
  const requestedSection = section === 'payment' ? 'payout' : section;
  const activeSection = driverMenu.some((item) => item.id === requestedSection) ? requestedSection : 'basic';
  const [online, setOnline] = useState(true);
  const [modal, setModal] = useState(null);
  const [profile, setProfile] = useState(fallbackDriver);
  const [bankAccount, setBankAccount] = useState(fallbackDriver.bankAccount);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState(getStoredProfileLanguage);
  const [visaCard, setVisaCard] = useState(defaultVisaCard);
  const [avatarFileName, setAvatarFileName] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [croppedAvatarFile, setCroppedAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [documentUploadingKey, setDocumentUploadingKey] = useState('');
  const [documentUploadError, setDocumentUploadError] = useState('');
  const [ratings, setRatings] = useState([]);
  const [ratingsSummary, setRatingsSummary] = useState({ averageScore: null, ratingCount: 0 });
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historyDate, setHistoryDate] = useState('');
  const text = profileText[language] || profileText.ja;
  const common = text.common;
  const driverText = text.driver;
  const historyDateText = historyDateFilterLabels[language] || historyDateFilterLabels.ja;

  useEffect(() => {
    let ignore = false;
    async function loadProfile() {
      setLoading(true);
      try {
        const data = normalizeProfile(await getDriverProfile());
        if (!ignore) {
          setProfile(data);
          setBankAccount(data.bankAccount);
        }
      } catch (error) {
        if (!ignore) setStatus(error.message || text.status.driverDemo);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadProfile();
    return () => {
      ignore = true;
    };
  }, [text.status.driverDemo]);

  useEffect(() => {
    if (loading) return undefined;
    let ignore = false;

    async function loadRatings() {
      const result = await getDriverRatings({ limit: 50 }).catch(() => null);
      const apiRatings = Array.isArray(result?.items) ? result.items : [];
      const profileRatings = readProfileTripRatings(profile.trips);
      const storedRatings = readStoredDriverRatings();
      const mergedRatings = mergeRatings(apiRatings, profileRatings, storedRatings);
      const summary = await (
        profile.driverId
          ? getPublicDriverRatingSummary(profile.driverId)
          : getDriverRatingsSummary()
      ).catch(() => result);
      const derivedSummary = summarizeRatings(mergedRatings);
      const profileSummary = profile.stats && Number(profile.stats.ratingCount ?? 0) > 0
        ? {
            averageScore: profile.stats.averageRating,
            ratingCount: profile.stats.ratingCount,
          }
        : null;
      const resolvedSummary = [summary, profileSummary, derivedSummary]
        .filter((item) => Number(item?.ratingCount ?? 0) > 0)
        .sort((a, b) => Number(b.ratingCount ?? 0) - Number(a.ratingCount ?? 0))[0]
        || { averageScore: null, ratingCount: 0 };

      if (ignore) return;
      setRatings(mergedRatings);
      setRatingsSummary({
        averageScore: resolvedSummary?.averageScore ?? null,
        ratingCount: Number(resolvedSummary?.ratingCount ?? 0),
      });
    }

    loadRatings();
    return () => {
      ignore = true;
    };
  }, [loading, profile.driverId, profile.stats?.averageRating, profile.stats?.ratingCount, profile.trips]);

  useEffect(() => {
    function syncLanguage(event) {
      setLanguage(event.detail?.language || getStoredProfileLanguage());
    }

    window.addEventListener(LANGUAGE_EVENT, syncLanguage);
    return () => window.removeEventListener(LANGUAGE_EVENT, syncLanguage);
  }, []);

  useEffect(() => () => {
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
  }, [avatarPreviewUrl]);

  const fullName = getDisplayName(profile, common.unregistered);
  const avatarInitial = fullName.slice(0, 1) || profile.lastName.slice(0, 1);
  const avatar = profile.avatarUrl;
  const vehicle = profile.vehicle || fallbackDriver.vehicle;
  const primaryLicense = profile.licenses[0] || {};
  const vehiclePhoto = resolveAssetUrl(profile.documents?.vehiclePhoto || vehicle.vehiclePhotoUrl);
  const driverDocuments = [
    { key: 'portrait', label: driverText.portraitPhoto, icon: '🧑', url: profile.documents?.portrait || profile.avatarUrl },
    { key: 'licenseFront', label: driverText.licenseFront, icon: '📄', url: profile.documents?.licenseFront || primaryLicense.frontImageUrl },
    { key: 'licenseBack', label: driverText.licenseBack, icon: '🪪', url: profile.documents?.licenseBack || primaryLicense.backImageUrl },
    { key: 'vehiclePhoto', label: driverText.vehicleInfo, icon: '🚗', url: profile.documents?.vehiclePhoto || vehicle.vehiclePhotoUrl },
    { key: 'registrationPaper', label: driverText.registrationPaper, icon: '📘', url: profile.documents?.registrationPaper || vehicle.registrationPaperUrl },
  ];
  const completedDocumentCount = driverDocuments.filter((item) => item.url).length;
  const isCountedHistoryTrip = (trip) => trip.status !== 'cancelled' && trip.status !== 'cancelled_by_admin';
  const historyStatsTrips = profile.trips.filter(isCountedHistoryTrip);
  const fallbackCompletedTrips = historyStatsTrips.length;
  const fallbackTotalSales = historyStatsTrips.reduce((sum, trip) => sum + parseNumericAmount(trip.finalFareJpy), 0);
  const completedTrips = fallbackCompletedTrips || Number(profile.stats?.completedTrips ?? 0);
  const totalSales = fallbackTotalSales || Number(profile.stats?.totalSalesJpy ?? 0);
  const visibleRatings = mergeRatings(ratings, readProfileTripRatings(profile.trips));
  const visibleRatingsSummary = summarizeRatings(visibleRatings);
  const profileRatingsSummary = profile.stats && Number(profile.stats.ratingCount ?? 0) > 0
    ? { averageScore: profile.stats.averageRating, ratingCount: profile.stats.ratingCount }
    : null;
  const displayRatingsSummary = [visibleRatingsSummary, ratingsSummary, profileRatingsSummary]
    .find((item) => Number(item?.ratingCount ?? 0) > 0)
    || { averageScore: null, ratingCount: 0 };
  const averageRating = displayRatingsSummary.averageScore == null ? '0.0' : Number(displayRatingsSummary.averageScore).toFixed(1);
  const ratingCount = Number(displayRatingsSummary.ratingCount ?? 0);
  const getHistoryRating = (trip) => visibleRatings.find((item) => String(item.tripId) === String(trip.tripId));
  const filteredHistoryTrips = profile.trips.filter((trip) => {
    const rating = getHistoryRating(trip);
    if (historyDate && formatDateInputValue(trip.startTime) !== historyDate) return false;
    if (historyFilter === 'rated') return Boolean(rating);
    if (historyFilter === 'unrated') return !rating;
    if (historyFilter === 'completed') return isCountedHistoryTrip(trip);
    return true;
  });

  const modalTitle = {
    account: driverText.modal.account,
    avatar: common.changeImage,
    vehicle: driverText.modal.vehicle,
    visaCard: common.addVisaCard,
    password: driverText.modal.password,
    bank: driverText.modal.bank,
    rating: `${driverText.ratingLabel} - ${common.details}`,
    saved: driverText.modal.saved,
    error: driverText.modal.error,
  }[modal] || driverText.modal.detail;

  function updateField(field, value) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function updateBankField(field, value) {
    setBankAccount((current) => ({ ...current, [field]: value }));
  }

  function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFileName(file.name);
    setAvatarFile(file);
    setCroppedAvatarFile(null);
    setAvatarPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  }

  async function handleAvatarUpload() {
    if (!avatarFile || !croppedAvatarFile) return;
    setAvatarUploading(true);
    try {
      const url = await uploadAvatar(croppedAvatarFile);
      if (url) {
        const updated = await updateDriverProfile({
          lastName: profile.lastName,
          firstName: profile.firstName,
          gender: profile.gender,
          birthDate: profile.birthDate,
          phone: profile.phone,
          email: profile.email,
          nationality: profile.nationality,
          idNumber: profile.idNumber || null,
          japaneseLevel: profile.japaneseLevel,
          avatarUrl: url,
        });
        setProfile(normalizeProfile(updated));
        setStatus(text.status.dbSaved);
        setModal(null);
      }
    } catch (error) {
      setStatus(error.message || text.status.avatarFailed);
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleDocumentChange(item, event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setDocumentUploadingKey(item.key);
    setDocumentUploadError('');
    try {
      const url = await uploadDriverDocument(documentUploadTypes[item.key], file);
      const updated = await updateDriverDocuments({ [item.key]: url });
      setProfile(normalizeProfile(updated));
      setStatus(text.status.dbSaved);
    } catch (error) {
      setDocumentUploadError(error.message || text.status.avatarFailed);
    } finally {
      setDocumentUploadingKey('');
    }
  }

  function updateVisaCardField(field, value) {
    setVisaCard((current) => ({
      ...current,
      [field]:
        field === 'number'
          ? normalizeCardNumber(value)
          : field === 'expiry'
            ? formatExpiry(value)
            : field === 'securityCode'
              ? String(value ?? '').replace(/\D/g, '').slice(0, 4)
              : value,
    }));
  }

  async function saveProfile() {
    try {
      const updated = await updateDriverProfile({
        lastName: profile.lastName,
        firstName: profile.firstName,
        gender: profile.gender,
        birthDate: profile.birthDate,
        phone: profile.phone,
        email: profile.email,
        nationality: profile.nationality,
        idNumber: profile.idNumber || null,
        japaneseLevel: profile.japaneseLevel,
        avatarUrl: profile.avatarUrl || null,
      });
      const normalized = normalizeProfile(updated);
      setProfile(normalized);
      setBankAccount(normalized.bankAccount);
      setModal('saved');
      setStatus(text.status.dbSaved);
    } catch (error) {
      setModal('error');
      setStatus(error.message || text.status.driverSaveFailed);
    }
  }

  async function saveBankAccount() {
    try {
      const updated = await updateDriverBankAccount(bankAccount);
      const normalized = normalizeProfile(updated);
      setProfile(normalized);
      setBankAccount(normalized.bankAccount);
      setModal('saved');
      setStatus(text.status.driverBankSaved);
    } catch (error) {
      setModal('error');
      setStatus(error.message || text.status.driverBankFailed);
    }
  }

  function changeLanguage(nextLanguage) {
    setLanguage(setStoredProfileLanguage(nextLanguage));
  }

  function handleLogout() {
    localStorage.removeItem('jpTaxiToken');
    localStorage.removeItem('jpTaxiRole');
    localStorage.removeItem('jpTaxiUserEmail');
    localStorage.removeItem('jpTaxiCustomerId');
    localStorage.removeItem('jpTaxiDriverId');
    localStorage.removeItem('jpTaxiFallbackRide');
    localStorage.removeItem('jpTaxiPaymentRequested');
    sessionStorage.removeItem('jpTaxiRideRequestId');
    sessionStorage.removeItem('jpTaxiTripId');
    sessionStorage.removeItem('jpTaxiSelectedRoute');
    navigate('/login', { replace: true });
  }

  function renderDocumentCard(item) {
    const src = resolveAssetUrl(item.url);
    const isUploading = documentUploadingKey === item.key;
    return (
      <article className={`driver-document-card ${src ? 'has-image' : ''}`} key={item.key}>
        <div className="driver-document-media">
          {src ? <a href={src} target="_blank" rel="noreferrer"><img src={src} alt={item.label} /></a> : <span>{item.icon}</span>}
        </div>
        <div className="driver-document-meta">
          <strong>{item.label}</strong>
          <span>{src ? driverText.documentsComplete : driverText.noDocumentImage}</span>
        </div>
        <label className="secondary-button driver-document-change">
          <span>{isUploading ? common.uploading : common.edit}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={Boolean(documentUploadingKey)} onChange={(event) => handleDocumentChange(item, event)} />
        </label>
      </article>
    );
  }

  function renderTab() {
    if (activeSection === 'vehicle') {
      return (
        <div className="driver-vehicle-page">
          <section className="panel zip-profile-panel driver-vehicle-panel">
            <div className="driver-vehicle-hero">
              <div className="driver-vehicle-photo">
                {vehiclePhoto ? <img src={vehiclePhoto} alt={driverText.vehicleInfo} /> : <span>🚗</span>}
              </div>
              <div className="driver-vehicle-summary">
                <h2 className="panel-title">{driverText.vehicleInfo}</h2>
                <div className="driver-info-card">
                  <span>🚗</span>
                  <div>
                    <strong>{vehicle.brand || common.unregistered} <small>({vehicle.color || '-'})</small></strong>
                    <p>{driverText.plate}: {vehicle.licensePlate || '-'} / {driverText.seats}: {vehicle.vehicleType || '-'}</p>
                  </div>
                  <em>{driverText.verified}</em>
                </div>
                <div className="driver-vehicle-facts">
                  <article><span>{driverText.modal.manufacturer}</span><strong>{vehicle.brand || '-'}</strong></article>
                  <article><span>{common.color}</span><strong>{vehicle.color || '-'}</strong></article>
                  <article><span>{driverText.plate}</span><strong>{vehicle.licensePlate || '-'}</strong></article>
                  <article><span>{driverText.seats}</span><strong>{vehicle.vehicleType || '-'}</strong></article>
                  <article><span>{driverText.manufactureYear}</span><strong>{vehicle.manufactureYear || '-'}</strong></article>
                </div>
                <div className="vehicle-actions">
                  <button className="submit-button profile-save-button" type="button" onClick={() => setModal('vehicle')}>{common.edit}</button>
                </div>
              </div>
            </div>
          </section>

          <section className="panel zip-profile-panel driver-documents-panel">
            <div className="driver-documents-heading">
              <h2 className="panel-title">{driverText.documentImages}</h2>
              <span>{completedDocumentCount} / {driverDocuments.length}</span>
            </div>
            <div className="driver-documents-grid">
              {driverDocuments.map(renderDocumentCard)}
            </div>
            {documentUploadError && <span className="field-error">{documentUploadError}</span>}
          </section>
        </div>
      );
    }

    if (activeSection === 'history') {
      const historySummaryTrips = filteredHistoryTrips.length ? filteredHistoryTrips : profile.trips;
      const historySummaryCount = historySummaryTrips.filter(isCountedHistoryTrip).length;
      const historySummarySales = historySummaryTrips.reduce((sum, trip) => (
        isCountedHistoryTrip(trip) ? sum + parseNumericAmount(trip.finalFareJpy) : sum
      ), 0);
      const historySummaryRatings = mergeRatings(
        historySummaryTrips.map((trip) => getHistoryRating(trip)).filter(Boolean),
        readProfileTripRatings(historySummaryTrips),
      );
      const historyRatingSummary = summarizeRatings(historySummaryRatings);
      const historyAverageRating = historyRatingSummary.ratingCount
        ? Number(historyRatingSummary.averageScore).toFixed(1)
        : averageRating;

      return (
        <section className="panel zip-profile-panel">
          <h2 className="panel-title">{driverText.historyTitle}</h2>
          <div className="trip-summary">
            <article><span>{driverText.completedTrips}</span><strong>{historySummaryCount || completedTrips}</strong></article>
            <article><span>{driverText.ratingLabel}</span><strong>{historyAverageRating}</strong></article>
            <article><span>{driverText.sales}</span><strong>{formatCurrency(historySummarySales || totalSales)}</strong></article>
          </div>
          <div className="driver-history-filter-row">
            <div className="driver-history-filters" aria-label={driverText.historyTitle}>
              {Object.entries(historyFilterLabels[language] || historyFilterLabels.ja).map(([value, label]) => (
                <button className={historyFilter === value ? 'active' : ''} type="button" key={value} onClick={() => setHistoryFilter(value)}>{label}</button>
              ))}
            </div>
            <label className="driver-history-date-filter">
              <span>{historyDateText.date}</span>
              <input type="date" value={historyDate} onChange={(event) => setHistoryDate(event.target.value)} />
              {historyDate ? <button type="button" onClick={() => setHistoryDate('')}>{historyDateText.clear}</button> : null}
            </label>
          </div>
          <div className="modal-list history-list">
            {filteredHistoryTrips.length ? filteredHistoryTrips.map((trip) => {
              const rating = getHistoryRating(trip);
              return (
                <article className="driver-history-item" key={trip.tripId || `${trip.startTime}-${trip.pickupAddress}`}>
                  <span className="driver-history-main">
                    {formatDate(trip.startTime, text.locale)} {formatHistoryPlace(trip.pickupAddress, language)} → {formatHistoryPlace(trip.dropoffAddress, language)} / {formatCurrency(trip.finalFareJpy)}
                  </span>
                  <span className="driver-history-actions">
                    <strong className="driver-history-rating">{rating ? `⭐ ${Number(rating.score).toFixed(1)}` : '-'}</strong>
                    <button className="driver-history-detail" type="button" onClick={() => { setSelectedHistory({ trip, rating }); setModal('rating'); }}>{common.details}<span>›</span></button>
                  </span>
                </article>
              );
            }) : <span>{driverText.noHistory}</span>}
          </div>
        </section>
      );
    }

    if (activeSection === 'payout') {
      return (
        <section className="panel zip-profile-panel narrow-panel">
          <h2 className="panel-title">{driverText.payoutTitle}</h2>
          <div className="setting-list">
            <button className="account-card" type="button" onClick={() => setModal('visaCard')}><strong>{common.visaCard}</strong><span>{common.visaCard} **** {getCardLastFour(visaCard.number)}</span></button>
            <button className="account-card" type="button" onClick={() => setModal('bank')}><strong>{driverText.bank}</strong><span>{bankAccount.bankName} **** {bankAccount.accountNumber.slice(-4)}</span></button>
            <button className="submit-button profile-save-button" type="button" onClick={() => setModal('visaCard')}>{common.addVisaCard}</button>
            <button className="submit-button profile-save-button" type="button" onClick={() => setModal('bank')}>{common.edit}</button>
          </div>
        </section>
      );
    }

    if (activeSection === 'language') {
      return (
        <section className="panel zip-profile-panel narrow-panel">
          <h2 className="panel-title">{driverText.menu.language}</h2>
          <label>
            <span>{text.user.displayLanguage}</span>
            <select value={language} onChange={(event) => changeLanguage(event.target.value)}>
              {languageOptions.map((option) => (
                <option value={option.value} key={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </section>
      );
    }

    if (activeSection === 'logout') {
      return (
        <section className="panel zip-profile-panel narrow-panel">
          <h2 className="panel-title">{common.logout}</h2>
          <p className="muted-copy">{driverText.logoutCopy}</p>
          <button className="submit-button profile-save-button" type="button" onClick={handleLogout}>{common.logout}</button>
        </section>
      );
    }

    return (
      <div className="driver-reference-grid">
        <div>
          <label className="status-toggle">
            <span>
              <strong>{online ? driverText.online : driverText.offline}</strong>
              <small>{online ? driverText.onlineCopy : driverText.offlineCopy}</small>
            </span>
            <span className="switch"><input type="checkbox" checked={online} onChange={(event) => setOnline(event.target.checked)} /><span></span></span>
          </label>

          <section className="panel zip-profile-panel driver-basic-card">
            <h2 className="panel-title">{driverText.basicInfo}</h2>
            <div className="profile-detail-grid profile-detail-edit-grid">
              <label>
                <span>{driverText.modal.displayName}</span>
                <span className="profile-inline-name">
                  <input aria-label={common.lastName} placeholder={common.lastName} value={profile.lastName} onChange={(event) => updateField('lastName', event.target.value)} />
                  <input aria-label={common.firstName} placeholder={common.firstName} value={profile.firstName} onChange={(event) => updateField('firstName', event.target.value)} />
                </span>
              </label>
              <label><span>{common.phone}</span><input value={profile.phone} onChange={(event) => updateField('phone', event.target.value)} /></label>
              <label><span>{driverText.nationality}</span><input value={profile.nationality} onChange={(event) => updateField('nationality', event.target.value)} /></label>
              <label><span>{common.email}</span><input type="email" value={profile.email} onChange={(event) => updateField('email', event.target.value)} /></label>
              <label>
                <span>{driverText.japaneseLevel}</span>
                <select value={profile.japaneseLevel} onChange={(event) => updateField('japaneseLevel', event.target.value)}>
                  {['N5', 'N4', 'N3', 'N2', 'N1', 'Native'].map((level) => <option value={level} key={level}>{level}</option>)}
                </select>
              </label>
              <label><span>{common.birthDate}</span><input type="date" value={profile.birthDate} onChange={(event) => updateField('birthDate', event.target.value)} /></label>
            </div>
          </section>

          <section className="panel zip-profile-panel stack">
            <h2 className="panel-title">{driverText.vehicleInfo}</h2>
            <div className="driver-info-card">
              <span>🚗</span>
              <div>
                <strong>{vehicle.brand} <small>({vehicle.color})</small></strong>
                <p>{driverText.plate}: {vehicle.licensePlate} • {driverText.seats}: {vehicle.vehicleType}</p>
              </div>
              <em>✓ {driverText.verified}</em>
            </div>
          </section>
        </div>

        <div>
          <section className="panel zip-profile-panel">
            <h2 className="panel-title">{driverText.docs}</h2>
            <div className="doc-list">
              <button type="button" onClick={() => setModal('license')}>🪪 {driverText.license} <strong>{profile.licenses.length ? common.approved : common.unregistered}</strong></button>
              <button type="button" onClick={() => setModal('vehicle')}>📘 {driverText.inspection} <strong>{common.approved}</strong></button>
              <button className="warning" type="button" onClick={() => setModal('insurance')}>📋 {driverText.insurance} <strong>{driverText.updateRequired}</strong></button>
            </div>
          </section>

          <section className="panel zip-profile-panel stack">
            <h2 className="panel-title">{driverText.accountSafety}</h2>
            <div className="security-list">
              <article className="security-item">
                <strong>{common.password}</strong>
                <button className="link-btn" type="button" onClick={() => setModal('password')}>{common.edit}</button>
              </article>
              <article className="security-item">
                <strong>{driverText.twoFactor}</strong>
                <span>{driverText.twoFactorEnabled}</span>
                <button className="link-btn" type="button" onClick={() => setModal('twoFactor')}>{common.check}</button>
              </article>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <PageShell withFooter={false}>
      <main className="app-screen zip-profile-screen">
        <div className="profile-window">
          <Topbar brandTo="/driver-home" brandExtra="for Driver" actions={<><Link to="/driver-home">{common.home}</Link><Link to="/messages/customer">{common.messages}</Link>{avatar ? <img className="topbar-avatar driver-avatar-top" src={avatar} alt="" /> : <span className="topbar-avatar driver-avatar-top" />}</>} />
          <section className="profile-page-shell zip-profile-shell">
            <aside className="profile-sidebar">
              <section className="profile-card zip-profile-card driver-profile-card">
                <div className="profile-avatar">
                  {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} /> : avatarInitial}
                </div>
                <strong>{fullName}</strong>
                <span>⭐ {averageRating} / 5.0 ({ratingCount} {driverText.rating})</span>
                <em>{driverText.role}</em>
                <button className="link-btn" type="button" onClick={() => setModal('avatar')}>{common.changeImage}</button>
              </section>
              <nav className="side-menu" aria-label={driverText.pageTitle}>
                {driverMenu.map((tab) => (
                  <NavLink className={({ isActive }) => `side-item ${isActive || activeSection === tab.id ? 'active' : ''}`} to={tab.to} key={tab.id}>
                    <span>{tab.icon}</span>
                    <span>{driverText.menu[tab.id]}</span>
                  </NavLink>
                ))}
              </nav>
            </aside>

            <section className="profile-content">
              <div className="profile-header zip-profile-header">
                <div>
                  <h1>{driverText.pageTitle}</h1>
                  <p>{driverText.pageSubtitle}</p>
                  {status && <p className="muted-copy">{status}</p>}
                </div>
                <button className="submit-button profile-save-button" type="button" onClick={saveProfile}>{driverText.saveInfo}</button>
              </div>
              {renderTab()}
            </section>
          </section>
          <Footer />
        </div>

        <Modal className={modal === 'rating' ? 'driver-rating-modal' : ''} open={Boolean(modal)} title={modalTitle} onClose={() => setModal(null)}>
          {modal === 'account' && (
            <div className="modal-form zip-modal-form">
              <div className="form-grid">
                <label><span>{common.lastName}</span><input value={profile.lastName} onChange={(event) => updateField('lastName', event.target.value)} /></label>
                <label><span>{common.firstName}</span><input value={profile.firstName} onChange={(event) => updateField('firstName', event.target.value)} /></label>
                <label><span>{common.phone}</span><input value={profile.phone} onChange={(event) => updateField('phone', event.target.value)} /></label>
                <label><span>{common.email}</span><input type="email" value={profile.email} onChange={(event) => updateField('email', event.target.value)} /></label>
                <label><span>{driverText.nationality}</span><input value={profile.nationality} onChange={(event) => updateField('nationality', event.target.value)} /></label>
      <label>
        <span>{driverText.japaneseLevel}</span>
        <select value={profile.japaneseLevel} onChange={(event) => updateField('japaneseLevel', event.target.value)}>
          {['N5', 'N4', 'N3', 'N2', 'N1', 'Native'].map((level) => <option value={level} key={level}>{level}</option>)}
        </select>
      </label>
      <label>
        <span>{common.gender}</span>
        <select value={profile.gender} onChange={(event) => updateField('gender', event.target.value)}>
          <option value="Male">{common.male}</option>
          <option value="Female">{common.female}</option>
          <option value="Other">{common.other}</option>
        </select>
      </label>
      <label>
        <span>{common.birthDate}</span>
        <input type="date" value={profile.birthDate} onChange={(event) => updateField('birthDate', event.target.value)} />
      </label>
      <label className="field full">
        <span>{driverText.identityNumber}</span>
        <input value={profile.idNumber || ''} onChange={(event) => updateField('idNumber', event.target.value)} />
      </label>
    </div>
              <button className="submit-button profile-save-button" type="button" onClick={saveProfile}>{common.save}</button>
            </div>
          )}
          {modal === 'avatar' && (
            <div className="modal-form zip-modal-form">
              <div className="profile-avatar profile-avatar-preview">
                {avatar ? <img src={avatar} alt={fullName} /> : avatarInitial}
              </div>
              <strong className="profile-avatar-name">{fullName || common.unregistered}</strong>
              <label className="avatar-file-picker">
                <span className="avatar-file-icon">🖼️</span>
                <span className="avatar-file-copy">
                  <strong>{common.changeImage}</strong>
                  <small>{avatarFileName || common.imageFile}</small>
                </span>
                <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleAvatarChange} />
              </label>
              <AvatarCropper src={avatarPreviewUrl} fileName={avatarFileName} onCrop={setCroppedAvatarFile} />
              <button
                className="submit-button profile-save-button"
                type="button"
                disabled={!croppedAvatarFile || avatarUploading}
                onClick={handleAvatarUpload}
              >
                {avatarUploading ? common.uploading : common.save}
              </button>
            </div>
          )}
          {modal === 'vehicle' && (
            <div className="modal-form zip-modal-form">
              <div className="form-grid">
                <label><span>{driverText.modal.manufacturer}</span><input value={vehicle.brand || ''} readOnly /></label>
                <label><span>{common.color}</span><input value={vehicle.color || ''} readOnly /></label>
                <label><span>{driverText.seats}</span><input value={vehicle.vehicleType || ''} readOnly /></label>
                <label><span>{driverText.plate}</span><input value={vehicle.licensePlate || ''} readOnly /></label>
              </div>
              <div className="license-preview-card">
                <span className="license-preview-title">{driverText.vehicleInfo}</span>
                <div className="license-preview-frame large">
                  {vehiclePhoto ? <img src={vehiclePhoto} alt={driverText.vehicleInfo} /> : <span>🚗</span>}
                </div>
                <label className="avatar-file-picker">
                  <span className="avatar-file-icon">🖼️</span>
                  <span className="avatar-file-copy">
                    <strong>{common.changeImage}</strong>
                    <small>{common.imageFile}</small>
                  </span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => handleDocumentChange({ key: 'vehiclePhoto' }, event)} />
                </label>
              </div>
              <p className="modal-copy">{driverText.modal.vehicleDbCopy}</p>
            </div>
          )}
          {modal === 'visaCard' && (
            <div className="modal-form zip-modal-form visa-card-form">
              <div className="visa-card-preview">
                <span>VISA</span>
                <strong>**** **** **** {getCardLastFour(visaCard.number)}</strong>
                <small>{visaCard.holderName || common.cardHolder} · {visaCard.expiry || 'MM/YY'}</small>
              </div>
              <div className="form-grid">
                <label className="field full"><span>{common.cardHolder}</span><input value={visaCard.holderName} onChange={(event) => updateVisaCardField('holderName', event.target.value)} /></label>
                <label className="field full"><span>{common.cardNumber}</span><input inputMode="numeric" value={formatCardNumber(visaCard.number)} onChange={(event) => updateVisaCardField('number', event.target.value)} /></label>
                <label><span>{common.expiryDate}</span><input inputMode="numeric" placeholder="MM/YY" value={visaCard.expiry} onChange={(event) => updateVisaCardField('expiry', event.target.value)} /></label>
                <label><span>{common.securityCode}</span><input type="password" inputMode="numeric" maxLength={4} value={visaCard.securityCode} onChange={(event) => updateVisaCardField('securityCode', event.target.value)} /></label>
                <label className="field full"><span>{common.billingAddress}</span><input value={visaCard.billingAddress} onChange={(event) => updateVisaCardField('billingAddress', event.target.value)} /></label>
              </div>
              <button className="submit-button profile-save-button" type="button" onClick={() => setModal(null)}>{common.saveCard}</button>
            </div>
          )}
          {modal === 'bank' && (
            <div className="modal-form zip-modal-form">
              <label><span>{driverText.bankName}</span><input value={bankAccount.bankName} onChange={(event) => updateBankField('bankName', event.target.value)} /></label>
              <label><span>{driverText.accountNumber}</span><input value={bankAccount.accountNumber} onChange={(event) => updateBankField('accountNumber', event.target.value)} /></label>
              <label><span>{driverText.accountHolder}</span><input value={bankAccount.accountHolder} onChange={(event) => updateBankField('accountHolder', event.target.value)} /></label>
              <button className="submit-button profile-save-button" type="button" onClick={saveBankAccount}>{common.save}</button>
            </div>
          )}
          {modal === 'password' && (
            <div className="modal-form zip-modal-form">
              <label><span>{driverText.modal.currentPassword}</span><input type="password" /></label>
              <label><span>{driverText.modal.newPassword}</span><input type="password" /></label>
              <button className="submit-button profile-save-button" type="button" onClick={() => setModal(null)}>{common.save}</button>
            </div>
          )}
          {modal === 'rating' && selectedHistory && (
            <div className="driver-rating-detail">
              <div className="driver-rating-score">
                <div>
                  <strong>{selectedHistory.rating ? Number(selectedHistory.rating.score).toFixed(1) : '-'}</strong>
                  <small>{selectedHistory.rating?.scoreLabelJa || '評価はまだありません'}</small>
                </div>
              </div>
              <div className="driver-rating-stars" aria-label={`${selectedHistory.rating?.score || 0} stars`}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const fill = Math.max(0, Math.min(1, Number(selectedHistory.rating?.score || 0) - (star - 1))) * 100;
                  return <span style={{ '--star-fill': `${fill}%` }} key={star}>★</span>;
                })}
              </div>
              <section className="driver-rating-trip-card">
                <div className="driver-rating-trip-heading">
                  <span>Trip #{selectedHistory.trip.tripId}</span>
                  <em>{formatTripStatus(selectedHistory.trip.status)}</em>
                </div>
                <div className="driver-rating-route">
                  <article>
                    <span className="point-dot pickup"></span>
                    <div><small>出発地</small><strong>{formatHistoryPlace(selectedHistory.trip.pickupAddress, language)}</strong></div>
                  </article>
                  <article>
                    <span className="point-dot destination"></span>
                    <div><small>目的地</small><strong>{formatHistoryPlace(selectedHistory.trip.dropoffAddress, language)}</strong></div>
                  </article>
                </div>
                <div className="driver-rating-trip-facts">
                  <article><span>乗車日</span><strong>{formatDate(selectedHistory.trip.startTime, text.locale)}</strong></article>
                  <article><span>走行距離</span><strong>{Number(selectedHistory.trip.distanceKm || 0).toFixed(1)} km</strong></article>
                  <article><span>料金</span><strong>{formatCurrency(selectedHistory.trip.finalFareJpy)}</strong></article>
                </div>
              </section>
              <dl>
                <div><dt>お客様</dt><dd>{selectedHistory.rating?.customerName || '-'}</dd></div>
                <div><dt>評価日</dt><dd>{selectedHistory.rating ? formatDate(selectedHistory.rating.createdAt, text.locale) : '-'}</dd></div>
              </dl>
              <section className="driver-rating-feedback">
                <strong>良かった点</strong>
                {selectedHistory.rating?.tags?.length
                  ? <div className="driver-rating-tags">{selectedHistory.rating.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                  : <small>選択された項目はありません。</small>}
              </section>
              <section className="driver-rating-feedback">
                <strong>お客様からのコメント</strong>
                <p className="driver-rating-comment">{selectedHistory.rating?.comment || 'お客様からのコメントはまだありません。'}</p>
              </section>
            </div>
          )}
          {modal && !['account', 'avatar', 'vehicle', 'visaCard', 'bank', 'password', 'rating'].includes(modal) && <p className="modal-copy">{status || driverText.modal.defaultCopy}</p>}
        </Modal>
      </main>
    </PageShell>
  );
}
