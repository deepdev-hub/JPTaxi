import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router";
import { Search, SlidersHorizontal, Star, X, Navigation } from "lucide-react";
import { divIcon, type LatLngBoundsExpression } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getFoodTags, getRestaurants } from "../api/client";
import { RestaurantCard } from "../components/RestaurantCard";
import { StarRating } from "../components/StarRating";
import { useApiData } from "../hooks/useApiData";
import { useLanguage } from "../context/LanguageContext";
import type { Restaurant } from "../types";

const HANOI_CENTER: [number, number] = [21.033, 105.848];
const RESTAURANT_PLACEHOLDER =
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=240&fit=crop";

function restaurantMarkerIcon(isSelected: boolean) {
  return divIcon({
    className: "restaurant-map-marker-shell",
    html: `<span class="restaurant-map-marker${isSelected ? " restaurant-map-marker--selected" : ""}"><span></span></span>`,
    iconSize: isSelected ? [42, 52] : [34, 44],
    iconAnchor: isSelected ? [21, 52] : [17, 44],
    popupAnchor: [0, -44],
  });
}

function MapAutoFit({
  restaurants,
  selectedRestaurantId,
}: {
  restaurants: Restaurant[];
  selectedRestaurantId: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    const selectedRestaurant = restaurants.find((restaurant) => restaurant.id === selectedRestaurantId);

    if (selectedRestaurant) {
      map.setView([Number(selectedRestaurant.lat), Number(selectedRestaurant.lng)], 16, { animate: true });
      return;
    }

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
  }, [map, restaurants, selectedRestaurantId]);

  return null;
}

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
  const [viewMode, setViewMode] = useState<"list" | "map">("map");
  const {
    data: restaurants,
    loading: loadingRestaurants,
    error: restaurantError,
  } = useApiData(getRestaurants, [], []);
  const { data: foodTags } = useApiData(getFoodTags, [], []);

  const filteredRestaurants = useMemo(() => {
    let results = [...restaurants];

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
  }, [restaurants, searchQuery, selectedTags, openOnly, selectedPriceRange, selectedDistance, minRating, filterParam]);

  const restaurantsWithCoords = useMemo(
    () =>
      filteredRestaurants.filter((restaurant) => {
        const lat = Number(restaurant.lat);
        const lng = Number(restaurant.lng);
        return Number.isFinite(lat) && Number.isFinite(lng);
      }),
    [filteredRestaurants]
  );

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
            {loadingRestaurants ? (
              <div className="text-center py-16">
                <p className="text-sm text-gray-400">Đang tải nhà hàng...</p>
              </div>
            ) : restaurantError ? (
              <div className="text-center py-16">
                <h3 className="text-gray-900 mb-2">Không thể tải danh sách nhà hàng</h3>
                <p className="text-sm text-gray-400">{restaurantError}</p>
              </div>
            ) : filteredRestaurants.length === 0 ? (
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
              <div className="w-full h-full bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm relative">
                {loadingRestaurants ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white">
                    <p className="text-sm text-gray-400">Đang tải bản đồ...</p>
                  </div>
                ) : restaurantError ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white p-6 text-center">
                    <div>
                      <h3 className="text-gray-900 mb-2">Không thể tải bản đồ nhà hàng</h3>
                      <p className="text-sm text-gray-400">{restaurantError}</p>
                    </div>
                  </div>
                ) : (
                  <MapContainer
                    center={HANOI_CENTER}
                    zoom={13}
                    scrollWheelZoom
                    className="h-full w-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapAutoFit restaurants={restaurantsWithCoords} selectedRestaurantId={selectedRestaurant} />

                    {restaurantsWithCoords.map((restaurant) => {
                      const isSelected = selectedRestaurant === restaurant.id;
                      const rating = Number(restaurant.rating);

                      return (
                        <Marker
                          key={restaurant.id}
                          position={[Number(restaurant.lat), Number(restaurant.lng)]}
                          icon={restaurantMarkerIcon(isSelected)}
                          eventHandlers={{
                            click: () => setSelectedRestaurant(restaurant.id),
                          }}
                        >
                          <Popup minWidth={240} closeButton={false}>
                            <div className="restaurant-map-popup">
                              <img
                                src={restaurant.coverImage || RESTAURANT_PLACEHOLDER}
                                alt={restaurant.nameVn}
                                onError={(event) => {
                                  event.currentTarget.src = RESTAURANT_PLACEHOLDER;
                                }}
                              />
                              <div className="restaurant-map-popup__body">
                                <p className="restaurant-map-popup__title">{restaurant.nameJp || restaurant.nameVn}</p>
                                <p className="restaurant-map-popup__address">{restaurant.address}</p>
                                <div className="restaurant-map-popup__footer">
                                  <span className="restaurant-map-popup__rating">
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                    {Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : "Chưa có đánh giá"}
                                  </span>
                                  <Link to={`/restaurant/${restaurant.id}`}>
                                    {t.search.detailLink}
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </MapContainer>
                )}

                <div className="absolute bottom-4 left-4 z-[500]">
                  <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl shadow-md text-xs text-gray-600 border border-gray-100">
                    <Navigation className="w-3.5 h-3.5 text-blue-500" />
                    {restaurantsWithCoords.length > 0
                      ? `${restaurantsWithCoords.length} marker`
                      : t.search.hanoiCenter}
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
