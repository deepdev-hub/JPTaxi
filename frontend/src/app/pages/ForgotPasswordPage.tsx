import React, { useState } from "react";
import { Link } from "react-router";
import { AlertCircle, CheckCircle, Mail, MapPin } from "lucide-react";
import { requestPasswordReset } from "../api/client";
import { useLanguage } from "../context/LanguageContext";

export function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError(t.forgotPassword.errorRequired);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      setError(t.forgotPassword.errorInvalid);
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset({ email: normalizedEmail });
      setSubmitted(true);
    } catch {
      setError("Dịch vụ gửi email đang tạm thời gián đoạn. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-gray-900 mt-4">{t.forgotPassword.title}</h1>
          <p className="text-sm text-gray-400 mt-1">{t.forgotPassword.subtitle}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          {submitted ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-gray-900 mb-2">{t.forgotPassword.successTitle}</h2>
              <p className="text-sm text-gray-600 mb-3">{t.forgotPassword.successDesc}</p>
              <p className="text-xs text-gray-400 mb-6">{t.forgotPassword.successNote}</p>
              <Link
                to="/login"
                className="inline-block px-6 py-3 text-white rounded-xl text-sm transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
              >
                {t.forgotPassword.backBtn}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-700 mb-1.5">{t.forgotPassword.email}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={t.forgotPassword.emailPlaceholder}
                    autoComplete="email"
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
                {loading ? t.forgotPassword.sending : t.forgotPassword.sendBtn}
              </button>
            </form>
          )}

          {!submitted && (
            <div className="mt-6 pt-6 border-t border-gray-50">
              <p className="text-center text-sm text-gray-500">
                <Link to="/login" className="text-blue-600 hover:text-blue-700">
                  {t.forgotPassword.backToLogin}
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
