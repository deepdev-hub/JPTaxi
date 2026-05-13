import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { ChevronLeft, Upload, X, AlertCircle, CheckCircle, Star } from "lucide-react";
import { createReview, getRestaurant } from "../api/client";
import type { Restaurant } from "../types";
import { StarRating } from "../components/StarRating";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_REVIEW_IMAGES = 3;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface SelectedReviewImage {
  file: File;
  previewUrl: string;
}

export function WriteReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLoggedIn, currentUser } = useAuth();
  const { t } = useLanguage();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loadingRestaurant, setLoadingRestaurant] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [selectedImages, setSelectedImages] = useState<SelectedReviewImage[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedImagesRef = useRef<SelectedReviewImage[]>([]);

  useEffect(() => {
    if (!id) return;

    let mounted = true;
    setLoadingRestaurant(true);

    getRestaurant(id)
      .then((data) => {
        if (mounted) setRestaurant(data);
      })
      .catch(() => {
        if (mounted) setRestaurant(null);
      })
      .finally(() => {
        if (mounted) setLoadingRestaurant(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    selectedImagesRef.current = selectedImages;
  }, [selectedImages]);

  useEffect(() => {
    return () => {
      selectedImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, []);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{t.review.loginRequired}</p>
          <Link to="/login" className="text-blue-600 hover:underline">{t.review.back}</Link>
        </div>
      </div>
    );
  }

  if (loadingRestaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">{t.review.notFound}</p>
          <Link to="/search" className="mt-2 inline-block text-blue-600 hover:underline">{t.review.backToSearch}</Link>
        </div>
      </div>
    );
  }

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (rating === 0) newErrors.rating = t.review.errorRating;
    if (!comment.trim()) newErrors.comment = t.review.errorComment;
    if (comment.trim().length < 20) newErrors.comment = t.review.errorCommentLength;
    if (errors.images) newErrors.images = errors.images;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !id || !currentUser || submitting) return;

    setSubmitting(true);
    try {
      await createReview({
        restaurantId: id,
        userId: currentUser.id,
        rating,
        comment,
        imageFiles: selectedImages.map((image) => image.file),
      });
      setSubmitted(true);
      setTimeout(() => { navigate(`/restaurant/${id}`); }, 2000);
    } catch (err) {
      const message = err instanceof Error && err.message
        ? err.message
        : t.review.submitError;
      setErrors((prev) => ({ ...prev, submit: message }));
    } finally {
      setSubmitting(false);
    }
  };

  const ratingColors = ["", "text-red-500", "text-orange-500", "text-yellow-500", "text-blue-500", "text-green-500"];

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) return;

    if (selectedImages.length + files.length > MAX_REVIEW_IMAGES) {
      setErrors((prev) => ({ ...prev, images: t.review.errorImageCount }));
      return;
    }

    const nextImages: SelectedReviewImage[] = [];

    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setErrors((prev) => ({ ...prev, images: t.review.errorImageType }));
        nextImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
        return;
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setErrors((prev) => ({ ...prev, images: t.review.errorImageSize }));
        nextImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
        return;
      }

      nextImages.push({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    setSelectedImages((prev) => [...prev, ...nextImages]);
    setErrors((prev) => ({ ...prev, images: "", submit: "" }));
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => {
      const removedImage = prev[index];
      if (removedImage) URL.revokeObjectURL(removedImage.previewUrl);
      return prev.filter((_, currentIndex) => currentIndex !== index);
    });
    setErrors((prev) => ({ ...prev, images: "" }));
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-gray-900 mb-2">{t.review.successTitle}</h2>
          <p className="text-sm text-gray-400">{t.review.successDesc}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 sticky top-16 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="w-4 h-4" />
            {t.review.back}
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-700">{t.review.title}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
            <img src={restaurant.coverImage} alt={restaurant.nameVn} className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="text-gray-900">{restaurant.nameJp}</h3>
            <p className="text-sm text-gray-400 mt-0.5">{restaurant.nameVn}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Star Rating */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-gray-900 mb-1">{t.review.ratingTitle}</h3>
            <p className="text-sm text-gray-400 mb-4">{t.review.ratingDesc}</p>
            <div className="flex flex-col items-center gap-3">
              <StarRating rating={rating} size="lg" interactive onRatingChange={setRating} />
              {rating > 0 && (
                <p className={`text-sm ${ratingColors[rating]}`}>{t.review.ratingLabels[rating]}</p>
              )}
            </div>
            {errors.rating && (
              <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.rating}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-gray-900">{t.review.commentTitle}</h3>
              <span className="text-xs text-gray-400">{comment.length}/500</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🇯🇵</span>
              <p className="text-sm text-gray-500">{t.review.commentJpNote}</p>
            </div>
            <textarea
              value={comment}
              onChange={(e) => {
                setComment(e.target.value.slice(0, 500));
                if (errors.comment) setErrors({ ...errors, comment: "" });
              }}
              placeholder={t.review.commentPlaceholder}
              rows={6}
              className={`w-full p-3 border rounded-xl text-sm resize-none focus:outline-none transition-colors ${
                errors.comment ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-blue-400"
              }`}
            />
            {errors.comment && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.comment}
              </p>
            )}
          </div>

          {/* Image Upload */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-gray-900 mb-1">{t.review.imageTitle}</h3>
            <p className="text-sm text-gray-400 mb-4">{t.review.imageDesc}</p>
            <div className="flex flex-wrap gap-3">
              {selectedImages.map((image, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden group">
                  <img src={image.previewUrl} alt={image.file.name} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              {selectedImages.length < MAX_REVIEW_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-blue-300 hover:text-blue-400 transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-[10px]">{t.review.addImage}</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
            {errors.images && (
              <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.images}
              </p>
            )}
          </div>

          {/* Tips */}
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <h4 className="text-blue-800 text-sm mb-2">{t.review.tipsTitle}</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              {t.review.tips.map((tip, i) => (
                <li key={i}>• {tip}</li>
              ))}
            </ul>
          </div>

          {errors.submit && (
            <p className="text-sm text-red-500 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {errors.submit}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3.5 text-white rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
          >
            <Star className="w-4 h-4" />
            {submitting ? t.review.submitting : t.review.submitBtn}
          </button>
        </form>
      </div>
    </div>
  );
}
