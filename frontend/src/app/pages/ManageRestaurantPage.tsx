import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import {
  ChevronLeft, Save, Upload, Plus, X, CheckCircle, ToggleLeft, ToggleRight, AlertCircle
} from "lucide-react";
import { getFoodTags, getRestaurant, updateRestaurant, uploadMenuImage, uploadRestaurantImages } from "../api/client";
import type { MenuItem, Restaurant } from "../types";
import { useAuth } from "../context/AuthContext";
import { useApiData } from "../hooks/useApiData";
import { useLanguage } from "../context/LanguageContext";

const MAX_RESTAURANT_IMAGES = 8;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface SelectedRestaurantImage {
  file: File;
  previewUrl: string;
}

const menuItemKey = (item: MenuItem, index: number) => item.id || `menu-${index}`;

export function ManageRestaurantPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { language, t } = useLanguage();
  const { data: foodTags } = useApiData(getFoodTags, [], []);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    nameVn: "",
    nameJp: "",
    address: "",
    phone: "",
    description: "",
    descriptionJp: "",
    openHours: "",
    avgPrice: "",
    status: "closed" as "open" | "closed",
    selectedTags: [] as string[],
  });

  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"basic" | "menu" | "photos">("basic");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<SelectedRestaurantImage[]>([]);
  const [menuImageUploads, setMenuImageUploads] = useState<Record<string, SelectedRestaurantImage>>({});
  const [photosTouched, setPhotosTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedImagesRef = useRef<SelectedRestaurantImage[]>([]);
  const menuImageUploadsRef = useRef<Record<string, SelectedRestaurantImage>>({});

  useEffect(() => {
    selectedImagesRef.current = selectedImages;
  }, [selectedImages]);

  useEffect(() => {
    menuImageUploadsRef.current = menuImageUploads;
  }, [menuImageUploads]);

  useEffect(() => {
    return () => {
      selectedImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      Object.values(menuImageUploadsRef.current).forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, []);

  useEffect(() => {
    if (!id) return;

    let mounted = true;
    setLoading(true);

    getRestaurant(id)
      .then((data) => {
        if (!mounted) return;
        setRestaurant(data);
        setFormData({
          nameVn: data.nameVn,
          nameJp: data.nameJp,
          address: data.address,
          phone: data.phone,
          description: data.description,
          descriptionJp: data.descriptionJp || "",
          openHours: data.openHours,
          avgPrice: data.avgPrice.toString(),
          status: data.status === "open" ? "open" : "closed",
          selectedTags: data.tags,
        });
        setMenuItems(data.menu);
        setImages(data.images);
        setSelectedImages((prev) => {
          prev.forEach((image) => URL.revokeObjectURL(image.previewUrl));
          return [];
        });
        setMenuImageUploads((prev) => {
          Object.values(prev).forEach((image) => URL.revokeObjectURL(image.previewUrl));
          return {};
        });
        setPhotosTouched(false);
        setErrors({});
      })
      .catch(() => {
        if (mounted) setRestaurant(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  if (!isLoggedIn) {
    navigate("/login");
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Link to="/owner/restaurants" className="text-blue-600 hover:underline">
          {t.manageStore.notFound}
        </Link>
      </div>
    );
  }

  const primaryName = language === "vi" ? restaurant.nameVn : restaurant.nameJp;
  const secondaryName = language === "vi" ? restaurant.nameJp : restaurant.nameVn;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || saving) return;

    try {
      setSaving(true);
      setErrors((prev) => ({ ...prev, submit: "" }));

      let nextImages = images;
      if (selectedImages.length > 0) {
        const uploadedImageUrls = await uploadRestaurantImages(
          selectedImages.map((image) => image.file)
        );
        nextImages = [...images, ...uploadedImageUrls];
        setImages(nextImages);
        setSelectedImages((prev) => {
          prev.forEach((image) => URL.revokeObjectURL(image.previewUrl));
          return [];
        });
      }

      let nextMenuItems = menuItems;
      const menuUploadEntries = Object.entries(menuImageUploads);
      if (menuUploadEntries.length > 0) {
        const uploadedMenuImageUrls = await Promise.all(
          menuUploadEntries.map(([, image]) =>
            uploadMenuImage(image.file).then(({ url }) => url)
          )
        );
        const uploadedImageByKey = new Map(
          menuUploadEntries.map(([key], index) => [key, uploadedMenuImageUrls[index]])
        );

        nextMenuItems = menuItems.map((item, index) => {
          const uploadedImage = uploadedImageByKey.get(menuItemKey(item, index));
          return uploadedImage ? { ...item, image: uploadedImage } : item;
        });
        setMenuItems(nextMenuItems);
        setMenuImageUploads((prev) => {
          Object.values(prev).forEach((image) => URL.revokeObjectURL(image.previewUrl));
          return {};
        });
      }

      const savedRestaurant = await updateRestaurant(restaurant.id, {
        ownerId: restaurant.ownerId,
        nameVn: formData.nameVn,
        nameJp: formData.nameJp,
        address: formData.address,
        addressJp: restaurant.addressJp,
        phone: formData.phone,
        description: formData.description,
        descriptionJp: formData.descriptionJp,
        coverImage: nextImages[0] || (photosTouched ? "" : restaurant.coverImage),
        images: nextImages,
        menu: nextMenuItems.filter((item) => item.nameVn.trim()),
        openHours: formData.openHours,
        priceRange: restaurant.priceRange,
        avgPrice: Number(formData.avgPrice) || 0,
        tags: formData.selectedTags,
        status: formData.status,
        lat: restaurant.lat,
        lng: restaurant.lng,
      });

      setRestaurant(savedRestaurant);
      setMenuItems(savedRestaurant.menu);
      setImages(savedRestaurant.images);
      setPhotosTouched(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      const message = err instanceof Error && err.message
        ? err.message
        : t.manageStore.submitError;
      setErrors((prev) => ({ ...prev, submit: message }));
    } finally {
      setSaving(false);
    }
  };

  const updateMenuItem = (index: number, field: keyof MenuItem, value: string) => {
    setMenuItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: field === "price" ? Number(value) || 0 : value,
            }
          : item
      )
    );
  };

  const addMenuItem = () => {
    setMenuItems((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, nameVn: "", nameJp: "", price: 0, description: "" },
    ]);
  };

  const removeMenuItem = (index: number) => {
    const item = menuItems[index];
    if (item) {
      const key = menuItemKey(item, index);
      setMenuImageUploads((prev) => {
        const next = { ...prev };
        if (next[key]) URL.revokeObjectURL(next[key].previewUrl);
        delete next[key];
        return next;
      });
    }
    setMenuItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) return;

    if (images.length + selectedImages.length + files.length > MAX_RESTAURANT_IMAGES) {
      setErrors((prev) => ({ ...prev, images: t.manageStore.errorImageCount }));
      return;
    }

    const nextImages: SelectedRestaurantImage[] = [];

    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setErrors((prev) => ({ ...prev, images: t.manageStore.errorImageType }));
        nextImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
        return;
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setErrors((prev) => ({ ...prev, images: t.manageStore.errorImageSize }));
        nextImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
        return;
      }

      nextImages.push({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    setSelectedImages((prev) => [...prev, ...nextImages]);
    setPhotosTouched(true);
    setErrors((prev) => ({ ...prev, images: "", submit: "" }));
  };

  const removeSelectedImage = (index: number) => {
    setSelectedImages((prev) => {
      const removedImage = prev[index];
      if (removedImage) URL.revokeObjectURL(removedImage.previewUrl);
      return prev.filter((_, currentIndex) => currentIndex !== index);
    });
    setPhotosTouched(true);
    setErrors((prev) => ({ ...prev, images: "" }));
  };

  const handleMenuImageSelect = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setErrors((prev) => ({ ...prev, menuImages: t.manageStore.errorImageType, submit: "" }));
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setErrors((prev) => ({ ...prev, menuImages: t.manageStore.errorImageSize, submit: "" }));
      return;
    }

    const item = menuItems[index];
    if (!item) return;

    const key = menuItemKey(item, index);
    setMenuImageUploads((prev) => {
      const previousUpload = prev[key];
      if (previousUpload) URL.revokeObjectURL(previousUpload.previewUrl);
      return {
        ...prev,
        [key]: {
          file,
          previewUrl: URL.createObjectURL(file),
        },
      };
    });
    setErrors((prev) => ({ ...prev, menuImages: "", submit: "" }));
  };

  const removeMenuImage = (index: number) => {
    const item = menuItems[index];
    if (!item) return;

    const key = menuItemKey(item, index);
    setMenuImageUploads((prev) => {
      const next = { ...prev };
      if (next[key]) URL.revokeObjectURL(next[key].previewUrl);
      delete next[key];
      return next;
    });
    setMenuItems((prev) =>
      prev.map((currentItem, currentIndex) =>
        currentIndex === index ? { ...currentItem, image: undefined } : currentItem
      )
    );
    setErrors((prev) => ({ ...prev, menuImages: "" }));
  };

  const toggleTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter((t) => t !== tag)
        : [...prev.selectedTags, tag],
    }));
  };

  const toggleStatus = () => {
    setFormData((prev) => ({
      ...prev,
      status: prev.status === "open" ? "closed" : "open",
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              <ChevronLeft className="w-4 h-4" />
              {t.manageStore.back}
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-700 truncate">{primaryName}</span>
          </div>
          <Link
            to={`/restaurant/${restaurant.id}`}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {t.manageStore.publicPage}
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Restaurant header */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <div className="relative h-32">
            <img
              src={restaurant.coverImage}
              alt={restaurant.nameVn}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
              <div>
                <h2 className="text-white">{primaryName}</h2>
                <p className="text-white/70 text-xs">{secondaryName}</p>
              </div>
              <button
                type="button"
                onClick={toggleStatus}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm transition-all ${
                  formData.status === "open"
                    ? "bg-green-500 text-white"
                    : "bg-gray-500 text-white"
                }`}
              >
                {formData.status === "open" ? (
                  <ToggleRight className="w-4 h-4" />
                ) : (
                  <ToggleLeft className="w-4 h-4" />
                )}
                {formData.status === "open" ? t.manageStore.open : t.manageStore.closed}
              </button>
            </div>
          </div>
        </div>

        {/* Saved notification */}
        {saved && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
            <CheckCircle className="w-4 h-4" />
            {t.manageStore.saved}
          </div>
        )}

        {errors.submit && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {errors.submit}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(["basic", "menu", "photos"] as const).map((tab) => {
            const labels = t.manageStore.tabs;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-sm transition-all ${
                  activeTab === tab
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-blue-200"
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSave}>
          {/* Basic Info */}
          {activeTab === "basic" && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">{t.manageStore.nameVn}</label>
                  <input
                    type="text"
                    value={formData.nameVn}
                    onChange={(e) => setFormData({ ...formData, nameVn: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">{t.manageStore.nameJp}</label>
                  <input
                    type="text"
                    value={formData.nameJp}
                    onChange={(e) => setFormData({ ...formData, nameJp: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1.5">{t.manageStore.address}</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1.5">{t.manageStore.phone}</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">{t.manageStore.openHours}</label>
                  <input
                    type="text"
                    value={formData.openHours}
                    onChange={(e) => setFormData({ ...formData, openHours: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">{t.manageStore.avgPrice}</label>
                  <input
                    type="number"
                    value={formData.avgPrice}
                    onChange={(e) => setFormData({ ...formData, avgPrice: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1.5">{t.manageStore.descVn}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1.5">{t.manageStore.descJp}</label>
                <textarea
                  value={formData.descriptionJp}
                  onChange={(e) => setFormData({ ...formData, descriptionJp: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 text-white rounded-xl text-sm transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
              >
                <Save className="w-4 h-4" />
                {t.manageStore.saveChanges}
              </button>
            </div>
          )}

          {/* Menu */}
          {activeTab === "menu" && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-gray-900">{t.manageStore.menuTitle}</h3>
                <button
                  type="button"
                  onClick={addMenuItem}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4" />
                  {t.manageStore.add}
                </button>
              </div>
              <div className="space-y-3">
                {menuItems.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="flex flex-col sm:flex-row items-start gap-3 p-4 bg-gray-50 rounded-xl">
                    <div className="w-full sm:w-28 flex-shrink-0">
                      {(() => {
                        const pendingImage = menuImageUploads[menuItemKey(item, index)]?.previewUrl;
                        const imageUrl = pendingImage || item.image;

                        return imageUrl ? (
                          <div>
                            <div className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-white">
                              <img src={imageUrl} alt={item.nameVn || t.manageStore.dishImage} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removeMenuImage(index)}
                                className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                              >
                                <X className="w-3 h-3 text-white" />
                              </button>
                            </div>
                            <label className="mt-2 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 cursor-pointer">
                              <Upload className="w-3 h-3" />
                              {t.manageStore.changePhoto}
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                                onChange={(event) => handleMenuImageSelect(index, event)}
                                className="hidden"
                              />
                            </label>
                          </div>
                        ) : (
                          <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 bg-white flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-blue-300 hover:text-blue-400 cursor-pointer transition-colors">
                            <Upload className="w-5 h-5" />
                            <span className="text-xs text-center">{t.manageStore.addDishImage}</span>
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                              onChange={(event) => handleMenuImageSelect(index, event)}
                              className="hidden"
                            />
                          </label>
                        );
                      })()}
                    </div>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                      <input
                        type="text"
                        value={item.nameVn}
                        onChange={(e) => updateMenuItem(index, "nameVn", e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 bg-white"
                        placeholder={t.manageStore.dishNameVn}
                      />
                      <input
                        type="text"
                        value={item.nameJp}
                        onChange={(e) => updateMenuItem(index, "nameJp", e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 bg-white"
                        placeholder={t.manageStore.dishNameJp}
                      />
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateMenuItem(index, "price", e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 bg-white"
                        placeholder={t.manageStore.price}
                      />
                      <input
                        type="text"
                        value={item.description || ""}
                        onChange={(e) => updateMenuItem(index, "description", e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 bg-white"
                        placeholder={t.manageStore.description}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMenuItem(index)}
                      className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-100 flex-shrink-0 mt-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              {errors.menuImages && (
                <p className="text-xs text-red-500 mt-3 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.menuImages}
                </p>
              )}
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 mt-5 text-white rounded-xl text-sm transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
              >
                <Save className="w-4 h-4" />
                {t.manageStore.saveMenu}
              </button>
            </div>
          )}

          {/* Photos & Tags */}
          {activeTab === "photos" && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-gray-900 mb-4">{t.manageStore.photoTitle}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {images.map((img, i) => (
                    <div key={`${img}-${i}`} className="aspect-video rounded-xl overflow-hidden relative group">
                      <img src={img} alt={`${primaryName} ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setImages(images.filter((_, index) => index !== i));
                          setPhotosTouched(true);
                        }}
                        className="absolute top-2 right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}
                  {selectedImages.map((image, i) => (
                    <div key={image.previewUrl} className="aspect-video rounded-xl overflow-hidden relative group">
                      <img src={image.previewUrl} alt={image.file.name} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeSelectedImage(i)}
                        className="absolute top-2 right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}
                  {images.length + selectedImages.length < MAX_RESTAURANT_IMAGES && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-video rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-blue-300 hover:text-blue-400 transition-colors"
                    >
                      <Upload className="w-6 h-6" />
                      <span className="text-xs">{t.manageStore.addPhoto}</span>
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                {errors.images && (
                  <p className="text-xs text-red-500 mt-3 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.images}
                  </p>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-gray-900 mb-4">{t.manageStore.tagTitle}</h3>
                <div className="flex flex-wrap gap-2">
                  {foodTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-sm px-3 py-1.5 rounded-full border transition-all ${
                        formData.selectedTags.includes(tag)
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 text-white rounded-xl text-sm transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
              >
                <Save className="w-4 h-4" />
                {t.manageStore.savePhotos}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
