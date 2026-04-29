import React, { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Search, MapPin, Clock, Star, ChevronRight, Sparkles, Navigation } from "lucide-react";
import { mockRestaurants } from "../data/mockData";
import { RestaurantCard } from "../components/RestaurantCard";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

export function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { t } = useLanguage();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const handleQuickFilter = (filter: string) => {
    setActiveFilter(filter);
    navigate(`/search?filter=${filter}`);
  };

  const featuredRestaurants = mockRestaurants.filter((r) => r.rating >= 4.5).slice(0, 3);
  const nearbyRestaurants = [...mockRestaurants].sort((a, b) => (a.distance || 0) - (b.distance || 0)).slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0055AA 0%, #003380 40%, #001a4d 100%)",
          minHeight: "520px",
        }}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 rounded-full border-2 border-white" />
          <div className="absolute top-20 right-20 w-48 h-48 rounded-full border border-white" />
          <div className="absolute bottom-10 left-1/3 w-24 h-24 rounded-full border-2 border-white" />
          <div className="absolute -bottom-10 right-10 w-40 h-40 rounded-full border border-white" />
        </div>

        {/* Japanese pattern overlay */}
        <div className="absolute inset-0 opacity-5 text-white text-8xl select-none pointer-events-none flex flex-wrap gap-8 p-8 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <span key={i}>近</span>
          ))}
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm mb-6 border border-white/20">
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span>{t.home.badge}</span>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl text-white mb-3" style={{ fontWeight: 800, lineHeight: "1.2" }}>
            ChikaiMise
            <span className="block text-2xl sm:text-3xl mt-2 text-blue-200" style={{ fontWeight: 400 }}>
              {t.home.subtitle}
            </span>
          </h1>
          <p className="text-blue-100 text-base sm:text-lg mb-10 max-w-xl mx-auto">
            {t.home.description}
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 bg-white rounded-2xl p-2 shadow-xl">
              <div className="flex-1 flex items-center gap-3 px-3">
                <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.home.searchPlaceholder}
                  className="flex-1 text-gray-800 placeholder-gray-400 outline-none bg-transparent text-sm"
                />
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 border-l border-gray-100">
                <MapPin className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-500">{t.home.city}</span>
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 text-white rounded-xl text-sm flex-shrink-0 transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
              >
                {t.home.searchBtn}
              </button>
            </div>
          </form>

          {/* Quick suggestions */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            {t.home.quickSuggestions.map((suggestion) => (
              <button
                key={suggestion.filter}
                onClick={() => handleQuickFilter(suggestion.filter)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm backdrop-blur-sm border border-white/20 transition-all"
              >
                <span>{suggestion.icon}</span>
                <span>{suggestion.label}</span>
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 mt-12">
            {t.home.stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl text-white" style={{ fontWeight: 700 }}>{stat.value}</div>
                <div className="text-xs text-blue-200 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60V30C240 0 480 0 720 30C960 60 1200 60 1440 30V60H0Z" fill="#f9fafb" />
          </svg>
        </div>
      </div>

      {/* Map Preview Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Map preview */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <h2 className="text-gray-900">{t.home.mapTitle}</h2>
                  <p className="text-sm text-gray-400">{t.home.mapSub}</p>
                </div>
                <Link
                  to="/search"
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  {t.home.viewAll} <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              {/* Map placeholder */}
              <div className="relative h-64 bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-full h-full">
                    {/* Grid lines simulating map */}
                    <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#3B82F6" strokeWidth="0.5"/>
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>

                    {/* Road lines */}
                    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                      <line x1="20%" y1="0" x2="20%" y2="100%" stroke="#CBD5E1" strokeWidth="8" />
                      <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#CBD5E1" strokeWidth="12" />
                      <line x1="80%" y1="0" x2="80%" y2="100%" stroke="#CBD5E1" strokeWidth="6" />
                      <line x1="0" y1="30%" x2="100%" y2="30%" stroke="#CBD5E1" strokeWidth="10" />
                      <line x1="0" y1="60%" x2="100%" y2="60%" stroke="#CBD5E1" strokeWidth="8" />
                      <rect x="25%" y="10%" width="20%" height="18%" rx="4" fill="#E2E8F0" />
                      <rect x="55%" y="35%" width="22%" height="22%" rx="4" fill="#E2E8F0" />
                      <rect x="5%" y="40%" width="12%" height="16%" rx="4" fill="#E2E8F0" />
                    </svg>

                    {/* Restaurant pins */}
                    {mockRestaurants.slice(0, 4).map((r, i) => {
                      const positions = [
                        { left: "25%", top: "25%" },
                        { left: "55%", top: "45%" },
                        { left: "40%", top: "65%" },
                        { left: "70%", top: "20%" },
                      ];
                      return (
                        <Link
                          key={r.id}
                          to={`/restaurant/${r.id}`}
                          className="absolute -translate-x-1/2 -translate-y-full group"
                          style={positions[i]}
                        >
                          <div className="relative">
                            <div
                              className="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs transition-transform group-hover:scale-110"
                              style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
                            >
                              {i + 1}
                            </div>
                            <div className="absolute left-1/2 top-full -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-blue-600" />
                          </div>
                          <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 bg-white rounded-lg shadow-lg p-2 w-36 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                            <p className="text-xs text-gray-900 truncate">{r.nameJp}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span className="text-xs text-gray-500">{r.rating}</span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}

                    {/* Current location */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white shadow-md">
                        <div className="w-2 h-2 rounded-full bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      </div>
                      <div className="w-12 h-12 rounded-full bg-blue-200 opacity-30 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-ping" />
                    </div>
                  </div>
                </div>

                <Link
                  to="/search"
                  className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-2 bg-white rounded-xl shadow-md text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  {t.home.viewMap}
                </Link>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-gray-900">{t.home.quickAccess}</h2>
            {t.home.foodItems.map((item) => (
              <Link
                key={item.filter}
                to={`/search?tag=${encodeURIComponent(item.filter)}`}
                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all group"
              >
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-800 group-hover:text-blue-600 transition-colors">{item.label}</p>
                  <p className="text-xs text-gray-400">{item.sub}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Featured Restaurants */}
      <div className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-gray-900">{t.home.featuredTitle}</h2>
              <p className="text-sm text-gray-400 mt-1">{t.home.featuredSub}</p>
            </div>
            <Link to="/search" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              {t.home.viewAll} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredRestaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        </div>
      </div>

      {/* Nearby Restaurants */}
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-gray-900">{t.home.nearbyTitle}</h2>
              <p className="text-sm text-gray-400 mt-1">{t.home.nearbySub}</p>
            </div>
            <Link to="/search?filter=near" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              {t.home.viewMore} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {nearbyRestaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        </div>
      </div>

      {/* CTA for non-logged-in users */}
      {!isLoggedIn && (
        <div className="py-16" style={{ background: "linear-gradient(135deg, #f0f7ff 0%, #e8f0fe 100%)" }}>
          <div className="max-w-2xl mx-auto text-center px-4">
            <h2 className="text-gray-900 mb-3">{t.home.ctaTitle}</h2>
            <p className="text-gray-500 mb-8 text-sm">{t.home.ctaDesc}</p>
            <div className="flex items-center justify-center gap-3">
              <Link
                to="/signup"
                className="px-6 py-3 text-white rounded-xl text-sm transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
              >
                {t.home.ctaSignup}
              </Link>
              <Link
                to="/login"
                className="px-6 py-3 text-blue-600 rounded-xl text-sm border border-blue-200 hover:bg-blue-50 transition-colors"
              >
                {t.home.ctaLogin}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}>
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <span className="text-white" style={{ fontWeight: 700 }}>ChikaiMise</span>
              </div>
              <p className="text-sm leading-relaxed">{t.home.footerDesc}</p>
            </div>
            <div>
              <h4 className="text-white text-sm mb-4">{t.home.footerMenu}</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/search" className="hover:text-white transition-colors">{t.home.footerSearch}</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">{t.home.footerLogin}</Link></li>
                <li><Link to="/signup" className="hover:text-white transition-colors">{t.home.footerSignup}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white text-sm mb-4">{t.home.footerContact}</h4>
              <p className="text-sm">support@chikaimise.vn</p>
              <p className="text-sm mt-1">{t.home.footerCity}</p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 text-center text-xs">
            <p>© 2026 ChikaiMise. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
