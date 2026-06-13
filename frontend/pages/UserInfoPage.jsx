import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import AvatarCropper from '../components/AvatarCropper.jsx';
import Footer from '../components/Footer.jsx';
import Modal from '../components/Modal.jsx';
import PageShell from '../components/PageShell.jsx';
import Topbar from '../components/Topbar.jsx';
import {
  getCustomerProfile,
  resolveAssetUrl,
  updateCustomerProfile,
  uploadAvatar,
} from '../api/accounts.js';
import { changePassword } from '../api/auth.js';
import {
  addPaymentMethod,
  deleteSavedPlace,
  getLoginHistory,
  getNotificationPreferences,
  getPaymentMethods,
  getSavedPlaces,
  savePlace,
  updateNotificationPreferences,
} from '../api/customers.js';
import {
  getStoredProfileLanguage,
  languageOptions,
  LANGUAGE_EVENT,
  profileText,
  setStoredProfileLanguage,
} from '../i18n/profileLanguage.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { translateApiError } from '../i18n/errors.js';
import '../styles/app-pages.css';
import { clearAuthSession } from '../utils/session.js';

const userMenu = [
  { id: 'profile', icon: '👤', to: '/user-info/profile' },
  { id: 'security', icon: '🔒', to: '/user-info/security' },
  { id: 'notifications', icon: '🔔', to: '/user-info/notifications' },
  { id: 'payment', icon: '💳', to: '/user-info/payment' },
  { id: 'language', icon: '🌐', to: '/user-info/language' },
  { id: 'logout', icon: '🚪', to: '/user-info/logout' },
];

const defaultVisaCard = {
  holderName: '',
  number: '',
  expiry: '',
  securityCode: '',
  billingAddress: '',
};

const cardMessages = {
  ja: {
    holderRequired: 'カード名義を入力してください。',
    numberInvalid: 'カード番号は12〜19桁で入力してください。',
    securityInvalid: 'セキュリティコードは3桁または4桁で入力してください。',
    expiryInvalid: '有効な有効期限をMM/YYYY形式で入力してください。',
    saveFailed: '支払い方法を追加できませんでした。',
  },
  vi: {
    holderRequired: 'Vui lòng nhập tên chủ thẻ.',
    numberInvalid: 'Số thẻ phải có từ 12 đến 19 chữ số.',
    securityInvalid: 'Mã bảo mật phải có 3 hoặc 4 chữ số.',
    expiryInvalid: 'Vui lòng nhập hạn dùng hợp lệ theo định dạng MM/YYYY.',
    saveFailed: 'Không thể thêm phương thức thanh toán.',
  },
  en: {
    holderRequired: 'Card holder is required.',
    numberInvalid: 'Card number must contain 12 to 19 digits.',
    securityInvalid: 'Security code must contain 3 or 4 digits.',
    expiryInvalid: 'Enter a valid future expiry date in MM/YYYY format.',
    saveFailed: 'Unable to add payment method.',
  },
};

function normalizeCardNumber(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 16);
}

function formatCardNumber(value) {
  return normalizeCardNumber(value).replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value) {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 6);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function getCardLastFour(value) {
  return normalizeCardNumber(value).slice(-4) || '----';
}

const emptyProfile = {
  lastName: '',
  firstName: '',
  email: '',
  gender: 'Other',
  phone: '',
  birthDate: '',
  avatarUrl: '',
  createdAt: null,
  loginHistory: [],
};

const savedPlaceTypes = ['home', 'work', 'favorite'];

function mapSavedPlaceDrafts(places = []) {
  return savedPlaceTypes.reduce((drafts, type) => {
    const place = places.find((item) => item?.type === type);
    drafts[type] = place?.address || '';
    return drafts;
  }, {
    home: '',
    work: '',
    favorite: '',
  });
}

function normalizeProfile(profile = {}) {
  return {
    ...emptyProfile,
    ...profile,
    birthDate: profile.birthDate ? String(profile.birthDate).slice(0, 10) : emptyProfile.birthDate,
    avatarUrl: profile.avatarUrl || '',
    loginHistory: Array.isArray(profile.loginHistory) ? profile.loginHistory : [],
  };
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
  const name = [profile.lastName, profile.firstName]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ');
  const emailName = formatEmailDisplayName(profile.email);
  return name
    || emailName
    || fallback
    || '';
}

