import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { uploadDriverDocument } from '../api/accounts.js';
import PageShell from '../components/PageShell.jsx';
import '../styles/auth.css';
import '../styles/app-pages.css';

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const documentUploads = [
  { key: 'portrait', type: 'portrait', icon: '🧑', label: '顔写真' },
  { key: 'licenseFront', type: 'license_front', icon: '📄', label: '免許証（表）' },
  { key: 'licenseBack', type: 'license_back', icon: '🪪', label: '免許証（裏）' },
  { key: 'vehiclePhoto', type: 'vehicle_photo', icon: '🚗', label: '車両写真' },
  { key: 'registrationPaper', type: 'registration_paper', icon: '📘', label: '車検証' },
];

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileUploadBox({ item, file, onChange }) {
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return undefined;
    }
    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  return (
    <article className={`driver-doc-upload-card ${file ? 'has-file' : ''}`}>
      <div className="driver-doc-preview">
        {previewUrl ? <img src={previewUrl} alt={item.label} /> : <span>{item.icon}</span>}
      </div>
      <div className="driver-doc-upload-body">
        <strong>{item.label}</strong>
        <small>{file ? `${file.name} · ${formatFileSize(file.size)}` : 'JPEG / PNG / WebP · 5MB'}</small>
      </div>
      <div className="driver-doc-upload-actions">
        <label className="secondary-button doc-upload-select">
          <span>{file ? '変更' : '選択'}</span>
          <input
            type="file"
            accept={IMAGE_ACCEPT}
            hidden
            onChange={(event) => {
              onChange(event.target.files?.[0] ?? null);
              event.target.value = '';
            }}
          />
        </label>
        {file && <button className="doc-upload-remove" type="button" onClick={() => onChange(null)}>×</button>}
      </div>
    </article>
  );
}

