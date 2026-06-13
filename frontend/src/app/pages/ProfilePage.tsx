import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { User, Mail, Phone, MapPin, Lock, Save, Store, Camera, CheckCircle, AlertCircle } from "lucide-react";
import { updateUser, uploadAvatarImage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

export function ProfilePage() {
  const { currentUser, updateProfile, isLoggedIn } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: currentUser?.name || "",
    email: currentUser?.email || "",
    phone: currentUser?.phone || "",
    address: currentUser?.address || "",
  });

  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");

  useEffect(() => {
    if (!isLoggedIn) navigate("/login");
  }, [isLoggedIn, navigate]);

  if (!isLoggedIn || !currentUser) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const success = await updateProfile(formData);
    setSaving(false);
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      alert(t.profile.passwordMismatch);
      return;
    }
    setSaving(true);
    await updateUser(currentUser.id, { password: passwords.new });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setPasswords({ current: "", new: "", confirm: "" });
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setAvatarError("");

    if (!file || avatarUploading) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Vui lòng chọn file ảnh hợp lệ.");
      return;
    }

    setAvatarUploading(true);
    try {
      const savedUser = await uploadAvatarImage(currentUser.id, file);
      await updateProfile({ avatar: savedUser.avatar });
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : "Không thể tải ảnh đại diện.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const roleLabel = currentUser.role === "owner" ? t.profile.ownerRole : t.profile.dinerRole;
  const roleBadgeColor = currentUser.role === "owner" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-blue-400" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-md hover:bg-blue-700 transition-colors cursor-pointer">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-gray-900">{currentUser.name}</h1>
              <p className="text-sm text-gray-400 mt-0.5">{currentUser.email}</p>
              <span className={`inline-block mt-2 text-xs px-3 py-1 rounded-full ${roleBadgeColor}`}>
                {roleLabel}
              </span>
            </div>
            {currentUser.role === "owner" && (
              <div className="sm:ml-auto">
                <Link
                  to="/owner/restaurants"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-white rounded-xl transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
                >
                  <Store className="w-4 h-4" />
                  {t.profile.storeManagement}
                </Link>
              </div>
            )}
          </div>
        </div>

        {saved && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
            <CheckCircle className="w-4 h-4" />
            {t.profile.saved}
          </div>
        )}
        {avatarError && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="w-4 h-4" />
            {avatarError}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2 rounded-xl text-sm transition-all ${
              activeTab === "profile" ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-blue-200"
            }`}
          >
            {t.profile.editProfile}
          </button>
          <button
            onClick={() => setActiveTab("password")}
            className={`px-4 py-2 rounded-xl text-sm transition-all ${
              activeTab === "password" ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-blue-200"
            }`}
          >
            {t.profile.changePassword}
          </button>
        </div>

        {/* Profile Form */}
        {activeTab === "profile" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-gray-900 mb-6">{t.profile.basicInfoTitle}</h2>
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">{t.profile.name}</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1.5">{t.profile.email}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1.5">{t.profile.phone}</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+81 90-1234-5678 / 0912 345 678"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1.5">{t.profile.address}</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder={t.profile.addressPlaceholder}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 text-white rounded-xl text-sm transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
              >
                <Save className="w-4 h-4" />
                {t.profile.saveBtn}
              </button>
            </form>
          </div>
        )}

        {/* Password Form */}
        {activeTab === "password" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-gray-900 mb-6">{t.profile.passwordTitle}</h2>
            <form onSubmit={handlePasswordChange} className="space-y-5">
              <div>
                <label className="block text-sm text-gray-700 mb-1.5">{t.profile.currentPassword}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={passwords.current}
                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                    placeholder={t.profile.currentPassword}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1.5">{t.profile.newPassword}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={passwords.new}
                    onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                    placeholder={t.profile.newPasswordPlaceholder}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1.5">{t.profile.confirmPassword}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                    placeholder={t.profile.confirmPlaceholder}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 text-white rounded-xl text-sm transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
              >
                <Lock className="w-4 h-4" />
                {t.profile.changePasswordBtn}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
