import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
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
  getNotificationPreferences,
  getPaymentMethods,
  updateNotificationPreferences,
} from '../api/customers.js';
import {
  getStoredProfileLanguage,
  languageOptions,
  LANGUAGE_EVENT,
  profileText,
  setStoredProfileLanguage,
} from '../i18n/profileLanguage.js';
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

function normalizeProfile(profile = {}) {
  return {
    ...emptyProfile,
    ...profile,
    birthDate: profile.birthDate ? String(profile.birthDate).slice(0, 10) : emptyProfile.birthDate,
    avatarUrl: resolveAssetUrl(profile.avatarUrl),
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

export default function UserInfoPage() {
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
  const [croppedAvatarFile, setCroppedAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const text = profileText[language] || profileText.ja;
  const common = text.common;
  const userText = text.user;

  useEffect(() => {
    let ignore = false;
    async function loadProfile() {
      setLoading(true);
      try {
        const [data, preferences, methods] = await Promise.all([
          getCustomerProfile(),
          getNotificationPreferences(),
          getPaymentMethods(),
        ]);
        if (!ignore) {
          setProfile(normalizeProfile(data));
          setNotifications(preferences);
          setPaymentMethods(Array.isArray(methods) ? methods : []);
        }
      } catch (error) {
        if (!ignore) setStatus(error.message || text.status.userLoadFailed);
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

  const fullName = getDisplayName(profile, common.unregistered);
  const avatarInitial = fullName.slice(0, 1) || profile.lastName.slice(0, 1);
  const avatar = profile.avatarUrl;

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
        setModal(null);
      }
    } catch (error) {
      setStatus(error.message || text.status.avatarFailed);
    } finally {
      setAvatarUploading(false);
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
      const updated = await updateCustomerProfile({
        lastName: profile.lastName,
        firstName: profile.firstName,
        gender: profile.gender,
        birthDate: profile.birthDate,
        phone: profile.phone,
        email: profile.email,
        avatarUrl: profile.avatarUrl || null,
      });
      setProfile(normalizeProfile(updated));
      setModal('saved');
      setStatus(text.status.dbSaved);
    } catch (error) {
      setModal('error');
      setStatus(error.message || text.status.userSaveFailed);
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
      setStatus(error.message || 'Unable to save notification settings.');
    }
  }

  async function savePaymentMethod() {
    const [month, shortYear] = visaCard.expiry.split('/').map(Number);
    const expiryYear = shortYear < 100 ? 2000 + shortYear : shortYear;
    try {
      const saved = await addPaymentMethod({
        brand: 'VISA',
        holderName: visaCard.holderName,
        cardNumber: visaCard.number,
        securityCode: visaCard.securityCode,
        expiryMonth: month,
        expiryYear,
        billingAddress: visaCard.billingAddress,
        isDefault: paymentMethods.length === 0,
      });
      setPaymentMethods((items) => [
        ...items.map((item) => ({ ...item, isDefault: false })),
        saved,
      ]);
      setVisaCard(defaultVisaCard);
      setModal(null);
      setStatus(text.status.dbSaved);
    } catch (error) {
      setStatus(error.message || 'Unable to add payment method.');
    }
  }

  async function savePassword() {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setStatus('New password confirmation does not match.');
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
      setStatus(error.message || 'Unable to change password.');
    }
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
                  <button className="link-btn" type="button" onClick={() => setModal(index === 0 ? 'password' : 'loginHistory')}>{action}</button>
                )}
              </article>
            ))}
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
            {paymentMethods.length ? paymentMethods.map((item) => (
              <article className="account-card" key={item.paymentMethodId}>
                <strong>{item.isDefault ? userText.defaultPayment : item.brand}</strong>
                <span>{item.brand} **** {item.lastFour}</span>
              </article>
            )) : <p className="empty-state">No saved payment methods.</p>}
            <button className="submit-button profile-save-button" type="button" onClick={() => setModal('addCard')}>{common.addVisaCard}</button>
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
              <label className="field full"><span>{userText.address}</span><input value="" disabled placeholder="Manage addresses in saved places" /></label>
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
        </div>

        <div>
          <section className="panel zip-profile-panel">
            <h2 className="panel-title">{userText.accountInfo}</h2>
            <div className="setting-list">
              <Link className="account-card profile-info-card" to="/user-info/language">
                <span className="account-icon">🌐</span>
                <span><strong>{userText.displayLanguage}</strong><small>{languageOptions.find((item) => item.value === language)?.label || '日本語'}</small></span>
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
                  <button className="link-btn" type="button" onClick={() => setModal(index === 0 ? 'password' : 'loginHistory')}>{action}</button>
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
          <Topbar actions={<><Link to="/home">{common.home}</Link><Link to="/messages/driver">{common.messages}</Link>{avatar ? <img className="topbar-avatar" src={avatar} alt="" /> : <span className="topbar-avatar" />}</>} />
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
          {(modal === 'card' || modal === 'addCard') && (
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
              <button className="submit-button profile-save-button" type="button" onClick={savePaymentMethod}>{common.saveCard}</button>
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
              {profile.loginHistory.length ? profile.loginHistory.map((item) => (
                <span key={`${item.loginTime}-${item.ipAddress}`}>{formatDate(item.loginTime, text.locale)} - {item.ipAddress || 'unknown'}</span>
              )) : <span>{userText.modal.emptyLoginHistory}</span>}
            </div>
          )}
          {modal && !['account', 'avatar', 'card', 'addCard', 'password', 'loginHistory'].includes(modal) && <p className="modal-copy">{status || userText.modal.defaultCopy}</p>}
        </Modal>
      </main>
    </PageShell>
  );
}