export default function DriverRegisterPage() {
  const navigate = useNavigate();
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
  const [files, setFiles] = useState({
    portrait: null,
    licenseFront: null,
    licenseBack: null,
    vehiclePhoto: null,
    registrationPaper: null,
  });
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateFile(key, file) {
    if (file && (!IMAGE_ACCEPT.includes(file.type) || file.size > MAX_FILE_BYTES)) {
      setStatus('画像はJPEG / PNG / WebP形式、5MB以下にしてください。');
      return;
    }
    setStatus('');
    setFiles((current) => ({ ...current, [key]: file }));
  }

  async function submitDriverApplication(event) {
    event.preventDefault();
    if (!form.lastName.trim() || !form.firstName.trim() || !form.phone.trim() || !form.licenseNumber.trim() || !form.licensePlate.trim()) {
      setStatus('必要な情報を入力してください。');
      return;
    }

    const missing = documentUploads.find((item) => !files[item.key]);
    if (missing) {
      setStatus(`${missing.label}を選択してください。`);
      return;
    }

    setSubmitting(true);
    try {
      const documents = {};
      await Promise.all(documentUploads.map(async (item) => {
        documents[item.key] = await uploadDriverDocument(item.type, files[item.key]);
      }));
      sessionStorage.setItem('jpTaxiPendingDriverRegistration', JSON.stringify({ ...form, documents }));
      navigate('/register?role=driver');
    } catch (error) {
      setStatus(error.message || '画像をアップロードできませんでした。');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell withFooter={false}>
      <main className="driver-register-screen">
        <section className="driver-register-layout">
          <div className="driver-register-intro">
            <span className="eyebrow">🚖 ドライバー登録・免許更新</span>
            <h1>ドライバーとして登録し、JP TAXIで働きましょう</h1>
            <p>運転免許証や車両情報を登録すると、配車リクエストの受信やプロフィール管理ができるようになります。</p>

            <div className="driver-register-benefits">
              <article><strong>オンライン申請</strong><span>必要情報と本人確認書類をアップロードして、オンラインで申請できます。</span></article>
              <article><strong>免許更新対応</strong><span>有効期限の近い運転免許証を更新し、継続稼働に備えます。</span></article>
              <article><strong>審査後すぐ開始</strong><span>審査完了後、配車リクエストを受け取って運転を始められます。</span></article>
            </div>

            <div className="driver-register-steps">
              <article><span>1</span><div><strong>基本情報の入力</strong><small>氏名・電話番号・使用言語などのプロフィール情報を入力します。</small></div></article>
              <article><span>2</span><div><strong>免許証・本人確認書類の提出</strong><small>運転免許証や本人確認書類をアップロードして審査を受けます。</small></div></article>
              <article><span>3</span><div><strong>車両情報の登録</strong><small>車種・ナンバープレート・座席数などを入力して登録を完了します。</small></div></article>
            </div>
          </div>

          <section className="driver-register-form-card">
            <Link className="driver-register-login-link" to="/login">← ログインへ戻る</Link>
            <div className="form-logo" aria-hidden="true">🚕</div>
            <div className="form-heading">
              <h2>運転者登録</h2>
              <p>ドライバー登録、または運転免許・車両情報の更新を行ってください。</p>
            </div>

            <form className="auth-form driver-register-form" onSubmit={submitDriverApplication}>
              <div className="notice-box">現在の申請状況：<strong>未提出</strong><br />書類の審査には通常1〜2営業日かかります。</div>

              <h3 className="section-title">基本情報</h3>
              <div className="field-grid two">
                <label><span>姓</span><input placeholder="山田" value={form.lastName} onChange={(event) => updateField('lastName', event.target.value)} /></label>
                <label><span>名</span><input placeholder="太郎" value={form.firstName} onChange={(event) => updateField('firstName', event.target.value)} /></label>
                <label><span>電話番号</span><input placeholder="+84 000 000 000" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} /></label>
                <label>
                  <span>日本語レベル</span>
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

              <h3 className="section-title">運転免許情報</h3>
              <div className="field-grid two">
                <label><span>免許証番号</span><input placeholder="DL-123456789" value={form.licenseNumber} onChange={(event) => updateField('licenseNumber', event.target.value)} /></label>
                <label>
                  <span>免許種別</span>
                  <select value={form.licenseType} onChange={(event) => updateField('licenseType', event.target.value)}>
                    <option value="B">B</option>
                    <option value="C1">C1</option>
                    <option value="C">C</option>
                    <option value="D1">D1</option>
                    <option value="D2">D2</option>
                    <option value="D">D</option>
                  </select>
                </label>
                <label><span>有効期限</span><input type="date" value={form.licenseExpiryDate} onChange={(event) => updateField('licenseExpiryDate', event.target.value)} /></label>
              </div>
              <h3 className="section-title">車両情報</h3>
              <div className="field-grid two">
                <label><span>車種</span><input placeholder="Toyota Vios" value={form.vehicleBrand} onChange={(event) => updateField('vehicleBrand', event.target.value)} /></label>
                <label><span>ナンバープレート</span><input placeholder="30A-123.45" value={form.licensePlate} onChange={(event) => updateField('licensePlate', event.target.value)} /></label>
                <label>
                  <span>座席数</span>
                  <select value={form.vehicleType} onChange={(event) => updateField('vehicleType', event.target.value)}>
                    <option value="4">4人乗り</option>
                    <option value="7">7人乗り</option>
                    <option value="9">9人乗り</option>
                  </select>
                </label>
                <label><span>車両カラー</span><input placeholder="白" value={form.vehicleColor} onChange={(event) => updateField('vehicleColor', event.target.value)} /></label>
              </div>
              <div className="document-upload-heading">
                <h3 className="section-title">書類アップロード</h3>
                <span>{Object.values(files).filter(Boolean).length} / {documentUploads.length}</span>
              </div>
              <div className="upload-grid">
                {documentUploads.map((item) => (
                  <FileUploadBox item={item} file={files[item.key]} key={item.key} onChange={(file) => updateFile(item.key, file)} />
                ))}
              </div>

              <label className="terms">
                <input type="checkbox" required />
                <span>提出した情報が正確であり、ドライバー利用規約および審査ポリシーに同意します。</span>
              </label>
              {status && <p className="form-status show">{status}</p>}

              <div className="driver-register-actions">
                <button className="secondary-button" type="button" onClick={() => navigate('/login')}>戻る</button>
                <button className="submit-button" type="submit" disabled={submitting}>{submitting ? '送信中...' : '申請を送信'}</button>
              </div>
            </form>
          </section>
        </section>
      </main>
    </PageShell>
  );
}
