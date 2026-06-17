import { Link, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { registerAccount } from '../api/auth.js';
import { uploadAvatar, uploadDriverDocument } from '../api/accounts.js';
import PageShell from '../components/PageShell.jsx';
import PasswordField from '../components/PasswordField.jsx';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { translateApiError } from '../i18n/errors.js';
import { persistAuthSession } from '../utils/session.js';
import '../styles/auth.css';
import '../styles/app-pages.css';

const documentFields = [
  { key: 'portrait', labelKey: 'driverRegister.avatar', uploadType: 'portrait', usesAvatarEndpoint: true },
  { key: 'japaneseCertificate', labelKey: 'driverRegister.japaneseCertificate', uploadType: 'japanese_certificate' },
  { key: 'licenseFront', labelKey: 'driverRegister.licenseFront', uploadType: 'license_front' },
  { key: 'licenseBack', labelKey: 'driverRegister.licenseBack', uploadType: 'license_back' },
  { key: 'vehiclePhoto', labelKey: 'driverRegister.vehiclePhoto', uploadType: 'vehicle_photo' },
  { key: 'registrationPaper', labelKey: 'driverRegister.registrationPaper', uploadType: 'registration_paper' },
];

export default function DriverRegisterPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [form, setForm] = useState({
    lastName: '',
    firstName: '',
    email: '',
    phone: '',
    gender: 'Other',
    password: '',
    confirmPassword: '',
    language: 'N3',
    licenseNumber: '',
    licenseType: 'B',
    licenseExpiryDate: '',
    vehicleBrand: '',
    licensePlate: '',
    vehicleType: '4',
    vehicleColor: '',
    agreed: false,
  });
  const [documents, setDocuments] = useState({
    portrait: '',
    japaneseCertificate: '',
    licenseFront: '',
    licenseBack: '',
    vehiclePhoto: '',
    registrationPaper: '',
  });
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingKey, setUploadingKey] = useState('');

  const uploadedCount = useMemo(
    () => Object.values(documents).filter(Boolean).length,
    [documents],
  );

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleDocumentUpload(field, file) {
    if (!file) return;

    setStatus('');
    setStatusType('');
    setUploadingKey(field.key);
    try {
      const url = field.usesAvatarEndpoint
        ? await uploadAvatar(file)
        : await uploadDriverDocument(field.uploadType, file);
      setDocuments((current) => ({ ...current, [field.key]: url || '' }));
    } catch (error) {
      setStatus(translateApiError(error, t, t('driverRegister.saveFailed')));
      setStatusType('error');
    } finally {
      setUploadingKey('');
    }
  }

  async function submitDriverApplication(event) {
    event.preventDefault();
    if (submitting) return;

    setStatus('');
    setStatusType('');

    if (
      !form.lastName.trim()
      || !form.firstName.trim()
      || !form.email.trim()
      || !form.phone.trim()
      || !form.licenseNumber.trim()
      || !form.vehicleBrand.trim()
      || !form.licensePlate.trim()
      || !form.password
      || !form.confirmPassword
    ) {
      setStatus(t('driverRegister.required'));
      setStatusType('error');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setStatus(t('auth.passwordMismatch'));
      setStatusType('error');
      return;
    }
    if (!Object.values(documents).every(Boolean)) {
      setStatus(t('driverRegister.docsRequired'));
      setStatusType('error');
      return;
    }
    if (!form.agreed) {
      setStatus(t('register.termsRequired'));
      setStatusType('error');
      return;
    }

    setSubmitting(true);
    try {
      const result = await registerAccount({
        role: 'driver',
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        gender: form.gender,
        password: form.password,
        nationality: 'Vietnam',
        japanese_level: form.language || 'N3',
        license_number: form.licenseNumber.trim(),
        license_type: form.licenseType || 'B',
        license_expiry_date: form.licenseExpiryDate || undefined,
        vehicle_brand: form.vehicleBrand.trim(),
        vehicle_color: form.vehicleColor.trim(),
        vehicle_type: form.vehicleType || '4',
        license_plate: form.licensePlate.trim(),
        portrait_url: documents.portrait,
        japanese_certificate_url: documents.japaneseCertificate,
        license_front_url: documents.licenseFront,
        license_back_url: documents.licenseBack,
        vehicle_photo_url: documents.vehiclePhoto,
        registration_paper_url: documents.registrationPaper,
      });

      persistAuthSession({
        token: result.token,
        role: 'driver',
        user: result.user,
        email: form.email.trim(),
      });
      sessionStorage.removeItem('jpTaxiPendingDriverRegistration');
      setStatus(t('register.success'));
      setStatusType('success');
      window.setTimeout(() => {
        navigate('/driver-home', { replace: true });
      }, 700);
    } catch (error) {
      setStatus(translateApiError(error, t));
      setStatusType('error');
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
              <article><span>2</span><div><strong>{t('driverRegister.documents')}</strong><small>{t('driverRegister.uploadHint')}</small></div></article>
              <article><span>3</span><div><strong>{t('driverRegister.review')}</strong><small>{t('driverRegister.reviewCopy')}</small></div></article>
            </div>
          </div>

          <section className="driver-register-form-card">
            <Link className="driver-register-login-link" to="/login">← {t('auth.login')}</Link>
            <div className="form-logo" aria-hidden="true">🚕</div>
            <div className="form-heading">
              <h2>{t('auth.driverRegister')}</h2>
              <p>{t('driverRegister.reviewCopy')}</p>
            </div>

            <form className="auth-form driver-register-form" onSubmit={submitDriverApplication}>
              <div className="notice-box">{t('driverRegister.status')}<br />{t('driverRegister.reviewTime')}</div>

              <h3 className="section-title">{t('driverRegister.basic')}</h3>
              <div className="field-grid two">
                <label><span>{t('register.lastName')}</span><input placeholder={t('register.lastName')} value={form.lastName} onChange={(event) => updateField('lastName', event.target.value)} /></label>
                <label><span>{t('register.firstName')}</span><input placeholder={t('register.firstName')} value={form.firstName} onChange={(event) => updateField('firstName', event.target.value)} /></label>
                <label><span>{t('common.email')}</span><input type="email" placeholder="example@email.com" value={form.email} onChange={(event) => updateField('email', event.target.value)} /></label>
                <label><span>{t('register.phone')}</span><input placeholder="+84 000 000 000" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} /></label>
                <label>
                  <span>{t('register.gender')}</span>
                  <select value={form.gender} onChange={(event) => updateField('gender', event.target.value)}>
                    <option value="Male">{t('register.male')}</option>
                    <option value="Female">{t('register.female')}</option>
                    <option value="Other">{t('register.other')}</option>
                  </select>
                </label>
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

              <h3 className="section-title">{t('driverRegister.emailPassword')}</h3>
              <PasswordField label={t('common.password')} placeholder={t('common.password')} value={form.password} onChange={(event) => updateField('password', event.target.value)} />
              <PasswordField label={t('register.confirmPassword')} placeholder={t('register.confirmPassword')} value={form.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} />

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

              <h3 className="section-title">{t('driverRegister.documents')}</h3>
              <div className="driver-register-documents-summary">
                <strong>{uploadedCount} / {documentFields.length}</strong>
                <span>{t('driverRegister.uploadHint')}</span>
              </div>
              <div className="field-grid upload-grid">
                {documentFields.map((field) => {
                  const hasFile = Boolean(documents[field.key]);
                  const isUploading = uploadingKey === field.key;
                  return (
                    <label className={`upload-box ${hasFile ? 'uploaded' : ''}`} key={field.key}>
                      <strong>{t(field.labelKey)}</strong>
                      <span>{hasFile ? t('driverRegister.uploaded') : t('driverRegister.uploadNow')}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
                        hidden
                        disabled={Boolean(uploadingKey) || submitting}
                        onChange={(event) => handleDocumentUpload(field, event.target.files?.[0])}
                      />
                      <small>{isUploading ? t('common.sending') : (documents[field.key] || t('driverRegister.uploadHint'))}</small>
                    </label>
                  );
                })}
              </div>

              <label className="terms">
                <input type="checkbox" checked={form.agreed} onChange={(event) => updateField('agreed', event.target.checked)} />
                <span>{t('driverRegister.terms')}</span>
              </label>
              {status && (
                <p className={`form-status show ${statusType}`} role={statusType === 'error' ? 'alert' : 'status'}>
                  {status}
                </p>
              )}

              <div className="driver-register-actions">
                <button className="secondary-button" type="button" onClick={() => navigate('/login')}>{t('common.back')}</button>
                <button className="submit-button" type="submit" disabled={submitting || Boolean(uploadingKey)}>
                  {submitting ? t('common.sending') : t('driverRegister.submit')}
                </button>
              </div>
            </form>
          </section>
        </section>
      </main>
    </PageShell>
  );
}
