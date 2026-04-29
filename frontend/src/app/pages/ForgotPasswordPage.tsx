import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Mail, MapPin, AlertCircle, CheckCircle } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!email) {
      setError(t.forgotPassword.errorRequired);
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t.forgotPassword.errorInvalid);
      return;
    }

    setLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock check: demo emails exist
    const demoEmails = ["tanaka@example.com", "an.nguyen@example.com"];
    if (!demoEmails.includes(email)) {
      setError(t.forgotPassword.errorNotFound);
      setLoading(false);
      return;
    }

    setLoading(false);
    setSuccess(true);

    // Redirect after 4 seconds
    setTimeout(() => {
      navigate("/login");
    }, 4000);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-gray-900 mb-2">{t.forgotPassword.successTitle}</h2>
            <p className="text-sm text-gray-600 mb-4">{t.forgotPassword.successDesc}</p>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-6">
              <p className="text-xs text-blue-700">{t.forgotPassword.successNote}</p>
            </div>
            <Link
              to="/login"
              className="inline-block px-6 py-3 text-white rounded-xl text-sm transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
            >
              {t.forgotPassword.backBtn}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
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

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
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
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.forgotPassword.emailPlaceholder}
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

          <div className="mt-6 pt-6 border-t border-gray-50">
            <p className="text-center text-sm text-gray-500">
              <Link to="/login" className="text-blue-600 hover:text-blue-700">
                {t.forgotPassword.backToLogin}
              </Link>
            </p>
          </div>
        </div>

        {/* Demo hint */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 mb-2 text-center">📧 Demo emails:</p>
          <div className="space-y-1">
            <p className="text-xs text-gray-600 text-center font-mono">tanaka@example.com</p>
            <p className="text-xs text-gray-600 text-center font-mono">an.nguyen@example.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
