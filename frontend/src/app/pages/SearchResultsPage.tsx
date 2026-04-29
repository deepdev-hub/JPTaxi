import React, { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router";
import { Search, MapPin, SlidersHorizontal, Star, Clock, X, ChevronDown, Navigation } from "lucide-react";
import { mockRestaurants, Restaurant, foodTags } from "../data/mockData";
import { RestaurantCard } from "../components/RestaurantCard";
import { StarRating } from "../components/StarRating";
import { useLanguage } from "../context/LanguageContext";

export function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const query = searchParams.get("q") || "";
  const filterParam = searchParams.get("filter") || "";
  const tagParam = searchParams.get("tag") || "";

  const priceRanges = [
    { label: t.search.priceRanges[0].label, max: 50000 },
    { label: t.search.priceRanges[1].label, max: 100000, min: 50000 },
    { label: t.search.priceRanges[2].label, max: 200000, min: 100000 },
    { label: t.search.priceRanges[3].label, min: 200000 },
  ];

  const distanceRanges = [
    { label: t.search.distanceRanges[0].label, max: 0.5 },
    { label: t.search.distanceRanges[1].label, max: 1 },
    { label: t.search.distanceRanges[2].label, max: 2 },
    { label: t.search.distanceRanges[3].label, max: 5 },
  ];

  const [searchQuery, setSearchQuery] = useState(query);
  const [selectedTags, setSelectedTags] = useState<string[]>(tagParam ? [tagParam] : []);
  const [selectedPriceRange, setSelectedPriceRange] = useState<number | null>(null);
  const [selectedDistance, setSelectedDistance] = useState<number | null>(null);
  const [openOnly, setOpenOnly] = useState(filterParam === "open");
  const [minRating, setMinRating] = useState(0);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  const filteredRestaurants = useMemo(() => {
    let results = [...mockRestaurants];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (r) =>
          r.nameVn.toLowerCase().includes(q) ||
          r.nameJp.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q)) ||
          r.description.toLowerCase().includes(q) ||
          r.menu.some((m) => m.nameVn.toLowerCase().includes(q) || m.nameJp.includes(q))
      );
    }

    if (selectedTags.length > 0) {
      results = results.filter((r) => selectedTags.some((tag) => r.tags.includes(tag)));
    }

    if (openOnly) {
      results = results.filter((r) => r.status === "open");
    }

    if (selectedPriceRange !== null) {
      const range = priceRanges[selectedPriceRange];
      results = results.filter((r) => {
        if (range.min && r.avgPrice < range.min) return false;
        if (range.max && r.avgPrice > range.max) return false;
        return true;
      });
    }

    if (selectedDistance !== null) {
      const range = distanceRanges[selectedDistance];
      results = results.filter((r) => (r.distance || 0) <= range.max);
    }

    if (minRating > 0) {
      results = results.filter((r) => r.rating >= minRating);
    }

    if (filterParam === "near") {
      results.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    if (filterParam === "cheap") {
      results.sort((a, b) => a.avgPrice - b.avgPrice);
    }

    return results;
  }, [searchQuery, selectedTags, openOnly, selectedPriceRange, selectedDistance, minRating, filterParam]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSelectedPriceRange(null);
    setSelectedDistance(null);
    setOpenOnly(false);
    setMinRating(0);
  };

  const hasActiveFilters =
    selectedTags.length > 0 ||
    selectedPriceRange !== null ||
    selectedDistance !== null ||
    openOnly ||
    minRating > 0;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN").format(price) + "đ";

  const mapPositions = [
    { left: "20%", top: "30%" },
    { left: "45%", top: "50%" },
    { left: "65%", top: "25%" },
    { left: "30%", top: "65%" },
    { left: "75%", top: "60%" },
    { left: "55%", top: "75%" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-200 focus-within:border-blue-400 transition-colors">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.search.placeholder}
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")}>
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border transition-all ${
                hasActiveFilters
                  ? "border-blue-400 bg-blue-50 text-blue-600"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">{t.search.filter}</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              )}
            </button>

            {/* View toggle */}
            <div className="hidden md:flex rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-2 text-sm transition-colors ${
                  viewMode === "list" ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {t.search.list}
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`px-3 py-2 text-sm transition-colors ${
                  viewMode === "map" ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {t.search.map}
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Tags */}
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">{t.search.foodType}</label>
                  <div className="flex flex-wrap gap-1.5">
                    {foodTags.slice(0, 8).map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                          selectedTags.includes(tag)
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">{t.search.priceRange}</label>
                  <div className="space-y-1.5">
                    {priceRanges.map((range, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedPriceRange(selectedPriceRange === i ? null : i)}
                        className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                          selectedPriceRange === i
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Distance */}
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">{t.search.distance}</label>
                  <div className="space-y-1.5">
                    {distanceRanges.map((range, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedDistance(selectedDistance === i ? null : i)}
                        className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                          selectedDistance === i
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Other filters */}
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">{t.search.other}</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={openOnly}
                        onChange={(e) => setOpenOnly(e.target.checked)}
                        className="w-4 h-4 rounded accent-blue-600"
                      />
                      <span className="text-xs text-gray-600">{t.search.openOnly}</span>
                    </label>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">{t.search.minRating}</p>
                      <StarRating
                        rating={minRating}
                        interactive
                        onRatingChange={setMinRating}
                        size="sm"
                      />
                    </div>
                  </div>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="mt-3 text-xs text-red-500 hover:text-red-600 underline"
                    >
                      {t.search.clearFilters}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tag chips */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedTags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full"
                >
                  {tag}
                  <button onClick={() => toggleTag(tag)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results count */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <p className="text-sm text-gray-500">
          <span className="text-gray-900">{filteredRestaurants.length}</span>
          {" "}{t.search.results}
          {searchQuery && <span> — 「{searchQuery}」</span>}
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="flex gap-6">
          {/* Restaurant List */}
          <div className={`${viewMode === "map" ? "hidden md:block md:w-80 flex-shrink-0" : "flex-1"}`}>
            {filteredRestaurants.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🍜</div>
                <h3 className="text-gray-900 mb-2">{t.search.noResults}</h3>
                <p className="text-sm text-gray-400 mb-6">{t.search.noResultsDesc}</p>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors"
                >
                  {t.search.clearFilters}
                </button>
              </div>
            ) : viewMode === "map" ? (
              <div className="space-y-2">
                {filteredRestaurants.map((r) => (
                  <RestaurantCard
                    key={r.id}
                    restaurant={r}
                    compact
                    isSelected={selectedRestaurant === r.id}
                    onClick={() => setSelectedRestaurant(selectedRestaurant === r.id ? null : r.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredRestaurants.map((r) => (
                  <RestaurantCard key={r.id} restaurant={r} />
                ))}
              </div>
            )}
          </div>

          {/* Map View */}
          {viewMode === "map" && (
            <div className="flex-1 sticky top-32 h-[calc(100vh-180px)]">
              <div className="w-full h-full bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm relative">
                {/* Map background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50">
                  <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="grid2" width="50" height="50" patternUnits="userSpaceOnUse">
                        <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#3B82F6" strokeWidth="0.5"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid2)" />
                  </svg>
                  <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <line x1="15%" y1="0" x2="15%" y2="100%" stroke="#CBD5E1" strokeWidth="10" />
                    <line x1="40%" y1="0" x2="40%" y2="100%" stroke="#CBD5E1" strokeWidth="14" />
                    <line x1="70%" y1="0" x2="70%" y2="100%" stroke="#CBD5E1" strokeWidth="8" />
                    <line x1="85%" y1="0" x2="85%" y2="100%" stroke="#CBD5E1" strokeWidth="6" />
                    <line x1="0" y1="20%" x2="100%" y2="20%" stroke="#CBD5E1" strokeWidth="12" />
                    <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#CBD5E1" strokeWidth="10" />
                    <line x1="0" y1="80%" x2="100%" y2="80%" stroke="#CBD5E1" strokeWidth="8" />
                    <rect x="18%" y="5%" width="20%" height="13%" rx="4" fill="#E2E8F0" />
                    <rect x="43%" y="55%" width="25%" height="22%" rx="4" fill="#E2E8F0" />
                    <rect x="5%" y="55%" width="8%" height="22%" rx="4" fill="#E2E8F0" />
                    <rect x="72%" y="25%" width="12%" height="22%" rx="4" fill="#E2E8F0" />
                  </svg>
                </div>

                {/* Restaurant pins */}
                {filteredRestaurants.slice(0, 6).map((r, i) => {
                  const pos = mapPositions[i] || { left: `${20 + i * 10}%`, top: `${30 + i * 10}%` };
                  const isSelected = selectedRestaurant === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRestaurant(isSelected ? null : r.id)}
                      className="absolute -translate-x-1/2 -translate-y-full group z-10"
                      style={pos}
                    >
                      <div className={`relative transition-transform ${isSelected ? "scale-125" : "group-hover:scale-110"}`}>
                        <div
                          className={`rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs transition-all ${
                            isSelected ? "w-10 h-10" : "w-8 h-8"
                          }`}
                          style={{ background: isSelected ? "#004499" : "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
                        >
                          {i + 1}
                        </div>
                        <div className="absolute left-1/2 top-full -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-blue-700" />
                      </div>
                      {isSelected && (
                        <div className="absolute left-1/2 bottom-full mb-3 -translate-x-1/2 bg-white rounded-xl shadow-xl p-3 w-48 z-20">
                          <img src={r.coverImage} alt={r.nameVn} className="w-full h-24 object-cover rounded-lg mb-2" />
                          <p className="text-xs text-gray-900 truncate">{r.nameJp}</p>
                          <p className="text-[11px] text-gray-400 truncate">{r.address}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <div className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <span className="text-xs text-gray-600">{r.rating}</span>
                            </div>
                            <Link
                              to={`/restaurant/${r.id}`}
                              className="text-[11px] text-blue-600 hover:underline"
                            >
                              {t.search.detailLink}
                            </Link>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* Current location */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                  <div className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white shadow-md relative">
                    <div className="w-2 h-2 rounded-full bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="w-14 h-14 rounded-full bg-blue-300 opacity-20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-ping" />
                </div>

                {/* Map controls */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  <button className="w-8 h-8 bg-white rounded-lg shadow-md flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors border border-gray-100">
                    +
                  </button>
                  <button className="w-8 h-8 bg-white rounded-lg shadow-md flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors border border-gray-100">
                    −
                  </button>
                </div>

                <div className="absolute bottom-4 left-4">
                  <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl shadow-md text-xs text-gray-600 border border-gray-100">
                    <Navigation className="w-3.5 h-3.5 text-blue-500" />
                    {t.search.hanoiCenter}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}