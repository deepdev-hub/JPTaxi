import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import {
  MapPin, Clock, Phone, MessageCircle, Star, ThumbsUp, ThumbsDown,
  Share2, QrCode, ChevronLeft, ExternalLink, Camera, ArrowRight
} from "lucide-react";
import { mockRestaurants, mockReviews, Review } from "../data/mockData";
import { StarRating } from "../components/StarRating";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

type TabType = "info" | "reviews";

export function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLoggedIn, currentUser } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>("info");
  const [showQR, setShowQR] = useState(false);
  const [reviews, setReviews] = useState<Review[]>(
    mockReviews.filter((r) => r.restaurantId === id)
  );
  const [copied, setCopied] = useState(false);

  const restaurant = mockRestaurants.find((r) => r.id === id);

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🍜</div>
          <h2 className="text-gray-900">{t.detail.back}</h2>
          <Link to="/search" className="mt-4 inline-block text-blue-600 hover:underline">
            {t.detail.back}
          </Link>
        </div>
      </div>
    );
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN").format(price) + "đ";

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : restaurant.rating;

  const handleLike = (reviewId: string) => {
    if (!isLoggedIn) { navigate("/login"); return; }
    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? r.userLiked
            ? { ...r, likes: r.likes - 1, userLiked: false }
            : { ...r, likes: r.likes + 1, userLiked: true, userDisliked: false, dislikes: r.userDisliked ? r.dislikes - 1 : r.dislikes }
          : r
      )
    );
  };

  const handleDislike = (reviewId: string) => {
    if (!isLoggedIn) { navigate("/login"); return; }
    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? r.userDisliked
            ? { ...r, dislikes: r.dislikes - 1, userDisliked: false }
            : { ...r, dislikes: r.dislikes + 1, userDisliked: true, userLiked: false, likes: r.userLiked ? r.likes - 1 : r.likes }
          : r
      )
    );
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareUrl = `${window.location.origin}/restaurant/${id}`;

  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
    percentage: reviews.length > 0
      ? (reviews.filter((r) => Math.round(r.rating) === star).length / reviews.length) * 100
      : 0,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back button */}
      <div className="sticky top-16 z-20 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {t.detail.back}
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-700 truncate">{restaurant.nameJp}</span>
        </div>
      </div>

      {/* Cover Image */}
      <div className="relative h-72 sm:h-96 overflow-hidden">
        <img
          src={restaurant.coverImage}
          alt={restaurant.nameVn}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-6 left-0 right-0 px-4 sm:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl text-white" style={{ fontWeight: 700 }}>
                  {restaurant.nameJp}
                </h1>
                <p className="text-white/80 text-sm mt-1">{restaurant.nameVn}</p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="text-white text-sm">{avgRating.toFixed(1)}</span>
                    <span className="text-white/60 text-sm">({reviews.length}{t.detail.reviews})</span>
                  </div>
                  <span
                    className={`text-sm px-3 py-1 rounded-full ${
                      restaurant.status === "open"
                        ? "bg-green-500 text-white"
                        : "bg-gray-500 text-white"
                    }`}
                  >
                    {restaurant.status === "open" ? t.detail.open : t.detail.closed}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowQR(!showQR)}
                  className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                >
                  <QrCode className="w-5 h-5" />
                </button>
                <button
                  onClick={handleShare}
                  className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-gray-900 text-center mb-4">{t.detail.qrTitle}</h3>
            {/* QR Code placeholder */}
            <div className="flex justify-center mb-4">
              <div className="w-48 h-48 border-2 border-gray-200 rounded-xl flex items-center justify-center bg-gray-50 relative overflow-hidden">
                <svg viewBox="0 0 200 200" className="w-40 h-40">
                  {/* QR code placeholder pattern */}
                  {Array.from({ length: 10 }).map((_, row) =>
                    Array.from({ length: 10 }).map((_, col) => {
                      const isCorner =
                        (row < 3 && col < 3) ||
                        (row < 3 && col > 6) ||
                        (row > 6 && col < 3);
                      const filled = isCorner || Math.random() > 0.5;
                      return filled ? (
                        <rect
                          key={`${row}-${col}`}
                          x={col * 20}
                          y={row * 20}
                          width={18}
                          height={18}
                          fill="#1a1a1a"
                          rx={1}
                        />
                      ) : null;
                    })
                  )}
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl mb-3">
              <span className="text-xs text-gray-500 flex-1 truncate">{shareUrl}</span>
              <button
                onClick={handleShare}
                className="text-xs text-blue-600 hover:text-blue-700 flex-shrink-0"
              >
                {copied ? t.detail.copied : t.detail.copy}
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center">
              {t.detail.qrScanDesc}
            </p>
            <button
              onClick={() => setShowQR(false)}
              className="mt-4 w-full py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              {t.detail.close}
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(restaurant.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-white rounded-xl transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
            >
              <MapPin className="w-4 h-4" />
              {t.detail.directions}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {isLoggedIn ? (
              <Link
                to="/chat"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                {t.detail.askOwner}
              </Link>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                {t.detail.askOwnerLogin}
              </Link>
            )}

            {isLoggedIn && currentUser?.role === "diner" && (
              <Link
                to={`/review/${id}`}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-amber-600 border border-amber-200 rounded-xl hover:bg-amber-50 transition-colors ml-auto"
              >
                <Star className="w-4 h-4" />
                {t.detail.writeReview}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 sticky top-[8.5rem] z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6">
            {(["info", "reviews"] as const).map((tab) => {
              const labels = {
                info: t.detail.tabInfo,
                reviews: `${t.detail.tabReviews} (${reviews.length})`,
              };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 text-sm border-b-2 transition-all ${
                    activeTab === tab
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Tab */}
        {activeTab === "info" && (
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h3 className="text-gray-900 mb-4">{t.detail.aboutTitle}</h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  {restaurant.descriptionJp}
                </p>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {restaurant.description}
                </p>
              </div>

              {/* Image Gallery */}
              {restaurant.images.length > 0 && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                  <h3 className="text-gray-900 mb-4 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-blue-400" />
                    {t.detail.galleryTitle}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {restaurant.images.map((img, i) => (
                      <div key={i} className="aspect-video rounded-xl overflow-hidden">
                        <img src={img} alt={`${restaurant.nameVn} ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Menu Section */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h3 className="text-gray-900 mb-4">{t.detail.menuTitle}</h3>
                <div className="space-y-3">
                  {restaurant.menu.map((item) => (
                    <div key={item.id} className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="text-gray-900">{item.nameJp}</h4>
                          <p className="text-sm text-gray-500 mt-0.5">{item.nameVn}</p>
                          {item.description && (
                            <p className="text-xs text-gray-400 mt-2 leading-relaxed">{item.description}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-blue-600">{formatPrice(item.price)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar Info */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <h4 className="text-gray-900 mb-4">{t.detail.basicInfo}</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-700">{restaurant.addressJp}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{restaurant.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{restaurant.openHours}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{restaurant.phone}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <h4 className="text-gray-900 mb-3">{t.detail.priceRange}</h4>
                <p className="text-sm text-gray-600">{restaurant.priceRange}</p>
                <p className="text-sm text-blue-600 mt-1">{t.detail.avgPrice} {formatPrice(restaurant.avgPrice)}{t.detail.perPerson}</p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <h4 className="text-gray-900 mb-3">{t.detail.foodTags}</h4>
                <div className="flex flex-wrap gap-1.5">
                  {restaurant.tags.map((tag) => (
                    <Link
                      key={tag}
                      to={`/search?tag=${encodeURIComponent(tag)}`}
                      className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🇯🇵</span>
                  <h4 className="text-blue-800">{t.detail.japaneseSupport}</h4>
                </div>
                <p className="text-sm text-blue-700">{t.detail.japaneseSupportDesc}</p>
              </div>
            </div>
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === "reviews" && (
          <div className="space-y-6">
            {/* Rating summary */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="text-center flex-shrink-0">
                  <div className="text-5xl text-gray-900" style={{ fontWeight: 800 }}>
                    {avgRating.toFixed(1)}
                  </div>
                  <StarRating rating={avgRating} size="md" />
                  <p className="text-sm text-gray-400 mt-1">{reviews.length}{t.detail.reviews}</p>
                </div>
                <div className="flex-1 w-full space-y-2">
                  {ratingDistribution.map(({ star, count, percentage }) => (
                    <div key={star} className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 w-4">{star}</span>
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400 flex-shrink-0" />
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-400 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-400 w-6">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Write review CTA */}
            {isLoggedIn && currentUser?.role === "diner" && (
              <Link
                to={`/review/${id}`}
                className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl hover:bg-amber-100 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Star className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-amber-800">{t.detail.reviewsCta}</p>
                  <p className="text-xs text-amber-600">{t.detail.reviewsCtaDesc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-500" />
              </Link>
            )}

            {/* Review list */}
            {reviews.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-gray-500">{t.detail.noReviews}</p>
                <p className="text-sm text-gray-400 mt-1">{t.detail.noReviewsFirst}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-white rounded-2xl p-6 border border-gray-100">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                        {review.userAvatar ? (
                          <img src={review.userAvatar} alt={review.userName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-600">
                            {review.userName[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-gray-900">{review.userName}</p>
                          <p className="text-xs text-gray-400">{review.date}</p>
                        </div>
                        <StarRating rating={review.rating} size="sm" />
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>

                    {review.images && review.images.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {review.images.map((img, i) => (
                          <div key={i} className="w-20 h-20 rounded-lg overflow-hidden">
                            <img src={img} alt="review" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Like/Dislike */}
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-50">
                      <p className="text-xs text-gray-400 flex-1">{t.detail.helpfulQuestion}</p>
                      <button
                        onClick={() => handleLike(review.id)}
                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-all ${
                          review.userLiked
                            ? "bg-green-100 text-green-700"
                            : "text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span>{review.likes}</span>
                      </button>
                      <button
                        onClick={() => handleDislike(review.id)}
                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-all ${
                          review.userDisliked
                            ? "bg-red-100 text-red-600"
                            : "text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        <ThumbsDown className="w-4 h-4" />
                        <span>{review.dislikes}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}