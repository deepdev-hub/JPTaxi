import React from "react";
import { Link } from "react-router";
import { MapPin, Clock, Star, ChevronRight } from "lucide-react";
import type { Restaurant } from "../types";
import { StarRating } from "./StarRating";
import { useLanguage } from "../context/LanguageContext";

interface RestaurantCardProps {
  restaurant: Restaurant;
  compact?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}

export function RestaurantCard({ restaurant, compact = false, isSelected = false, onClick }: RestaurantCardProps) {
  const { t } = useLanguage();
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN").format(price) + "đ";

  const displayRating = restaurant.reviewCount > 0 ? restaurant.rating : 0;

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={`flex gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
          isSelected
            ? "border-blue-400 bg-blue-50"
            : "border-gray-100 bg-white hover:border-blue-200 hover:shadow-md"
        }`}
      >
        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
          <img
            src={restaurant.coverImage}
            alt={restaurant.nameVn}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <h3 className="text-sm text-gray-900 truncate">{restaurant.nameJp}</h3>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                restaurant.status === "open"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-600"
              }`}
            >
              {restaurant.status === "open" ? t.card.open : t.card.closed}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5 truncate">{restaurant.nameVn}</p>
          <div className="flex items-center gap-1 mt-1">
            <StarRating rating={displayRating} size="sm" />
            <span className="text-xs text-gray-500">{displayRating} ({restaurant.reviewCount})</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
              <MapPin className="w-3 h-3" />
              {restaurant.distance}km
            </span>
            <span className="text-[11px] text-blue-600">{formatPrice(restaurant.avgPrice)}{t.card.from}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link to={`/restaurant/${restaurant.id}`} className="group block">
      <div className={`bg-white rounded-2xl overflow-hidden border transition-all hover:shadow-lg ${
        isSelected ? "border-blue-400 shadow-md" : "border-gray-100"
      }`}>
        <div className="relative h-48 overflow-hidden">
          <img
            src={restaurant.coverImage}
            alt={restaurant.nameVn}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-3 left-3">
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                restaurant.status === "open"
                  ? "bg-green-500 text-white"
                  : "bg-gray-500 text-white"
              }`}
            >
              {restaurant.status === "open" ? `🟢 ${t.card.open}` : `🔴 ${t.card.closed}`}
            </span>
          </div>
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-sm text-gray-900">{displayRating}</span>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="mb-2">
            <h3 className="text-base text-gray-900 truncate">{restaurant.nameJp}</h3>
            <p className="text-sm text-gray-500 truncate">{restaurant.nameVn}</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              {restaurant.distance}km
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-green-400" />
              {restaurant.openHours}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {restaurant.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600"
                >
                  {tag}
                </span>
              ))}
            </div>
            <span className="text-sm text-blue-600">{formatPrice(restaurant.avgPrice)}{t.card.from}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
