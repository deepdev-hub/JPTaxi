import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff, MapPin, Mail, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError(t.login.errorRequired);
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const success = await login(email, password);
    setLoading(false);
    if (success) {
      navigate("/");
    } else {
      setError(t.login.errorInvalid);
    }
  };

  const quickLogin = (email: string) => {
    setEmail(email);
    setPassword("demo1234");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}>
              <MapPin className="w-6 h-6 text-white" />
            </div>
          </Link>
          <h1 className="text-gray-900 mt-4">{t.login.title}</h1>
          <p className="text-sm text-gray-400 mt-1">{t.login.welcome}</p>
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
              <label className="block text-sm text-gray-700 mb-1.5">{t.login.email}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1.5">{t.login.password}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.login.passwordPlaceholder}
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
              <div className="text-right mt-1.5">
                <Link to="/forgot-password" className="text-xs text-blue-500 hover:text-blue-600">
                  {t.login.forgotPassword}
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-white rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
            >
              {loading ? t.login.loggingIn : t.login.loginBtn}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-50">
            <p className="text-center text-sm text-gray-500">
              {t.login.noAccount}{" "}
              <Link to="/signup" className="text-blue-600 hover:text-blue-700">
                {t.login.signupLink}
              </Link>
            </p>
          </div>
        </div>

        {/* Demo accounts */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 mb-3 text-center">{t.login.demoTitle}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => quickLogin("tanaka@example.com")}
              className="flex items-center gap-2 p-2.5 rounded-xl border border-blue-100 bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop" alt="Diner" className="w-full h-full object-cover" />
              </div>
              <div className="text-left">
                <p className="text-xs text-blue-800">田中（Diner）</p>
                <p className="text-[10px] text-blue-400">{t.login.dinerLabel}</p>
              </div>
            </button>
            <button
              onClick={() => quickLogin("an.nguyen@example.com")}
              className="flex items-center gap-2 p-2.5 rounded-xl border border-green-100 bg-green-50 hover:bg-green-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop" alt="Owner" className="w-full h-full object-cover" />
              </div>
              <div className="text-left">
                <p className="text-xs text-green-800">Văn An（Owner）</p>
                <p className="text-[10px] text-green-400">{t.login.ownerLabel}</p>
              </div>
            </button>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-3">Demo password: demo1234</p>
        </div>
      </div>
    </div>
  );
}