function formatDate(value, locale = 'ja-JP') {
  if (!value) return '';
  return new Date(value).toLocaleDateString(locale);
}

function getReadableError(error, fallback) {
  const message = typeof error?.message === 'string' ? error.message.trim() : '';
  return message || fallback;
}

function getSavedPlaceLabel(type) {
  if (type === 'home') return 'Home';
  if (type === 'work') return 'Work';
  return 'Favorite';
}

export default function UserInfoPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { section } = useParams();
  const activeSection = userMenu.some((item) => item.id === section) ? section : 'profile';
  const [modal, setModal] = useState(null);
  const [profile, setProfile] = useState(emptyProfile);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState(getStoredProfileLanguage);
  const [visaCard, setVisaCard] = useState(defaultVisaCard);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [notifications, setNotifications] = useState({
    rideUpdates: true,
    emailNotifications: true,
    promotions: false,
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [avatarFileName, setAvatarFileName] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarStatus, setAvatarStatus] = useState('');
  const [cardStatus, setCardStatus] = useState('');
  const [cardSaving, setCardSaving] = useState(false);
  const [loginHistory, setLoginHistory] = useState([]);
  const [loginHistoryLoading, setLoginHistoryLoading] = useState(false);
  const [loginHistoryError, setLoginHistoryError] = useState('');
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [savedPlaceDrafts, setSavedPlaceDrafts] = useState({
    home: '',
    work: '',
    favorite: '',
  });
  const [savedPlaceSaving, setSavedPlaceSaving] = useState('');
  const avatarCropperRef = useRef(null);
  const text = profileText[language] || profileText.ja;
  const common = text.common;
  const userText = text.user;

  useEffect(() => {
    let ignore = false;
    async function loadProfile() {
      setLoading(true);
      try {
        const [data, preferences, methods, places] = await Promise.all([
          getCustomerProfile(),
          getNotificationPreferences(),
          getPaymentMethods(),
          getSavedPlaces(),
        ]);
        if (!ignore) {
          setProfile(normalizeProfile(data));
          setNotifications(preferences);
          setPaymentMethods(Array.isArray(methods) ? methods : []);
          const nextPlaces = Array.isArray(places) ? places.filter(Boolean) : [];
          setSavedPlaces(nextPlaces);
          setSavedPlaceDrafts(mapSavedPlaceDrafts(nextPlaces));
        }
      } catch (error) {
        if (!ignore) setStatus(translateApiError(error, t, text.status.userLoadFailed));
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadProfile();
    return () => {
      ignore = true;
    };
  }, [text.status.userLoadFailed]);

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

  useEffect(() => {
    if (activeSection !== 'security') return undefined;

    let ignored = false;
    setLoginHistoryError('');
    setLoginHistoryLoading(true);
    getLoginHistory()
      .then((rows) => {
        if (!ignored) setLoginHistory(Array.isArray(rows) ? rows.filter(Boolean) : []);
      })
      .catch((error) => {
        if (!ignored) setLoginHistoryError(translateApiError(error, t, text.status.userLoadFailed));
      })
      .finally(() => {
        if (!ignored) setLoginHistoryLoading(false);
      });

    return () => {
      ignored = true;
    };
  }, [activeSection, text.status.userLoadFailed]);

  const fullName = getDisplayName(profile, common.unregistered);
  const avatarInitial = fullName.slice(0, 1) || profile.lastName.slice(0, 1);
  const avatar = resolveAssetUrl(profile.avatarUrl);

  const modalTitle = {
    account: userText.modal.account,
    avatar: userText.modal.avatar,
    password: userText.modal.password,
    loginHistory: userText.modal.loginHistory,
    card: userText.modal.card,
    addCard: userText.modal.addCard,
    logout: userText.modal.logout,
    saved: userText.modal.saved,
    error: userText.modal.error,
  }[modal];

  function updateField(field, value) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function updateSavedPlaceDraft(type, value) {
    setSavedPlaceDrafts((current) => ({ ...current, [type]: value }));
  }

  async function persistSavedPlace(type, explicitAddress) {
    const address = String(explicitAddress ?? savedPlaceDrafts[type] ?? '').trim();
    const existingPlace = savedPlaces.find((item) => item?.type === type);

    if (!address) {
      if (!existingPlace) return;
      await deleteSavedPlace(existingPlace.savedPlaceId);
      const remaining = savedPlaces.filter((item) => item.savedPlaceId !== existingPlace.savedPlaceId);
      setSavedPlaces(remaining);
      setSavedPlaceDrafts(mapSavedPlaceDrafts(remaining));
      return;
    }

    const saved = await savePlace(type, {
      label: getSavedPlaceLabel(type),
      address,
    });

    const nextPlaces = savedPlaces
      .filter((item) => item?.type !== type)
      .concat(saved)
      .sort((a, b) => Number(a.savedPlaceId) - Number(b.savedPlaceId));
    setSavedPlaces(nextPlaces);
    setSavedPlaceDrafts(mapSavedPlaceDrafts(nextPlaces));
  }

  async function saveSavedPlace(type) {
    setSavedPlaceSaving(type);
    try {
      await persistSavedPlace(type);
      setStatus(text.status.dbSaved);
    } catch (error) {
      setStatus(getReadableError(
        error,
        translateApiError(error, t, text.status.userSaveFailed),
      ));
    } finally {
      setSavedPlaceSaving('');
    }
  }

  function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarStatus(t('profile.imageType'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarStatus(t('profile.imageSize'));
      return;
    }
    setAvatarStatus('');
    setAvatarFileName(file.name);
    setAvatarFile(file);
    setAvatarPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  }

  async function handleAvatarUpload() {
    if (!avatarFile) {
      setAvatarStatus(t('profile.selectImage'));
      return;
    }
    setAvatarUploading(true);
    setAvatarStatus('');
    try {
      const croppedFile = await avatarCropperRef.current?.createCroppedFile();
      if (!croppedFile) throw new Error(t('profile.cropFailed'));
      const url = await uploadAvatar(croppedFile);
      if (!url) throw new Error('The avatar upload returned no file URL.');
      const updated = await updateCustomerProfile({
        lastName: profile.lastName,
        firstName: profile.firstName,
        gender: profile.gender,
        birthDate: profile.birthDate,
        phone: profile.phone,
        email: profile.email,
        avatarUrl: url,
      });
      setProfile(normalizeProfile(updated));
      setStatus(text.status.dbSaved);
      setAvatarFile(null);
      setAvatarFileName('');
      setAvatarStatus('');
      setModal(null);
    } catch (error) {
      setAvatarStatus(translateApiError(error, t, text.status.avatarFailed));
    } finally {
      setAvatarUploading(false);
    }
  }

  function updateVisaCardField(field, value) {
    setCardStatus('');
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
      const updated = await updateCustomerProfile({
        lastName: profile.lastName,
        firstName: profile.firstName,
        gender: profile.gender,
        birthDate: profile.birthDate,
        phone: profile.phone,
        email: profile.email,
        avatarUrl: profile.avatarUrl || null,
      });
      await persistSavedPlace('home', savedPlaceDrafts.home);
      setProfile(normalizeProfile(updated));
      setModal('saved');
      setStatus(text.status.dbSaved);
    } catch (error) {
      setModal('error');
      setStatus(getReadableError(
        error,
        translateApiError(error, t, text.status.userSaveFailed),
      ));
    }
  }

  function changeLanguage(nextLanguage) {
    setLanguage(setStoredProfileLanguage(nextLanguage));
  }

  function handleLogout() {
    clearAuthSession();
    sessionStorage.removeItem('jpTaxiRideRequestId');
    sessionStorage.removeItem('jpTaxiTripId');
    sessionStorage.removeItem('jpTaxiSelectedRoute');
    navigate('/login', { replace: true });
  }

  async function saveNotifications(next) {
    setNotifications(next);
    try {
      const saved = await updateNotificationPreferences(next);
      setNotifications(saved);
      setStatus(text.status.dbSaved);
    } catch (error) {
      setStatus(translateApiError(error, t, t('profile.notificationsFailed')));
    }
  }

  async function savePaymentMethod() {
    const messages = cardMessages[language] || cardMessages.en;
    const holderName = visaCard.holderName.trim();
    const cardNumber = normalizeCardNumber(visaCard.number);
    if (!holderName) {
      setCardStatus(messages.holderRequired);
      return;
    }
    if (cardNumber.length < 12 || cardNumber.length > 19) {
      setCardStatus(messages.numberInvalid);
      return;
    }
    if (!/^\d{3,4}$/.test(visaCard.securityCode)) {
      setCardStatus(messages.securityInvalid);
      return;
    }
    if (!/^\d{2}\/\d{4}$/.test(visaCard.expiry)) {
      setCardStatus(messages.expiryInvalid);
      return;
    }
    const [month, expiryYear] = visaCard.expiry.split('/').map(Number);
    const now = new Date();
    const expiryIsPast =
      expiryYear < now.getFullYear()
      || (expiryYear === now.getFullYear() && month < now.getMonth() + 1);
    if (month < 1 || month > 12 || expiryIsPast) {
      setCardStatus(messages.expiryInvalid);
      return;
    }
    setCardSaving(true);
    setCardStatus('');
    try {
      await addPaymentMethod({
        brand: 'VISA',
        holderName,
        cardNumber,
        securityCode: visaCard.securityCode,
        expiryMonth: month,
        expiryYear,
        billingAddress: visaCard.billingAddress,
        isDefault: paymentMethods.length === 0,
      });
      const methods = await getPaymentMethods();
      setPaymentMethods(Array.isArray(methods) ? methods.filter(Boolean) : []);
      setVisaCard(defaultVisaCard);
      setCardStatus('');
      setModal(null);
      setStatus(text.status.dbSaved);
    } catch (error) {
      setCardStatus(translateApiError(error, t, messages.saveFailed));
    } finally {
      setCardSaving(false);
    }
  }

  async function savePassword() {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setStatus(t('profile.passwordMismatch'));
      return;
    }
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setModal(null);
      setStatus(text.status.dbSaved);
    } catch (error) {
      setStatus(translateApiError(error, t, t('profile.passwordFailed')));
    }
  }

  async function openLoginHistory() {
    setModal('loginHistory');
    if (activeSection === 'security') return;

    setLoginHistory([]);
    setLoginHistoryError('');
    setLoginHistoryLoading(true);
    try {
      const rows = await getLoginHistory();
      setLoginHistory(Array.isArray(rows) ? rows.filter(Boolean) : []);
    } catch (error) {
      setLoginHistoryError(translateApiError(error, t, text.status.userLoadFailed));
    } finally {
      setLoginHistoryLoading(false);
    }
  }

  function renderLoginHistory() {
    if (loginHistoryLoading) return <span role="status">{common.loading}</span>;
    if (loginHistoryError) return <span role="alert">{loginHistoryError}</span>;
    if (!loginHistory.length) return <span>{userText.modal.emptyLoginHistory}</span>;

    return loginHistory.map((item) => (
      <article
        className="account-card"
        key={`${item.loginTime}-${item.ipAddress}-${item.userAgent}`}
      >
        <strong>{new Date(item.loginTime).toLocaleString(text.locale)}</strong>
        <span>{item.ipAddress || common.unregistered}</span>
        <small>{item.userAgent || common.unregistered}</small>
      </article>
    ));
  }

  function renderContent() {
    if (activeSection === 'security') {
      return (
        <section className="panel zip-profile-panel">
          <h2 className="panel-title">{common.security}</h2>
          <div className="security-list">
            {userText.security.map(([title, copy, action], index) => (
              <article className="security-item" key={title}>
                <strong>{title}</strong>
                <span>{copy}</span>
                {index === 1 ? (
                  <NavLink className="link-btn" to="/user-info/profile">{action}</NavLink>
                ) : (
                  <button
                    className="link-btn"
                    type="button"
                    onClick={() => {
                      if (index === 0) setModal('password');
                      else openLoginHistory();
                    }}
                  >
                    {action}
                  </button>
                )}
              </article>
            ))}
          </div>
          <div className="setting-list stack" aria-live="polite">
            <h3>{userText.modal.loginHistory}</h3>
            {renderLoginHistory()}
          </div>
        </section>
      );
    }

    if (activeSection === 'notifications') {
      return (
        <section className="panel zip-profile-panel">
          <h2 className="panel-title">{userText.menu.notifications}</h2>
          <div className="setting-list">
            {userText.notifications.map(([icon, title, sub], index) => {
              const key = ['rideUpdates', 'emailNotifications', 'promotions'][index];
              return (
                <label className="setting-row" key={title}>
                  <span className="icon-box">{icon}</span>
                  <span><strong>{title}</strong><small>{sub}</small></span>
                  <span className="switch">
                    <input
                      checked={Boolean(notifications[key])}
                      onChange={(event) => saveNotifications({
                        ...notifications,
                        [key]: event.target.checked,
                      })}
                      type="checkbox"
                    />
                    <span />
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      );
    }

    if (activeSection === 'payment') {
      return (
        <section className="panel zip-profile-panel narrow-panel">
          <h2 className="panel-title">{userText.paymentTitle}</h2>
          <div className="setting-list">
            {paymentMethods.length ? paymentMethods.filter(Boolean).map((item) => (
              <article className="account-card" key={item.paymentMethodId}>
                <strong>{item.isDefault ? userText.defaultPayment : item.brand}</strong>
                <span>{item.brand} **** {item.lastFour}</span>
              </article>
            )) : <p className="empty-state">{t('profile.noPaymentMethods')}</p>}
            <button
              className="submit-button profile-save-button"
              type="button"
              onClick={() => {
                setCardStatus('');
                setModal('addCard');
              }}
            >
              {common.addVisaCard}
            </button>
          </div>
        </section>
      );
    }

    if (activeSection === 'language') {
      return (
        <section className="panel zip-profile-panel narrow-panel">
          <h2 className="panel-title">{userText.languageTitle}</h2>
          <label>
            <span>{userText.displayLanguage}</span>
            <select value={language} onChange={(event) => changeLanguage(event.target.value)}>
              {languageOptions.map((option) => (
                <option value={option.value} key={option.value}>{text.languageNames[option.value]}</option>
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
          <p className="muted-copy">{userText.logoutCopy}</p>
          <button className="submit-button profile-save-button" type="button" onClick={handleLogout}>{common.logout}</button>
        </section>
      );
    }

    return (
      <div className="profile-reference-grid">
        <div>
          <section className="panel zip-profile-panel">
            <h2 className="panel-title">{userText.personalInfo}</h2>
            <div className="form-grid">
              <label><span>{common.lastName}</span><input value={profile.lastName} onChange={(event) => updateField('lastName', event.target.value)} /></label>
              <label><span>{common.firstName}</span><input value={profile.firstName} onChange={(event) => updateField('firstName', event.target.value)} /></label>
              <label className="field full"><span>{common.email}</span><input type="email" value={profile.email} onChange={(event) => updateField('email', event.target.value)} /></label>
              <label>
                <span>{common.gender}</span>
                <select value={profile.gender} onChange={(event) => updateField('gender', event.target.value)}>
                  <option value="Male">{common.male}</option>
                  <option value="Female">{common.female}</option>
                  <option value="Other">{common.other}</option>
                </select>
              </label>
              <label><span>{common.phone}</span><input value={profile.phone} onChange={(event) => updateField('phone', event.target.value)} /></label>
              <label className="field full">
                <span>{userText.address}</span>
                <input
                  value={savedPlaceDrafts.home}
                  onChange={(event) => updateSavedPlaceDraft('home', event.target.value)}
                  placeholder="Home address"
                />
              </label>
            </div>
          </section>

          <section className="panel zip-profile-panel stack">
            <h2 className="panel-title">{userText.menu.notifications}</h2>
            <div className="setting-list">
              {userText.notifications.map(([icon, title, sub], index) => {
                const key = ['rideUpdates', 'emailNotifications', 'promotions'][index];
                return (
                  <label className="setting-row" key={title}>
                    <span className="icon-box">{icon}</span>
                    <span><strong>{title}</strong><small>{sub}</small></span>
                    <span className="switch">
                      <input
                        checked={Boolean(notifications[key])}
                        onChange={(event) => saveNotifications({
                          ...notifications,
                          [key]: event.target.checked,
                        })}
                        type="checkbox"
                      />
                      <span />
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="panel zip-profile-panel stack">
            <h2 className="panel-title">{t('home.savedPlaces')}</h2>
            <div className="setting-list">
              {savedPlaceTypes.map((type) => (
                <article className="account-card" key={type}>
                  <strong>{type === 'home' ? 'Home' : type === 'work' ? 'Work' : 'Favorite'}</strong>
                  <input
                    value={savedPlaceDrafts[type]}
                    onChange={(event) => updateSavedPlaceDraft(type, event.target.value)}
                    placeholder={`${type === 'home' ? 'Home' : type === 'work' ? 'Work' : 'Favorite'} address`}
                  />
                  <button
                    className="link-btn"
                    type="button"
                    onClick={() => saveSavedPlace(type)}
                    disabled={savedPlaceSaving === type}
                  >
                    {savedPlaceSaving === type ? common.loading : common.save}
                  </button>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div>
          <section className="panel zip-profile-panel">
            <h2 className="panel-title">{userText.accountInfo}</h2>
            <div className="setting-list">
              <Link className="account-card profile-info-card" to="/user-info/language">
                <span className="account-icon">🌐</span>
                <span><strong>{userText.displayLanguage}</strong><small>{text.languageNames[language]}</small></span>
              </Link>
              <Link className="account-card profile-info-card" to="/user-info/payment">
                <span className="account-icon">💳</span>
                <span>
                  <strong>{userText.defaultPayment}</strong>
                  <small>
                    {paymentMethods.find((item) => item.isDefault)
                      ? `${paymentMethods.find((item) => item.isDefault).brand} **** ${paymentMethods.find((item) => item.isDefault).lastFour}`
                      : common.unregistered}
                  </small>
                </span>
              </Link>
              <article className="account-card profile-info-card">
                <span className="account-icon">🕘</span>
                <span><strong>{userText.registeredDate}</strong><small>{formatDate(profile.createdAt, text.locale) || common.unregistered}</small></span>
              </article>
            </div>
          </section>

          <section className="panel zip-profile-panel stack">
            <h2 className="panel-title">{common.security}</h2>
            <div className="security-list">
              {userText.securityHome.map(([title, copy, action], index) => (
                <article className="security-item" key={title}>
                  <strong>{title}</strong>
                  <span>{copy}</span>
                  <button
                    className="link-btn"
                    type="button"
                    onClick={() => {
                      if (index === 0) setModal('password');
                      else openLoginHistory();
                    }}
                  >
                    {action}
                  </button>
                </article>
              ))}
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
          <Topbar actions={<><Link to="/home">{t('common.home')}</Link><Link to="/user-info/profile">{t('common.account')}</Link><Link to="/user-info/profile" className="topbar-avatar-link"><img className="topbar-avatar" src={avatar} alt="" /></Link></>} />
          <section className="profile-page-shell zip-profile-shell">
            <aside className="profile-sidebar">
              <section className="profile-card zip-profile-card">
                <div className="profile-avatar">
                  {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} /> : avatarInitial}
                </div>
                <strong>{fullName}</strong>
                <span>{profile.email}</span>
                <em>{userText.role}</em>
                <button className="link-btn" type="button" onClick={() => setModal('avatar')}>{common.changeImage}</button>
              </section>
              <nav className="side-menu" aria-label={userText.pageTitle}>
                {userMenu.map((tab) => (
                  <NavLink className={({ isActive }) => `side-item ${isActive || activeSection === tab.id ? 'active' : ''}`} to={tab.to} key={tab.id}>
                    <span>{tab.icon}</span>
                    <span>{userText.menu[tab.id]}</span>
                  </NavLink>
                ))}
              </nav>
            </aside>

            <section className="profile-content">
              <div className="profile-header zip-profile-header">
                <div>
                  <h1>{userText.pageTitle}</h1>
                  <p>{userText.pageSubtitle}</p>
                  {status && <p className="muted-copy">{status}</p>}
                </div>
                <button className="submit-button profile-save-button" type="button" onClick={saveProfile}>{common.saveChanges}</button>
              </div>
              {renderContent()}
            </section>
          </section>
          <Footer />
        </div>

        <Modal open={Boolean(modal)} title={modalTitle || userText.modal.saved} onClose={() => setModal(null)}>
          {modal === 'account' && (
            <div className="modal-form zip-modal-form">
              <label><span>{common.email}</span><input type="email" value={profile.email} onChange={(event) => updateField('email', event.target.value)} /></label>
              <label><span>{common.phone}</span><input value={profile.phone} onChange={(event) => updateField('phone', event.target.value)} /></label>
              <label><span>{userText.modal.displayName}</span><input value={fullName} readOnly /></label>
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
              <AvatarCropper
                ref={avatarCropperRef}
                src={avatarPreviewUrl}
                fileName={avatarFileName}
                showApplyButton={false}
              />
              {avatarStatus ? <p className="field-error" role="alert">{avatarStatus}</p> : null}
              <button
                className="submit-button profile-save-button"
                type="button"
                disabled={!avatarFile || avatarUploading}
                onClick={handleAvatarUpload}
              >
                {avatarUploading ? common.uploading : common.save}
              </button>
            </div>
          )}
          {(modal === 'card' || modal === 'addCard') && (
            <div className="modal-form zip-modal-form visa-card-form">
              <div className="visa-card-preview">
                <span>VISA</span>
                <strong>**** **** **** {getCardLastFour(visaCard.number)}</strong>
                <small>{visaCard.holderName || common.cardHolder} · {visaCard.expiry || 'MM/YYYY'}</small>
              </div>
              <div className="form-grid">
                <label className="field full"><span>{common.cardHolder}</span><input value={visaCard.holderName} onChange={(event) => updateVisaCardField('holderName', event.target.value)} /></label>
                <label className="field full"><span>{common.cardNumber}</span><input inputMode="numeric" value={formatCardNumber(visaCard.number)} onChange={(event) => updateVisaCardField('number', event.target.value)} /></label>
                <label><span>{common.expiryDate}</span><input inputMode="numeric" placeholder="MM/YYYY" value={visaCard.expiry} onChange={(event) => updateVisaCardField('expiry', event.target.value)} /></label>
                <label><span>{common.securityCode}</span><input type="password" inputMode="numeric" maxLength={4} value={visaCard.securityCode} onChange={(event) => updateVisaCardField('securityCode', event.target.value)} /></label>
                <label className="field full"><span>{common.billingAddress}</span><input value={visaCard.billingAddress} onChange={(event) => updateVisaCardField('billingAddress', event.target.value)} /></label>
              </div>
              {cardStatus ? <p className="field-error" role="alert">{cardStatus}</p> : null}
              <button
                className="submit-button profile-save-button"
                type="button"
                disabled={cardSaving}
                onClick={savePaymentMethod}
              >
                {cardSaving ? common.loading : common.saveCard}
              </button>
            </div>
          )}
          {modal === 'password' && (
            <div className="modal-form zip-modal-form">
              <label><span>{userText.modal.currentPassword}</span><input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((form) => ({ ...form, currentPassword: event.target.value }))} /></label>
              <label><span>{userText.modal.newPassword}</span><input type="password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((form) => ({ ...form, newPassword: event.target.value }))} /></label>
              <label><span>{userText.modal.confirmPassword}</span><input type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((form) => ({ ...form, confirmPassword: event.target.value }))} /></label>
              <button className="submit-button profile-save-button" type="button" onClick={savePassword}>{common.save}</button>
            </div>
          )}
          {modal === 'loginHistory' && (
            <div className="modal-list">
              {renderLoginHistory()}
            </div>
          )}
          {modal && !['account', 'avatar', 'card', 'addCard', 'password', 'loginHistory'].includes(modal) && <p className="modal-copy">{status || userText.modal.defaultCopy}</p>}
        </Modal>
      </main>
    </PageShell>
  );
}
