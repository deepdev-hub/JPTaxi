import React, { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Search, MapPin, Clock, Star, ChevronRight, Sparkles, Navigation } from "lucide-react";
import { divIcon, type LatLngBoundsExpression } from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getRestaurants } from "../api/client";
import { RestaurantCard } from "../components/RestaurantCard";
import { useAuth } from "../context/AuthContext";
import { useApiData } from "../hooks/useApiData";
import { useLanguage } from "../context/LanguageContext";
import type { Restaurant } from "../types";
import { calculateDistance } from "../utils/distance";

const HANOI_CENTER: [number, number] = [21.033, 105.848];

function restaurantMarkerIcon(isSelected: boolean) {
  return divIcon({
    className: "restaurant-map-marker-shell",
    html: `<span class="restaurant-map-marker${isSelected ? " restaurant-map-marker--selected" : ""}"><span></span></span>`,
    iconSize: isSelected ? [42, 52] : [34, 44],
    iconAnchor: isSelected ? [21, 52] : [17, 44],
    popupAnchor: [0, -44],
  });
}

function userMarkerIcon() {
  return divIcon({
    className: "user-map-marker-shell",
    html: `<span class="user-map-marker"></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

function MapAutoFit({ restaurants }: { restaurants: Restaurant[] }) {
  const map = useMap();

  React.useEffect(() => {
    if (restaurants.length === 1) {
      map.setView([Number(restaurants[0].lat), Number(restaurants[0].lng)], 15, { animate: true });
      return;
    }

    if (restaurants.length > 1) {
      const bounds = restaurants.map((restaurant) => [
        Number(restaurant.lat),
        Number(restaurant.lng),
      ]) as LatLngBoundsExpression;
      map.fitBounds(bounds, { padding: [44, 44], maxZoom: 15 });
      return;
    }

    map.setView(HANOI_CENTER, 13, { animate: true });
  }, [map, restaurants]);

  return null;
}

export function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isLoggedIn, userLocation } = useAuth();
  const { t } = useLanguage();
  const { data: rawRestaurants } = useApiData(getRestaurants, [], []);

  const restaurants = React.useMemo(() => {
    if (!userLocation) return rawRestaurants;
    return rawRestaurants.map((r) => ({
      ...r,
      distance: calculateDistance(userLocation.lat, userLocation.lng, r.lat, r.lng)
    }));
  }, [rawRestaurants, userLocation]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const handleQuickFilter = (filter: string) => {
    setActiveFilter(filter);
    navigate(`/search?filter=${filter}`);
  };

  const featuredRestaurants = restaurants.filter((r) => r.rating >= 4.5).slice(0, 3);
  const nearbyRestaurants = [...restaurants].sort((a, b) => (a.distance || 0) - (b.distance || 0)).slice(0, 3);

  const restaurantsWithCoords = React.useMemo(
    () =>
      restaurants.filter((restaurant) => {
        const lat = Number(restaurant.lat);
        const lng = Number(restaurant.lng);
        return Number.isFinite(lat) && Number.isFinite(lng);
      }),
    [restaurants]
  );

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
              {/* Map */}
              <div className="relative h-64 bg-gray-100 z-0">
                <MapContainer
                  center={HANOI_CENTER}
                  zoom={13}
                  scrollWheelZoom={false}
                  className="h-full w-full z-0"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapAutoFit restaurants={restaurantsWithCoords.slice(0, 4)} />

                  {userLocation && (
                    <Marker
                      position={[userLocation.lat, userLocation.lng]}
                      icon={userMarkerIcon()}
                    >
                      <Popup minWidth={100} closeButton={false}>
                        <div className="text-sm font-semibold text-center text-blue-600">Vị trí của bạn</div>
                      </Popup>
                    </Marker>
                  )}

                  {restaurantsWithCoords.slice(0, 4).map((restaurant) => {
                    return (
                      <Marker
                        key={restaurant.id}
                        position={[Number(restaurant.lat), Number(restaurant.lng)]}
                        icon={restaurantMarkerIcon(false)}
                        eventHandlers={{
                          click: () => navigate(`/restaurant/${restaurant.id}`),
                        }}
                      />
                    );
                  })}
                </MapContainer>

                <Link
                  to="/search"
                  className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-2 bg-white rounded-xl shadow-md text-sm text-blue-600 hover:bg-blue-50 transition-colors z-[400]"
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
