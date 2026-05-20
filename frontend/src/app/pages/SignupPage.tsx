import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff, MapPin, Mail, Lock, User, AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

export function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "diner" as "diner" | "owner",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const validate = () => {
    if (!formData.name.trim()) return t.signup.errorName;
    if (!formData.email.trim()) return t.signup.errorEmail;
    if (!formData.email.includes("@")) return t.signup.errorEmailInvalid;
    if (formData.password.length < 6) return t.signup.errorPasswordShort;
    if (formData.password !== formData.confirmPassword) return t.signup.errorPasswordMismatch;
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    const result = await signup(formData.email, formData.password, formData.name, formData.role);
    setLoading(false);
    if (result.success) {
      alert(t.signup.successAlert);
      navigate("/login");
    } else {
      if (result.error && result.error.includes("Email already exists")) {
        setError(t.signup.errorEmailExists);
      } else {
        setError(result.error || "Signup failed");
      }
    }
  };

  const passwordStrength = () => {
    const p = formData.password;
    if (!p) return { level: 0, label: "" };
    if (p.length < 6) return { level: 1, label: t.signup.strengthWeak, color: "bg-red-400" };
    if (p.length < 8) return { level: 2, label: t.signup.strengthNormal, color: "bg-yellow-400" };
    if (p.match(/[A-Z]/) && p.match(/[0-9]/)) return { level: 4, label: t.signup.strengthStrong, color: "bg-green-500" };
    return { level: 3, label: t.signup.strengthGood, color: "bg-blue-400" };
  };

  const strength = passwordStrength();

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
          <h1 className="text-gray-900 mt-4">{t.signup.title}</h1>
          <p className="text-sm text-gray-400 mt-1">{t.signup.welcome}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Role Selection */}
            <div>
              <label className="block text-sm text-gray-700 mb-2">{t.signup.accountType}</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleChange("role", "diner")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    formData.role === "diner" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-200"
                  }`}
                >
                  <span className="text-2xl">🍜</span>
                  <div className="text-center">
                    <p className="text-sm text-gray-800">{t.signup.dinerRole}</p>
                    <p className="text-xs text-gray-400">{t.signup.dinerSub}</p>
                  </div>
                  {formData.role === "diner" && <CheckCircle className="w-4 h-4 text-blue-500" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleChange("role", "owner")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    formData.role === "owner" ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-green-200"
                  }`}
                >
                  <span className="text-2xl">🏪</span>
                  <div className="text-center">
                    <p className="text-sm text-gray-800">{t.signup.ownerRole}</p>
                    <p className="text-xs text-gray-400">{t.signup.ownerSub}</p>
                  </div>
                  {formData.role === "owner" && <CheckCircle className="w-4 h-4 text-green-500" />}
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">{t.signup.name}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder={t.signup.namePlaceholder}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">{t.signup.email}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="example@email.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">{t.signup.password}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  placeholder={t.signup.passwordPlaceholder}
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
              {formData.password && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all ${
                          i <= strength.level ? strength.color : "bg-gray-100"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{t.signup.passwordStrength} {strength.label}</p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">{t.signup.confirmPassword}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  placeholder={t.signup.confirmPlaceholder}
                  className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <CheckCircle className="absolute right-9 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-white rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-60 mt-2"
              style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
            >
              {loading ? t.signup.creating : t.signup.createBtn}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-50">
            <p className="text-center text-sm text-gray-500">
              {t.signup.haveAccount}{" "}
              <Link to="/login" className="text-blue-600 hover:text-blue-700">
                {t.signup.loginLink}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
