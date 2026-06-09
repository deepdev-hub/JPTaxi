import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { AlertCircle, CheckCircle, Mail, MapPin, Key, Lock, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

// 3 mã OTP demo có chứa chữ và số theo yêu cầu
const VALID_OTPS = ["X7K9P2", "M4V2Q8", "L9Z3T5"];

export function ForgotPasswordPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError(t.forgotPassword?.errorRequired || "Vui lòng nhập email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t.forgotPassword?.errorInvalid || "Email không hợp lệ");
      return;
    }

    setLoading(true);
    // Giả lập delay gọi API 0.8 giây
    setTimeout(() => {
      setLoading(false);
      setStep(2);
    }, 800);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!otp) {
      setError("Vui lòng nhập mã xác thực");
      return;
    }

    if (VALID_OTPS.includes(otp.toUpperCase())) {
      setStep(3);
    } else {
      setError("Mã xác thực không chính xác. Vui lòng thử lại.");
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError(t.signup?.errorPasswordShort || "Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t.signup?.errorPasswordMismatch || "Mật khẩu xác nhận không khớp");
      return;
    }

    setLoading(true);
    // Giả lập delay cập nhật mật khẩu
    setTimeout(() => {
      setLoading(false);
      setStep(4);
    }, 1000);
  };

  if (step === 4) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-gray-900 mb-2">Đổi mật khẩu thành công!</h2>
            <p className="text-sm text-gray-600 mb-4">
              Mật khẩu của bạn đã được cập nhật. Vui lòng đăng nhập lại với mật khẩu mới.
            </p>
            <Link
              to="/login"
              className="inline-block px-6 py-3 text-white rounded-xl text-sm transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
            >
              Quay lại đăng nhập
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
            >
              <MapPin className="w-6 h-6 text-white" />
            </div>
          </Link>
          <h1 className="text-gray-900 mt-4">
            {step === 1 && (t.forgotPassword?.title || "Reset mật khẩu")}
            {step === 2 && "Nhập mã xác thực"}
            {step === 3 && "Đặt mật khẩu mới"}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {step === 1 && "Nhập email đã đăng ký để nhận link reset mật khẩu"}
            {step === 2 && `Mã xác thực đã được gửi tới ${email}`}
            {step === 3 && "Vui lòng nhập mật khẩu mới cho tài khoản của bạn"}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          {/* STEP 1: EMAIL */}
          {step === 1 && (
            <form onSubmit={handleEmailSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-700 mb-1.5">{t.forgotPassword?.email || "Email"}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.forgotPassword?.emailPlaceholder || "example@email.com"}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-white rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
              >
                {loading ? (t.forgotPassword?.sending || "Đang gửi...") : (t.forgotPassword?.sendBtn || "Gửi liên kết reset")}
              </button>
            </form>
          )}

          {/* STEP 2: OTP */}
          {step === 2 && (
            <form onSubmit={handleOtpSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Mã xác thực</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Nhập mã xác thực (VD: A1B2C3)"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors uppercase"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 text-white rounded-xl text-sm transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
              >
                Xác nhận mã
              </button>
            </form>
          )}

          {/* STEP 3: NEW PASSWORD */}
          {step === 3 && (
            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-700 mb-1.5">{t.profile?.newPassword || "Mật khẩu mới"}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t.signup?.passwordPlaceholder || "Tối thiểu 6 ký tự"}
                    className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1.5">{t.profile?.confirmPassword || "Xác nhận mật khẩu mới"}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t.signup?.confirmPlaceholder || "Nhập lại mật khẩu"}
                    className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-white rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
              >
                {loading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
              </button>
            </form>
          )}

          {(step === 1 || step === 2) && (
            <div className="mt-6 pt-6 border-t border-gray-50">
              <p className="text-center text-sm text-gray-500">
                <Link to="/login" className="text-blue-600 hover:text-blue-700">
                  {t.forgotPassword?.backToLogin || "Quay lại đăng nhập"}
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
