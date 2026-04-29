import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import {
  MapPin, Search, User, LogOut, Menu, X, MessageCircle,
  ChevronDown, Store, Settings
} from "lucide-react";

// Flag SVG components
function FlagJP() {
  return (
    <svg width="22" height="16" viewBox="0 0 22 16" xmlns="http://www.w3.org/2000/svg">
      <rect width="22" height="16" rx="2" fill="white" />
      <circle cx="11" cy="8" r="4.4" fill="#BC002D" />
    </svg>
  );
}

function FlagVN() {
  return (
    <svg width="22" height="16" viewBox="0 0 22 16" xmlns="http://www.w3.org/2000/svg">
      <rect width="22" height="16" rx="2" fill="#DA251D" />
      <polygon
        points="11,3.2 12.35,7.2 16.5,7.2 13.1,9.6 14.45,13.6 11,11.2 7.55,13.6 8.9,9.6 5.5,7.2 9.65,7.2"
        fill="#FFCD00"
      />
    </svg>
  );
}

export function Header() {
  const { currentUser, isLoggedIn, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
    setUserMenuOpen(false);
  };

  const toggleLanguage = () => {
    setLanguage(language === "ja" ? "vi" : "ja");
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}>
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg text-gray-900" style={{ fontWeight: 700, letterSpacing: "-0.5px" }}>
                ChikaiMise
              </span>
              <span className="text-[10px] text-gray-400 block leading-none">近い店</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/search"
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                location.pathname === "/search" ? "text-blue-600" : "text-gray-600 hover:text-blue-600"
              }`}
            >
              <Search className="w-4 h-4" />
              <span>{t.header.search}</span>
            </Link>
            {isLoggedIn && (
              <>
                <Link
                  to="/chat"
                  className={`flex items-center gap-1.5 text-sm transition-colors ${
                    location.pathname === "/chat" ? "text-blue-600" : "text-gray-600 hover:text-blue-600"
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{t.header.messages}</span>
                </Link>
                {currentUser?.role === "owner" && (
                  <Link
                    to="/owner/restaurants"
                    className={`flex items-center gap-1.5 text-sm transition-colors ${
                      location.pathname.startsWith("/owner") ? "text-blue-600" : "text-gray-600 hover:text-blue-600"
                    }`}
                  >
                    <Store className="w-4 h-4" />
                    <span>{t.header.storeManagement}</span>
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              title={language === "ja" ? "Chuyển sang Tiếng Việt" : "日本語に切り替え"}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
            >
              <div className={`transition-all ${language === "ja" ? "opacity-100" : "opacity-40 group-hover:opacity-60"}`}>
                <FlagJP />
              </div>
              <span className="text-[10px] text-gray-300 select-none">|</span>
              <div className={`transition-all ${language === "vi" ? "opacity-100" : "opacity-40 group-hover:opacity-60"}`}>
                <FlagVN />
              </div>
            </button>

            {isLoggedIn ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center">
                    {currentUser?.avatar ? (
                      <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <span className="hidden sm:block text-sm text-gray-700 max-w-[120px] truncate">
                    {currentUser?.name}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-50">
                      <p className="text-sm text-gray-900 truncate">{currentUser?.name}</p>
                      <p className="text-xs text-gray-400 truncate">{currentUser?.email}</p>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      {t.header.profileSettings}
                    </Link>
                    {currentUser?.role === "owner" && (
                      <Link
                        to="/owner/restaurants"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <Store className="w-4 h-4" />
                        {t.header.storeManagement}
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      {t.header.logout}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="hidden sm:block px-4 py-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                >
                  {t.header.login}
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 text-sm text-white rounded-lg transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
                >
                  {t.header.signup}
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-50"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 py-3 space-y-1">
            <Link
              to="/search"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              <Search className="w-4 h-4" />
              {t.header.search}
            </Link>
            {isLoggedIn && (
              <>
                <Link
                  to="/chat"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  <MessageCircle className="w-4 h-4" />
                  {t.header.messages}
                </Link>
                {currentUser?.role === "owner" && (
                  <Link
                    to="/owner/restaurants"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                  >
                    <Store className="w-4 h-4" />
                    {t.header.storeManagement}
                  </Link>
                )}
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  <User className="w-4 h-4" />
                  {t.header.profileSettings}
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  {t.header.logout}
                </button>
              </>
            )}
            {!isLoggedIn && (
              <>
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  {t.header.login}
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-blue-600 hover:bg-blue-50"
                >
                  {t.header.signup}
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {/* Overlay to close user menu */}
      {userMenuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
      )}
    </header>
  );
}
