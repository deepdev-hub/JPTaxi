import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { registerAccount } from '../api/auth.js';
import PageShell from '../components/PageShell.jsx';
import PasswordField from '../components/PasswordField.jsx';
import Topbar from '../components/Topbar.jsx';
import { persistAuthSession } from '../utils/session.js';
import '../styles/auth.css';

export default function RegisterPage() {
  const navigate = useNavigate();
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

    if (form.password !== form.confirmPassword) {
      setStatus('パスワード確認が一致しません。');
      return;
    }
    if (!form.agreed) {
      setStatus('利用規約に同意してください。');
      return;
    }
    if (isDriverRegistration && !pendingDriver) {
      setStatus('先にドライバー登録情報を入力してください。');
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
      navigate(role === 'driver' ? '/driver-home' : '/home', { replace: true });
    } catch (error) {
      setStatus(error.message || '登録できませんでした。');
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
          <span className="eyebrow">{isDriverRegistration ? '🚖 ドライバーアカウント作成' : '✨ 新規アカウント作成'}</span>
          <h1>{isDriverRegistration ? 'ドライバーアカウントを作成しましょう' : 'JP TAXIをはじめましょう'}</h1>
          <p>{isDriverRegistration ? '先に入力したドライバー情報と紐づけて、運転者用アカウントを作成します。' : '新しいアカウントを作成すると、日本語対応のタクシー予約、履歴確認、メッセージ機能などをご利用いただけます。'}</p>

          <div className="benefits" aria-label="サービスの特徴">
            <article>
              <h2>簡単登録</h2>
              <p>必要情報を入力するだけで、すぐにアカウントを作成できます。</p>
            </article>
            <article>
              <h2>予約管理</h2>
              <p>配車予約から履歴の確認まで、一つのアカウントでまとめて管理できます。</p>
            </article>
            <article>
              <h2>安心の利用</h2>
              <p>日本語対応の画面とサポートで、初めてでも安心して利用できます。</p>
            </article>
          </div>
        </div>

        <section className="auth-card" aria-labelledby="register-title">
          <div className="form-logo" aria-hidden="true">🚕</div>
          <div className="form-heading">
            <h2 id="register-title">{isDriverRegistration ? 'ドライバーアカウント登録' : '顧客登録'}</h2>
            <p>{isDriverRegistration ? 'ログイン用のメールアドレスとパスワードを設定してください。' : '必要情報を入力して、新しいアカウントを作成してください。'}</p>
          </div>

          <form className="auth-form" onSubmit={submitRegistration}>
            <div className="field-grid two">
              <label>
                <span>姓</span>
                <input type="text" placeholder="姓を入力" required value={form.lastName} onChange={(event) => updateField('lastName', event.target.value)} />
              </label>
              <label>
                <span>名</span>
                <input type="text" placeholder="名を入力" required value={form.firstName} onChange={(event) => updateField('firstName', event.target.value)} />
              </label>
            </div>

            <label>
              <span>メールアドレス</span>
              <input type="email" placeholder="example@email.com" required value={form.email} onChange={(event) => updateField('email', event.target.value)} />
            </label>

            <div className="field-grid two">
              <label>
                <span>電話番号</span>
                <input type="tel" placeholder="電話番号を入力" required value={form.phone} onChange={(event) => updateField('phone', event.target.value)} />
              </label>
              <label>
                <span>性別</span>
                <select value={form.gender} onChange={(event) => updateField('gender', event.target.value)}>
                  <option value="Male">男性</option>
                  <option value="Female">女性</option>
                  <option value="Other">その他</option>
                </select>
              </label>
            </div>
            <label>
              <span>生年月日</span>
              <input type="date" value={form.birthDate} onChange={(event) => updateField('birthDate', event.target.value)} />
            </label>

            <PasswordField label="パスワード" placeholder="パスワードを入力" value={form.password} onChange={(event) => updateField('password', event.target.value)} />
            <PasswordField label="パスワード確認" placeholder="もう一度入力" value={form.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} />

            <label className="terms">
              <input type="checkbox" checked={form.agreed} onChange={(event) => updateField('agreed', event.target.checked)} />
              <span>利用規約およびプライバシーポリシーに同意します</span>
            </label>
            {isDriverRegistration && pendingDriver && (
              <div className="notice-box">
                ドライバー申請情報: <strong>{pendingDriver.vehicleBrand || '車両未入力'} / {pendingDriver.licensePlate}</strong>
              </div>
            )}
            {status && <p className="form-status show">{status}</p>}

            <button className="submit-button" type="submit" disabled={isSubmitting}>{isSubmitting ? '登録中...' : '登録'}</button>
            <p className="note-link">すでにアカウントをお持ちですか？ <Link to="/login">ログイン</Link></p>
            {!isDriverRegistration && <p className="note-link">ドライバーですか？ <Link to="/driver-register">運転者登録へ</Link></p>}
          </form>
        </section>
      </section>
    </main>
    </PageShell>
  );
}
