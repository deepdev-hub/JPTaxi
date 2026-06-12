import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import PageShell from '../components/PageShell.jsx';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { translateApiError } from '../i18n/errors.js';
import '../styles/auth.css';
import '../styles/app-pages.css';

export default function DriverRegisterPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [form, setForm] = useState({
    lastName: '',
    firstName: '',
    phone: '',
    language: 'N3',
    licenseNumber: '',
    licenseType: 'B',
    licenseExpiryDate: '',
    vehicleBrand: '',
    licensePlate: '',
    vehicleType: '4',
    vehicleColor: '',
  });
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitDriverApplication(event) {
    event.preventDefault();
    if (!form.lastName.trim() || !form.firstName.trim() || !form.phone.trim() || !form.licenseNumber.trim() || !form.vehicleBrand.trim() || !form.licensePlate.trim()) {
      setStatus(t('driverRegister.required'));
      return;
    }

    setSubmitting(true);
    try {
      sessionStorage.setItem('jpTaxiPendingDriverRegistration', JSON.stringify(form));
      navigate('/register?role=driver');
    } catch (error) {
      setStatus(translateApiError(error, t, t('driverRegister.saveFailed')));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell withFooter={false}>
      <main className="driver-register-screen">
        <section className="driver-register-layout">
          <div className="driver-register-intro">
            <span className="eyebrow">🚖 {t('driverRegister.eyebrow')}</span>
            <h1>{t('driverRegister.title')}</h1>
            <p>{t('driverRegister.copy')}</p>

            <div className="driver-register-benefits">
              <article><strong>{t('driverRegister.online')}</strong><span>{t('driverRegister.onlineCopy')}</span></article>
              <article><strong>{t('driverRegister.renewal')}</strong><span>{t('driverRegister.renewalCopy')}</span></article>
              <article><strong>{t('driverRegister.review')}</strong><span>{t('driverRegister.reviewCopy')}</span></article>
            </div>

            <div className="driver-register-steps">
              <article><span>1</span><div><strong>{t('driverRegister.basic')}</strong><small>{t('driverRegister.onlineCopy')}</small></div></article>
              <article><span>2</span><div><strong>{t('driverRegister.license')}</strong><small>{t('driverRegister.documentsCopy')}</small></div></article>
              <article><span>3</span><div><strong>{t('driverRegister.vehicle')}</strong><small>{t('driverRegister.copy')}</small></div></article>
            </div>
          </div>

          <section className="driver-register-form-card">
            <Link className="driver-register-login-link" to="/login">← {t('auth.login')}</Link>
            <div className="form-logo" aria-hidden="true">🚕</div>
            <div className="form-heading">
              <h2>{t('auth.driverRegister')}</h2>
              <p>{t('driverRegister.copy')}</p>
            </div>

            <form className="auth-form driver-register-form" onSubmit={submitDriverApplication}>
              <div className="notice-box">{t('driverRegister.status')}<br />{t('driverRegister.reviewTime')}</div>

              <h3 className="section-title">{t('driverRegister.basic')}</h3>
              <div className="field-grid two">
                <label><span>{t('register.lastName')}</span><input placeholder={t('register.lastName')} value={form.lastName} onChange={(event) => updateField('lastName', event.target.value)} /></label>
                <label><span>{t('register.firstName')}</span><input placeholder={t('register.firstName')} value={form.firstName} onChange={(event) => updateField('firstName', event.target.value)} /></label>
                <label><span>{t('register.phone')}</span><input placeholder="+84 000 000 000" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} /></label>
                <label>
                  <span>{t('driverRegister.language')}</span>
                  <select value={form.language} onChange={(event) => updateField('language', event.target.value)}>
                    <option value="N5">N5</option>
                    <option value="N4">N4</option>
                    <option value="N3">N3</option>
                    <option value="N2">N2</option>
                    <option value="N1">N1</option>
                    <option value="Native">Native</option>
                  </select>
                </label>
              </div>

              <h3 className="section-title">{t('driverRegister.license')}</h3>
              <div className="field-grid two">
                <label><span>{t('driverRegister.licenseNumber')}</span><input placeholder="DL-123456789" value={form.licenseNumber} onChange={(event) => updateField('licenseNumber', event.target.value)} /></label>
                <label>
                  <span>{t('driverRegister.licenseType')}</span>
                  <select value={form.licenseType} onChange={(event) => updateField('licenseType', event.target.value)}>
                    <option value="B">B</option>
                    <option value="C1">C1</option>
                    <option value="C">C</option>
                    <option value="D1">D1</option>
                    <option value="D2">D2</option>
                    <option value="D">D</option>
                  </select>
                </label>
                <label><span>{t('driverRegister.expiry')}</span><input type="date" value={form.licenseExpiryDate} onChange={(event) => updateField('licenseExpiryDate', event.target.value)} /></label>
              </div>
              <h3 className="section-title">{t('driverRegister.vehicle')}</h3>
              <div className="field-grid two">
                <label><span>{t('driverRegister.vehicleModel')}</span><input placeholder={t('driverRegister.vehicleModel')} value={form.vehicleBrand} onChange={(event) => updateField('vehicleBrand', event.target.value)} /></label>
                <label><span>{t('driverRegister.plate')}</span><input placeholder={t('driverRegister.plate')} value={form.licensePlate} onChange={(event) => updateField('licensePlate', event.target.value)} /></label>
                <label>
                  <span>{t('driverRegister.seats')}</span>
                  <select value={form.vehicleType} onChange={(event) => updateField('vehicleType', event.target.value)}>
                    <option value="4">4</option>
                    <option value="7">7</option>
                    <option value="9">9</option>
                  </select>
                </label>
                <label><span>{t('driverRegister.color')}</span><input placeholder={t('driverRegister.color')} value={form.vehicleColor} onChange={(event) => updateField('vehicleColor', event.target.value)} /></label>
              </div>
              <div className="notice-box">
                {t('driverRegister.documentsCopy')}
              </div>

              <label className="terms">
                <input type="checkbox" required />
                <span>{t('driverRegister.terms')}</span>
              </label>
              {status && <p className="form-status show">{status}</p>}

              <div className="driver-register-actions">
                <button className="secondary-button" type="button" onClick={() => navigate('/login')}>{t('common.back')}</button>
                <button className="submit-button" type="submit" disabled={submitting}>{submitting ? t('common.sending') : t('driverRegister.submit')}</button>
              </div>
            </form>
          </section>
        </section>
      </main>
    </PageShell>
  );
}
