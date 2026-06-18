import { Link, useNavigate } from 'react-router-dom';
import { useRef, useState } from 'react';
import Modal from '../components/Modal.jsx';
import PageShell from '../components/PageShell.jsx';
import PasswordField from '../components/PasswordField.jsx';
import Topbar from '../components/Topbar.jsx';
import {
  forgotPassword,
  loginAccount,
  resetPassword,
} from '../api/auth.js';
import { emailPattern } from '../utils/loginValidation.js';
import { clearAuthSession, persistAuthSession } from '../utils/session.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { translateApiError } from '../i18n/errors.js';
import '../styles/auth.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const loginMessages = {
    emailRequired: t('auth.emailRequired'),
    emailInvalid: t('auth.emailInvalid'),
    passwordRequired: t('auth.passwordRequired'),
    passwordShort: t('auth.passwordShort'),
    success: t('auth.loginSuccess'),
  };
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const [loginRole, setLoginRole] = useState('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [status, setStatus] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotStatus, setForgotStatus] = useState('');

  function setFieldError(field, message) {
    setErrors((current) => ({ ...current, [field]: message }));
  }

  function validateEmail(nextEmail = email) {
    const trimmedEmail = nextEmail.trim();

    if (!trimmedEmail) {
      setFieldError('email', loginMessages.emailRequired);
      return false;
    }

    if (!emailPattern.test(trimmedEmail)) {
      setFieldError('email', loginMessages.emailInvalid);
      return false;
    }

    setFieldError('email', '');
    return true;
  }

  function validatePassword(nextPassword = password) {
    if (!nextPassword) {
      setFieldError('password', loginMessages.passwordRequired);
      return false;
    }

    if (nextPassword.length < 6) {
      setFieldError('password', loginMessages.passwordShort);
      return false;
    }

    setFieldError('password', '');
    return true;
  }

  function handleEmailChange(event) {
    const nextEmail = event.target.value;
    setEmail(nextEmail);
    setStatus('');

    if (nextEmail.trim()) {
      validateEmail(nextEmail);
    } else {
      setFieldError('email', '');
    }
  }

  function handlePasswordChange(event) {
    const nextPassword = event.target.value;
    setPassword(nextPassword);
    setStatus('');

    if (nextPassword) {
      validatePassword(nextPassword);
    } else {
      setFieldError('password', '');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('');

    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();

    if (!isEmailValid || !isPasswordValid) {
      if (!isEmailValid) {
        emailRef.current?.focus();
      } else {
        passwordRef.current?.focus();
      }
      return;
    }

    if (remember) {
      localStorage.setItem('jpTaxiLoginEmail', email.trim());
    } else {
      localStorage.removeItem('jpTaxiLoginEmail');
    }

    const trimmedEmail = email.trim();

    try {
      const result = await loginAccount({
        email: trimmedEmail,
        password,
        role: loginRole,
      });
      const role = result?.role === 'driver' ? 'driver' : 'customer';

      persistAuthSession({
        token: result.token,
        role,
        user: result.user,
        email: trimmedEmail,
      });

      setStatus(loginMessages.success);
      navigate(role === 'driver' ? '/driver-home' : '/home');
    } catch (error) {
      clearAuthSession();
      setStatus(translateApiError(error, t, t('auth.loginFailed')));
    }
  }

  function openForgotModal() {
    setForgotEmail(email.trim());
    setForgotStep('email');
    setForgotCode('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotError('');
    setForgotStatus('');
    setForgotOpen(true);
  }

  async function handleForgotSubmit(event) {
    event.preventDefault();
    setForgotError('');
    setForgotStatus('');

    if (forgotStep === 'code') {
      if (!forgotCode.trim()) {
        setForgotError(t('auth.codeRequired'));
        return;
      }

      setForgotStep('password');
      return;
    }

    if (forgotStep === 'password') {
      if (newPassword.length < 6) {
        setForgotError(t('auth.passwordShort'));
        return;
      }

      if (newPassword !== confirmPassword) {
        setForgotError(t('auth.passwordMismatch'));
        return;
      }

      try {
        await resetPassword({
          email: forgotEmail.trim(),
          code: forgotCode.trim(),
          newPassword,
        });
        setForgotStatus(t('auth.passwordUpdated'));
        window.setTimeout(() => setForgotOpen(false), 1000);
      } catch (error) {
        setForgotError(translateApiError(error, t, t('auth.passwordUpdateFailed')));
      }
      return;
    }

    const trimmedEmail = forgotEmail.trim();

    if (!trimmedEmail) {
      setForgotError(loginMessages.emailRequired);
      return;
    }

    if (!emailPattern.test(trimmedEmail)) {
      setForgotError(loginMessages.emailInvalid);
      return;
    }

    try {
      await forgotPassword(trimmedEmail);
      setForgotStep('code');
      setForgotStatus(t('auth.codeSent'));
    } catch (error) {
      setForgotError(translateApiError(error, t, t('auth.codeSendFailed')));
    }
  }

  return (
    <PageShell withFooter={false}>
      <main className="auth-screen">
        <Topbar />

        <section className="auth-layout">
          <div className="intro">
            <span className="eyebrow">🚕 {t('auth.eyebrow')}</span>
            <h1 style={{ whiteSpace: 'pre-line' }}>{t('auth.loginHero')}</h1>
            <p>{t('auth.loginHeroCopy')}</p>

            <div className="benefits" aria-label={t('auth.features')}>
              <article>
                <h2>{t('auth.languageSupport')}</h2>
                <p>{t('auth.languageSupportCopy')}</p>
              </article>
              <article>
                <h2>{t('auth.easyBooking')}</h2>
                <p>{t('auth.easyBookingCopy')}</p>
              </article>
              <article>
                <h2>{t('auth.safeContact')}</h2>
                <p>{t('auth.safeContactCopy')}</p>
              </article>
            </div>
          </div>

          <section className="auth-card" aria-labelledby="login-title">
            <div className="form-logo" aria-hidden="true">🚕</div>
            <div className="form-heading">
              <h2 id="login-title">{loginRole === 'driver' ? t('auth.driverLogin') : t('auth.customerLogin')}</h2>
              <p>{loginRole === 'driver' ? t('auth.driverLoginCopy') : t('auth.customerLoginCopy')}</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <div className="login-role-switch" role="tablist" aria-label={t('auth.accountType')}>
                <button
                  className={loginRole === 'customer' ? 'active' : ''}
                  type="button"
                  role="tab"
                  aria-selected={loginRole === 'customer'}
                  onClick={() => {
                    setLoginRole('customer');
                    setStatus('');
                  }}
                >
                  {t('common.customer')}
                </button>
                <button
                  className={loginRole === 'driver' ? 'active' : ''}
                  type="button"
                  role="tab"
                  aria-selected={loginRole === 'driver'}
                  onClick={() => {
                    setLoginRole('driver');
                    setStatus('');
                  }}
                >
                  {t('common.driver')}
                </button>
              </div>

              <label>
                <span>{t('common.email')}</span>
                <input
                  ref={emailRef}
                  id="emailInput"
                  className={errors.email ? 'input-error' : ''}
                  type="email"
                  placeholder="example@email.com"
                  autoComplete="email"
                  value={email}
                  onChange={handleEmailChange}
                  aria-invalid={String(Boolean(errors.email))}
                  aria-describedby="emailError"
                />
                <span className="field-error" id="emailError" aria-live="polite">
                  {errors.email}
                </span>
              </label>

              <PasswordField
                label={t('common.password')}
                placeholder={t('common.password')}
                value={password}
                onChange={handlePasswordChange}
                error={errors.password}
                errorId="passwordError"
                inputRef={passwordRef}
              />

              <div className="form-row">
                <label className="remember">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                  />
                  <span>{t('auth.remember')}</span>
                </label>
                <button className="forgot-button" type="button" onClick={openForgotModal}>
                  {t('auth.forgot')}
                </button>
              </div>

              <div className={`form-status ${status ? 'show' : ''}`} role="status" aria-live="polite">
                {status}
              </div>

              <button className="submit-button" type="submit">{t('auth.login')}</button>
              <div className="login-register-links">
                {loginRole === 'driver' ? (
                  <p className="note-link">{t('auth.noDriverAccount')} <Link to="/driver-register">{t('auth.driverRegister')}</Link></p>
                ) : (
                  <>
                    <p className="note-link">{t('auth.noCustomerAccount')} <Link to="/register">{t('auth.customerRegister')}</Link></p>
                    <p className="note-link driver-register-entry">{t('auth.workAsDriver')} <Link className="driver-register-link" to="/driver-register">{t('auth.driverRegister')}</Link></p>
                  </>
                )}
              </div>
            </form>
          </section>
        </section>

        <Modal open={forgotOpen} title={t('auth.resetTitle')} onClose={() => setForgotOpen(false)}>
          <p className="modal-copy">
            {forgotStep === 'email' && t('auth.resetEmailCopy')}
            {forgotStep === 'code' && t('auth.resetCodeCopy')}
            {forgotStep === 'password' && t('auth.resetPasswordCopy')}
          </p>
          <form className="auth-form" onSubmit={handleForgotSubmit} noValidate>
            {forgotStep === 'email' && (
              <label>
                <span>{t('common.email')}</span>
                <input
                  type="email"
                  className={forgotError ? 'input-error' : ''}
                  placeholder="example@email.com"
                  autoComplete="email"
                  value={forgotEmail}
                  onChange={(event) => {
                    setForgotEmail(event.target.value);
                    setForgotError('');
                    setForgotStatus('');
                  }}
                  aria-invalid={String(Boolean(forgotError))}
                />
              </label>
            )}

            {forgotStep === 'code' && (
              <label>
                <span>{t('auth.code')}</span>
                <input
                  className={forgotError ? 'input-error' : ''}
                  inputMode="numeric"
                  maxLength="6"
                  placeholder="123456"
                  value={forgotCode}
                  onChange={(event) => {
                    setForgotCode(event.target.value);
                    setForgotError('');
                  }}
                />
              </label>
            )}

            {forgotStep === 'password' && (
              <>
                <PasswordField
                  label={t('auth.newPassword')}
                  placeholder={t('auth.newPassword')}
                  value={newPassword}
                  onChange={(event) => {
                    setNewPassword(event.target.value);
                    setForgotError('');
                  }}
                />
                <PasswordField
                  label={t('auth.confirmNewPassword')}
                  placeholder={t('auth.confirmNewPassword')}
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setForgotError('');
                  }}
                />
              </>
            )}
            <span className="field-error" aria-live="polite">{forgotError}</span>
            <div className={`form-status ${forgotStatus ? 'show' : ''}`} role="status" aria-live="polite">
              {forgotStatus}
            </div>
            <button className="submit-button" type="submit">
              {forgotStep === 'email' && t('auth.sendCode')}
              {forgotStep === 'code' && t('auth.verifyCode')}
              {forgotStep === 'password' && t('auth.updatePassword')}
            </button>
          </form>
        </Modal>
      </main>
    </PageShell>
  );
}
