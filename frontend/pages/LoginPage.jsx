import { Link, useNavigate } from 'react-router-dom';
import { useRef, useState } from 'react';
import Modal from '../components/Modal.jsx';
import PageShell from '../components/PageShell.jsx';
import PasswordField from '../components/PasswordField.jsx';
import Topbar from '../components/Topbar.jsx';
import { apiRequest } from '../api/client.js';
import { emailPattern } from '../utils/loginValidation.js';
import '../styles/auth.css';

const loginMessages = {
  emailRequired: 'メールアドレスを入力してください。',
  emailInvalid: '正しいメールアドレス形式で入力してください。',
  passwordRequired: 'パスワードを入力してください。',
  passwordShort: 'パスワードは6文字以上で入力してください。',
  success: 'ログイン情報を確認しました。',
};

export default function LoginPage() {
  const navigate = useNavigate();
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
      const result = await apiRequest('/login', {
        method: 'POST',
        body: JSON.stringify({ email: trimmedEmail, password, role: loginRole }),
      });
      const role = result?.role === 'driver' ? 'driver' : 'customer';

      localStorage.setItem('jpTaxiToken', result.token);
      localStorage.setItem('jpTaxiRole', role);
      localStorage.setItem('jpTaxiUserEmail', trimmedEmail);
      localStorage.setItem(role === 'driver' ? 'jpTaxiDriverToken' : 'jpTaxiCustomerToken', result.token);
      localStorage.setItem(role === 'driver' ? 'jpTaxiDriverEmail' : 'jpTaxiCustomerEmail', trimmedEmail);
      sessionStorage.setItem('jpTaxiActiveRole', role);

      if (result?.user?.customerId) {
        localStorage.setItem('jpTaxiCustomerId', String(result.user.customerId));
      }
      if (result?.user?.driverId) {
        localStorage.setItem('jpTaxiDriverId', String(result.user.driverId));
      }

      setStatus(loginMessages.success);
      navigate(role === 'driver' ? '/driver-home' : '/home');
    } catch (error) {
      localStorage.removeItem('jpTaxiToken');
      localStorage.removeItem('jpTaxiRole');
      localStorage.removeItem('jpTaxiUserEmail');
      sessionStorage.removeItem('jpTaxiActiveRole');
      setStatus(error.message || 'ログインできませんでした。');
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

  function handleForgotSubmit(event) {
    event.preventDefault();
    setForgotError('');
    setForgotStatus('');

    if (forgotStep === 'code') {
      if (!forgotCode.trim()) {
        setForgotError('確認コードを入力してください。');
        return;
      }

      setForgotStep('password');
      return;
    }

    if (forgotStep === 'password') {
      if (newPassword.length < 6) {
        setForgotError('パスワードは6文字以上で入力してください。');
        return;
      }

      if (newPassword !== confirmPassword) {
        setForgotError('確認用パスワードが一致しません。');
        return;
      }

      setForgotStatus('新しいパスワードを設定しました。');
      window.setTimeout(() => setForgotOpen(false), 1000);
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

    setForgotStep('code');
    setForgotStatus('確認コードを送信しました。');
  }

  return (
    <PageShell withFooter={false}>
      <main className="auth-screen">
        <Topbar />

        <section className="auth-layout">
          <div className="intro">
            <span className="eyebrow">🚕 日本語対応タクシーサービス</span>
            <h1>安心・簡単にJP TAXIへログイン</h1>
            <p>日本語でタクシーを予約し、移動履歴、メッセージ、アカウント情報をまとめて管理できます。</p>

            <div className="benefits" aria-label="サービスの特徴">
              <article>
                <h2>日本語対応</h2>
                <p>日本人利用者にも分かりやすいUIで安心して利用できます。</p>
              </article>
              <article>
                <h2>簡単予約</h2>
                <p>目的地の検索から配車確認まで、スムーズに進められます。</p>
              </article>
              <article>
                <h2>安全な連絡</h2>
                <p>アプリ内メッセージ機能でドライバーと直接連絡できます。</p>
              </article>
            </div>
          </div>

          <section className="auth-card" aria-labelledby="login-title">
            <div className="form-logo" aria-hidden="true">🚕</div>
            <div className="form-heading">
              <h2 id="login-title">{loginRole === 'driver' ? 'ドライバーログイン' : 'お客様ログイン'}</h2>
              <p>{loginRole === 'driver' ? '配車リクエストを受け取るドライバーアカウントでログインしてください。' : '予約を行うお客様アカウントでログインしてください。'}</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <div className="login-role-switch" role="tablist" aria-label="ログインするアカウントの種類">
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
                  お客様
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
                  ドライバー
                </button>
              </div>

              <label>
                <span>メールアドレス</span>
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
                label="パスワード"
                placeholder="パスワードを入力"
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
                  <span>ログイン状態を保持する</span>
                </label>
                <button className="forgot-button" type="button" onClick={openForgotModal}>
                  パスワードを忘れた場合
                </button>
              </div>

              <div className={`form-status ${status ? 'show' : ''}`} role="status" aria-live="polite">
                {status}
              </div>

              <button className="submit-button" type="submit">ログインする</button>
              <div className="login-register-links">
                {loginRole === 'driver' ? (
                  <p className="note-link">ドライバーアカウントをお持ちでないですか？ <Link to="/driver-register">運転者登録</Link></p>
                ) : (
                  <>
                    <p className="note-link">アカウントをお持ちでないですか？ <Link to="/register">顧客登録</Link></p>
                    <p className="note-link driver-register-entry">ドライバーとして働きますか？ <Link className="driver-register-link" to="/driver-register">運転者登録</Link></p>
                  </>
                )}
              </div>
            </form>
          </section>
        </section>

        <Modal open={forgotOpen} title="パスワード再設定" onClose={() => setForgotOpen(false)}>
          <p className="modal-copy">
            {forgotStep === 'email' && '登録済みのメールアドレスを入力してください。確認コードを送信します。'}
            {forgotStep === 'code' && 'メールに届いた確認コードを入力してください。'}
            {forgotStep === 'password' && '新しいパスワードを入力してください。'}
          </p>
          <form className="auth-form" onSubmit={handleForgotSubmit} noValidate>
            {forgotStep === 'email' && (
              <label>
                <span>メールアドレス</span>
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
                <span>確認コード</span>
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
                  label="新しいパスワード"
                  placeholder="新しいパスワード"
                  value={newPassword}
                  onChange={(event) => {
                    setNewPassword(event.target.value);
                    setForgotError('');
                  }}
                />
                <PasswordField
                  label="新しいパスワード確認"
                  placeholder="もう一度入力"
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
              {forgotStep === 'email' && 'コードを送信する'}
              {forgotStep === 'code' && 'コードを確認する'}
              {forgotStep === 'password' && 'パスワードを更新する'}
            </button>
          </form>
        </Modal>
      </main>
    </PageShell>
  );
}
