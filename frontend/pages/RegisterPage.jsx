import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { registerAccount } from '../api/auth.js';
import PageShell from '../components/PageShell.jsx';
import PasswordField from '../components/PasswordField.jsx';
import Topbar from '../components/Topbar.jsx';
import { persistAuthSession } from '../utils/session.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { translateApiError } from '../i18n/errors.js';
import '../styles/auth.css';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const isDriverRegistration = searchParams.get('role') === 'driver';
  const pendingDriver = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('jpTaxiPendingDriverRegistration') || 'null');
    } catch {
      return null;
    }
  }, []);
  const [form, setForm] = useState({
    lastName: '',
    firstName: '',
    email: '',
    phone: '',
    gender: 'Other',
    birthDate: '1990-01-01',
    password: '',
    confirmPassword: '',
    agreed: false,
  });
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isDriverRegistration || !pendingDriver) return;
    setForm((current) => ({
      ...current,
      lastName: pendingDriver.lastName || current.lastName,
      firstName: pendingDriver.firstName || current.firstName,
      phone: pendingDriver.phone || current.phone,
    }));
  }, [isDriverRegistration, pendingDriver]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitRegistration(event) {
    event.preventDefault();
    if (isSubmitting) return;
    setStatus('');
    setStatusType('');

    if (form.password !== form.confirmPassword) {
      setStatus(t('auth.passwordMismatch'));
      setStatusType('error');
      return;
    }
    if (!form.agreed) {
      setStatus(t('register.termsRequired'));
      setStatusType('error');
      return;
    }
    if (isDriverRegistration && !pendingDriver) {
      setStatus(t('register.driverCopy'));
      setStatusType('error');
      navigate('/driver-register');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        role: isDriverRegistration ? 'driver' : 'customer',
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        gender: form.gender,
        birth_date: form.birthDate,
        password: form.password,
      };

      if (isDriverRegistration) {
        Object.assign(payload, {
          nationality: 'Vietnam',
          japanese_level: pendingDriver.language || 'N3',
          license_number: pendingDriver.licenseNumber,
          license_type: pendingDriver.licenseType || 'B',
          license_expiry_date: pendingDriver.licenseExpiryDate || undefined,
          vehicle_brand: pendingDriver.vehicleBrand,
          vehicle_color: pendingDriver.vehicleColor || '',
          vehicle_type: pendingDriver.vehicleType || '4',
          license_plate: pendingDriver.licensePlate,
          portrait_url: pendingDriver.documents?.portrait || undefined,
          license_front_url: pendingDriver.documents?.licenseFront || undefined,
          license_back_url: pendingDriver.documents?.licenseBack || undefined,
          vehicle_photo_url: pendingDriver.documents?.vehiclePhoto || undefined,
          registration_paper_url: pendingDriver.documents?.registrationPaper || undefined,
        });
      }

      const result = await registerAccount(payload);
      const role = result?.role === 'driver' ? 'driver' : 'customer';
      persistAuthSession({
        token: result.token,
        role,
        user: result.user,
        email: form.email.trim(),
      });
      sessionStorage.removeItem('jpTaxiPendingDriverRegistration');
      setStatus(t('register.success'));
      setStatusType('success');
      window.setTimeout(() => {
        navigate(role === 'driver' ? '/driver-home' : '/home', { replace: true });
      }, 1000);
    } catch (error) {
      setStatus(translateApiError(error, t, t('register.failed')));
      setStatusType('error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageShell withFooter={false}>
    <main className="auth-screen">
      <Topbar />

      <section className="auth-layout">
        <div className="intro">
          <span className="eyebrow">{isDriverRegistration ? `🚖 ${t('register.driverEyebrow')}` : `✨ ${t('register.customerEyebrow')}`}</span>
          <h1>{isDriverRegistration ? t('register.driverTitle') : t('register.title')}</h1>
          <p>{isDriverRegistration ? t('register.driverCopy') : t('register.customerCopy')}</p>

          <div className="benefits" aria-label={t('auth.features')}>
            <article>
              <h2>{t('register.easy')}</h2>
              <p>{t('register.easyCopy')}</p>
            </article>
            <article>
              <h2>{t('register.management')}</h2>
              <p>{t('register.managementCopy')}</p>
            </article>
            <article>
              <h2>{t('register.safe')}</h2>
              <p>{t('register.safeCopy')}</p>
            </article>
          </div>
        </div>

        <section className="auth-card" aria-labelledby="register-title">
          <div className="form-logo" aria-hidden="true">🚕</div>
          <div className="form-heading">
            <h2 id="register-title">{isDriverRegistration ? t('register.driverFormTitle') : t('register.customerFormTitle')}</h2>
            <p>{isDriverRegistration ? t('register.driverFormCopy') : t('register.customerFormCopy')}</p>
          </div>

          <form className="auth-form" onSubmit={submitRegistration}>
            <div className="field-grid two">
              <label>
                <span>{t('register.lastName')}</span>
                <input type="text" placeholder={t('register.lastName')} required value={form.lastName} onChange={(event) => updateField('lastName', event.target.value)} />
              </label>
              <label>
                <span>{t('register.firstName')}</span>
                <input type="text" placeholder={t('register.firstName')} required value={form.firstName} onChange={(event) => updateField('firstName', event.target.value)} />
              </label>
            </div>

            <label>
              <span>{t('common.email')}</span>
              <input type="email" placeholder="example@email.com" required value={form.email} onChange={(event) => updateField('email', event.target.value)} />
            </label>

            <div className="field-grid two">
              <label>
                <span>{t('register.phone')}</span>
                <input type="tel" placeholder={t('register.phone')} required value={form.phone} onChange={(event) => updateField('phone', event.target.value)} />
              </label>
              <label>
                <span>{t('register.gender')}</span>
                <select value={form.gender} onChange={(event) => updateField('gender', event.target.value)}>
                  <option value="Male">{t('register.male')}</option>
                  <option value="Female">{t('register.female')}</option>
                  <option value="Other">{t('register.other')}</option>
                </select>
              </label>
            </div>
            <label>
              <span>{t('register.birthDate')}</span>
              <input type="date" value={form.birthDate} onChange={(event) => updateField('birthDate', event.target.value)} />
            </label>

            <PasswordField label={t('common.password')} placeholder={t('common.password')} value={form.password} onChange={(event) => updateField('password', event.target.value)} />
            <PasswordField label={t('register.confirmPassword')} placeholder={t('register.confirmPassword')} value={form.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} />

            <label className="terms">
              <input type="checkbox" checked={form.agreed} onChange={(event) => updateField('agreed', event.target.checked)} />
              <span>{t('register.terms')}</span>
            </label>
            {isDriverRegistration && pendingDriver && (
              <div className="notice-box">
                {t('auth.driverRegister')}: <strong>{pendingDriver.vehicleBrand || t('common.unavailable')} / {pendingDriver.licensePlate}</strong>
              </div>
            )}
            {status && (
              <p
                className={`form-status show ${statusType}`}
                role={statusType === 'error' ? 'alert' : 'status'}
                aria-live={statusType === 'error' ? 'assertive' : 'polite'}
              >
                {status}
              </p>
            )}

            <button className="submit-button" type="submit" disabled={isSubmitting}>{isSubmitting ? t('register.submitting') : t('register.submit')}</button>
            <p className="note-link">{t('register.haveAccount')} <Link to="/login">{t('auth.login')}</Link></p>
            {!isDriverRegistration && <p className="note-link">{t('auth.workAsDriver')} <Link to="/driver-register">{t('auth.driverRegister')}</Link></p>}
          </form>
        </section>
      </section>
    </main>
    </PageShell>
  );
}
