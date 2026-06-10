import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  Clock,
  DollarSign,
  MapPin,
  Plus,
  Search,
  Tag,
  Upload,
  X,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { createRestaurant, getFoodTags, uploadMenuImage, uploadRestaurantImages } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useApiData } from "../hooks/useApiData";
import { useLanguage } from "../context/LanguageContext";

const MAX_RESTAURANT_IMAGES = 8;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DEFAULT_LOCATION = { lat: 21.027764, lng: 105.83416 };

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface SelectedImage {
  file: File;
  previewUrl: string;
}

interface MenuItemForm {
  nameVn: string;
  nameJp: string;
  price: string;
  description: string;
  imageFile?: File;
  imagePreviewUrl?: string;
}

interface RestaurantFormData {
  nameVn: string;
  nameJp: string;
  address: string;
  phone: string;
  description: string;
  descriptionJp: string;
  openHours: string;
  avgPrice: string;
  selectedTags: string[];
}

interface LatLng {
  lat: number;
  lng: number;
}

interface NominatimSuggestion {
  lat: string;
  lon: string;
  display_name: string;
}

type TextFormField = Exclude<keyof RestaurantFormData, "selectedTags">;

const createEmptyMenuItem = (): MenuItemForm => ({
  nameVn: "",
  nameJp: "",
  price: "",
  description: "",
});

function RequiredMark() {
  return <span className="ml-0.5 text-red-500">*</span>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      {message}
    </p>
  );
}

function inputClass(hasError: boolean, extra = "") {
  return `${extra} border rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors ${
    hasError ? "border-red-300" : "border-gray-200"
  }`;
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function MapEvents({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onLocationSelect(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

function MapUpdater({ center }: { center: LatLng }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([center.lat, center.lng], map.getZoom());
  }, [center.lat, center.lng, map]);

  return null;
}

export function RegisterRestaurantPage() {
  const navigate = useNavigate();
  const { currentUser, isLoggedIn } = useAuth();
  const { data: foodTags } = useApiData(getFoodTags, [], []);
  const { t } = useLanguage();
  const restaurantImageInputRef = useRef<HTMLInputElement>(null);
  const restaurantImagesRef = useRef<SelectedImage[]>([]);
  const menuItemsRef = useRef<MenuItemForm[]>([]);

  const [formData, setFormData] = useState<RestaurantFormData>({
    nameVn: "",
    nameJp: "",
    address: "",
    phone: "",
    description: "",
    descriptionJp: "",
    openHours: "10:00 - 21:00",
    avgPrice: "",
    selectedTags: [],
  });
  const [menuItems, setMenuItems] = useState<MenuItemForm[]>([createEmptyMenuItem()]);
  const [restaurantImages, setRestaurantImages] = useState<SelectedImage[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [showMapModal, setShowMapModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<NominatimSuggestion[]>([]);
  const [mapCenter, setMapCenter] = useState<LatLng>(DEFAULT_LOCATION);
  const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const clearError = (...keys: string[]) => {
    setErrors((prev) => {
      const next = { ...prev };
      keys.forEach((key) => delete next[key]);
      delete next.submit;
      return next;
    });
  };

  const updateFormField = (field: TextFormField, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    clearError(field);
  };

  const updateNumericField = (field: "phone" | "avgPrice", value: string) => {
    updateFormField(field, digitsOnly(value));
  };

  const handleSearchAddress = async (query: string) => {
    setIsSearching(true);
    setHasSearched(false);

    try {
      const fetchSuggestions = async (searchText: string) => {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}&limit=5&countrycodes=vn`
        );

        return response.ok ? ((await response.json()) as NominatimSuggestion[]) : [];
      };

      let results = await fetchSuggestions(query);
      const normalizedQuery = query.toLowerCase();

      if (
        results.length === 0 &&
        !normalizedQuery.includes("ha noi") &&
        !normalizedQuery.includes("hanoi") &&
        !normalizedQuery.includes("hà nội")
      ) {
        results = await fetchSuggestions(`${query}, Ha Noi`);
      }

      setSuggestions(results);
    } catch (error) {
      console.error("Error fetching location", error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    const nextLocation = { lat, lng };
    setSelectedLocation(nextLocation);
    setMapCenter(nextLocation);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      if (data?.display_name) setSearchQuery(data.display_name);
    } catch (error) {
      console.error("Error reverse geocoding", error);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (searchQuery.trim().length > 2) {
        handleSearchAddress(searchQuery.trim());
      } else {
        setSuggestions([]);
        setHasSearched(false);
      }
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    restaurantImagesRef.current = restaurantImages;
  }, [restaurantImages]);

  useEffect(() => {
    menuItemsRef.current = menuItems;
  }, [menuItems]);

  useEffect(() => {
    return () => {
      restaurantImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      menuItemsRef.current.forEach((item) => {
        if (item.imagePreviewUrl) URL.revokeObjectURL(item.imagePreviewUrl);
      });
    };
  }, []);

  if (!isLoggedIn || !currentUser) {
    navigate("/login");
    return null;
  }

  const steps = [
    { num: 1, label: t.registerStore.step1 },
    { num: 2, label: t.registerStore.step2 },
    { num: 3, label: t.registerStore.step3 },
  ];

  const addMenuItem = () => {
    setMenuItems((prev) => [...prev, createEmptyMenuItem()]);
    clearError("menu");
  };

  const removeMenuItem = (index: number) => {
    setMenuItems((prev) => {
      const removedItem = prev[index];
      if (removedItem?.imagePreviewUrl) URL.revokeObjectURL(removedItem.imagePreviewUrl);
      return prev.filter((_, currentIndex) => currentIndex !== index);
    });
    setErrors({});
  };

  const updateMenuItem = (index: number, field: keyof MenuItemForm, value: string) => {
    setMenuItems((prev) =>
      prev.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [field]: value } : item
      )
    );
    clearError("menu", `menu.${index}.${field}`);
  };

  const toggleTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter((currentTag) => currentTag !== tag)
        : [...prev.selectedTags, tag],
    }));
    clearError("tags");
  };

  const validateSelectedFiles = (files: File[], currentCount: number) => {
    if (currentCount + files.length > MAX_RESTAURANT_IMAGES) {
      setErrors((prev) => ({ ...prev, images: t.registerStore.errorImageCount }));
      return null;
    }

    const nextImages: SelectedImage[] = [];

    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        nextImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
        setErrors((prev) => ({ ...prev, images: t.registerStore.errorImageType }));
        return null;
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        nextImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
        setErrors((prev) => ({ ...prev, images: t.registerStore.errorImageSize }));
        return null;
      }

      nextImages.push({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    return nextImages;
  };

  const handleRestaurantImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const nextImages = validateSelectedFiles(files, restaurantImages.length);
    if (!nextImages) return;

    setRestaurantImages((prev) => [...prev, ...nextImages]);
    clearError("images");
  };

  const removeRestaurantImage = (index: number) => {
    setRestaurantImages((prev) => {
      const removedImage = prev[index];
      if (removedImage) URL.revokeObjectURL(removedImage.previewUrl);
      return prev.filter((_, currentIndex) => currentIndex !== index);
    });
    clearError("images");
  };

  const handleMenuImageSelect = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setErrors((prev) => ({ ...prev, [`menu.${index}.image`]: t.registerStore.errorImageType }));
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setErrors((prev) => ({ ...prev, [`menu.${index}.image`]: t.registerStore.errorImageSize }));
      return;
    }

    setMenuItems((prev) =>
      prev.map((item, currentIndex) => {
        if (currentIndex !== index) return item;
        if (item.imagePreviewUrl) URL.revokeObjectURL(item.imagePreviewUrl);

        return {
          ...item,
          imageFile: file,
          imagePreviewUrl: URL.createObjectURL(file),
        };
      })
    );
    clearError("menu", `menu.${index}.image`);
  };

  const removeMenuImage = (index: number) => {
    setMenuItems((prev) =>
      prev.map((item, currentIndex) => {
        if (currentIndex !== index) return item;
        if (item.imagePreviewUrl) URL.revokeObjectURL(item.imagePreviewUrl);

        return {
          ...item,
          imageFile: undefined,
          imagePreviewUrl: undefined,
        };
      })
    );
    clearError(`menu.${index}.image`);
  };

  const getStepErrors = (step: number) => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.nameVn.trim()) newErrors.nameVn = t.registerStore.errNameVn;
      if (!formData.nameJp.trim()) newErrors.nameJp = t.registerStore.errNameJp;
      if (!formData.address.trim()) newErrors.address = t.registerStore.errAddress;
      if (!formData.phone.trim()) newErrors.phone = t.registerStore.errPhone;
      if (!formData.openHours.trim()) newErrors.openHours = t.registerStore.errOpenHours;
      if (!formData.avgPrice.trim() || Number(formData.avgPrice) <= 0) {
        newErrors.avgPrice = t.registerStore.errAvgPrice;
      }
      if (!formData.description.trim()) newErrors.description = t.registerStore.errDescVn;
      if (!formData.descriptionJp.trim()) newErrors.descriptionJp = t.registerStore.errDescJp;
    }

    if (step === 2) {
      if (menuItems.length === 0) newErrors.menu = t.registerStore.errMenuRequired;

      menuItems.forEach((item, index) => {
        if (!item.nameVn.trim()) newErrors[`menu.${index}.nameVn`] = t.registerStore.errDishNameVn;
        if (!item.nameJp.trim()) newErrors[`menu.${index}.nameJp`] = t.registerStore.errDishNameJp;
        if (!item.price.trim() || Number(item.price) <= 0) {
          newErrors[`menu.${index}.price`] = t.registerStore.errDishPrice;
        }
        if (!item.description.trim()) {
          newErrors[`menu.${index}.description`] = t.registerStore.errDishDesc;
        }
        if (!item.imageFile) newErrors[`menu.${index}.image`] = t.registerStore.errDishImage;
      });
    }

    if (step === 3) {
      if (restaurantImages.length === 0) newErrors.images = t.registerStore.errImages;
      if (formData.selectedTags.length === 0) newErrors.tags = t.registerStore.errTags;
    }

    return newErrors;
  };

  const firstInvalidStep = (newErrors: Record<string, string>) => {
    const basicFields = [
      "nameVn",
      "nameJp",
      "address",
      "phone",
      "openHours",
      "avgPrice",
      "description",
      "descriptionJp",
    ];

    if (basicFields.some((key) => newErrors[key])) return 1;
    if (Object.keys(newErrors).some((key) => key === "menu" || key.startsWith("menu."))) return 2;
    return 3;
  };

  const validateStep = (step: number) => {
    const newErrors = getStepErrors(step);
    if (Object.keys(newErrors).length > 0) {
      newErrors.submit = t.registerStore.errRequired;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) setCurrentStep(currentStep + 1);
  };

  const confirmSelectedAddress = () => {
    updateFormField("address", searchQuery);
    setShowMapModal(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const newErrors = {
      ...getStepErrors(1),
      ...getStepErrors(2),
      ...getStepErrors(3),
    };

    if (Object.keys(newErrors).length > 0) {
      newErrors.submit = t.registerStore.errRequired;
      setErrors(newErrors);
      setCurrentStep(firstInvalidStep(newErrors));
      return;
    }

    try {
      setSaving(true);
      setErrors((prev) => ({ ...prev, submit: "" }));

      const restaurantImageUrls = await uploadRestaurantImages(
        restaurantImages.map((image) => image.file)
      );
      const menuImageUrls = await Promise.all(
        menuItems
          .map((item) => item.imageFile)
          .filter((file): file is File => Boolean(file))
          .map((file) => uploadMenuImage(file).then(({ url }) => url))
      );
      let menuImageIndex = 0;

      await createRestaurant({
        ownerId: currentUser.id,
        nameVn: formData.nameVn.trim(),
        nameJp: formData.nameJp.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        description: formData.description.trim(),
        descriptionJp: formData.descriptionJp.trim(),
        coverImage: restaurantImageUrls[0],
        images: restaurantImageUrls,
        menu: menuItems.map((item, index) => ({
          id: `new-${index}`,
          nameVn: item.nameVn.trim(),
          nameJp: item.nameJp.trim(),
          price: Number(item.price),
          description: item.description.trim(),
          image: menuImageUrls[menuImageIndex++],
        })),
        openHours: formData.openHours.trim(),
        avgPrice: Number(formData.avgPrice),
        tags: formData.selectedTags,
        status: "closed",
        lat: selectedLocation?.lat ?? DEFAULT_LOCATION.lat,
        lng: selectedLocation?.lng ?? DEFAULT_LOCATION.lng,
      });

      setSubmitted(true);
      setTimeout(() => {
        navigate("/owner/restaurants");
      }, 2000);
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : t.registerStore.errSubmit;
      setErrors({ submit: message });
    } finally {
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-gray-900 mb-2">{t.registerStore.successTitle}</h2>
          <p className="text-sm text-gray-400">{t.registerStore.successSub}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 sticky top-16 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="w-4 h-4" />
            {t.registerStore.back}
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-700">{t.registerStore.title}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-gray-900 mb-2">{t.registerStore.pageTitle}</h1>
        <p className="text-sm text-gray-400 mb-8">{t.registerStore.pageSub}</p>

        <div className="flex items-center gap-3 mb-8">
          {steps.map((step, index) => (
            <React.Fragment key={step.num}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                    currentStep >= step.num ? "text-white" : "bg-gray-100 text-gray-400"
                  }`}
                  style={currentStep >= step.num ? { background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" } : {}}
                >
                  {currentStep > step.num ? "✓" : step.num}
                </div>
                <span className={`text-sm hidden sm:inline ${currentStep >= step.num ? "text-blue-600" : "text-gray-400"}`}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 ${currentStep > step.num ? "bg-blue-400" : "bg-gray-200"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {errors.submit && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {currentStep === 1 && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-gray-900 mb-5">{t.registerStore.step1}</h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1.5">
                        {t.registerStore.nameVn}<RequiredMark />
                      </label>
                      <input
                        type="text"
                        value={formData.nameVn}
                        onChange={(event) => updateFormField("nameVn", event.target.value)}
                        placeholder="Pho Bac Co Truyen"
                        className={inputClass(Boolean(errors.nameVn), "w-full px-3 py-2.5")}
                      />
                      <FieldError message={errors.nameVn} />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1.5">
                        {t.registerStore.nameJp}<RequiredMark />
                      </label>
                      <input
                        type="text"
                        value={formData.nameJp}
                        onChange={(event) => updateFormField("nameJp", event.target.value)}
                        placeholder="フォー専門店"
                        className={inputClass(Boolean(errors.nameJp), "w-full px-3 py-2.5")}
                      />
                      <FieldError message={errors.nameJp} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1.5">
                      {t.registerStore.address}<RequiredMark />
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(event) => updateFormField("address", event.target.value)}
                        placeholder="12 Hang Bun, Hoan Kiem, Ha Noi"
                        className={inputClass(Boolean(errors.address), "w-full pl-10 pr-4 py-2.5")}
                      />
                    </div>
                    <FieldError message={errors.address} />
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery(formData.address);
                        setShowMapModal(true);
                      }}
                      className="mt-2 text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3" />
                      {t.registerStore.selectMap}
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1.5">
                      {t.registerStore.phone}<RequiredMark />
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.phone}
                      onChange={(event) => updateNumericField("phone", event.target.value)}
                      placeholder="02438261011"
                      className={inputClass(Boolean(errors.phone), "w-full px-3 py-2.5")}
                    />
                    <FieldError message={errors.phone} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1.5">
                        <Clock className="inline w-4 h-4 mr-1" />
                        {t.registerStore.openHours}<RequiredMark />
                      </label>
                      <input
                        type="text"
                        value={formData.openHours}
                        onChange={(event) => updateFormField("openHours", event.target.value)}
                        placeholder="10:00 - 21:00"
                        className={inputClass(Boolean(errors.openHours), "w-full px-3 py-2.5")}
                      />
                      <FieldError message={errors.openHours} />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1.5">
                        <DollarSign className="inline w-4 h-4 mr-1" />
                        {t.registerStore.avgPrice}<RequiredMark />
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formData.avgPrice}
                        onChange={(event) => updateNumericField("avgPrice", event.target.value)}
                        placeholder="65000"
                        className={inputClass(Boolean(errors.avgPrice), "w-full px-3 py-2.5")}
                      />
                      <FieldError message={errors.avgPrice} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1.5">
                      {t.registerStore.descVn}<RequiredMark />
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(event) => updateFormField("description", event.target.value)}
                      placeholder={t.registerStore.descVnPh}
                      rows={3}
                      className={inputClass(Boolean(errors.description), "w-full px-3 py-2.5 resize-none")}
                    />
                    <FieldError message={errors.description} />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1.5">
                      {t.registerStore.descJp}<RequiredMark />
                    </label>
                    <textarea
                      value={formData.descriptionJp}
                      onChange={(event) => updateFormField("descriptionJp", event.target.value)}
                      placeholder={t.registerStore.descJpPh}
                      rows={3}
                      className={inputClass(Boolean(errors.descriptionJp), "w-full px-3 py-2.5 resize-none")}
                    />
                    <FieldError message={errors.descriptionJp} />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="w-full py-3 text-white rounded-xl text-sm transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
              >
                {t.registerStore.nextStep2}
              </button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-gray-900">{t.registerStore.menuTitle}</h3>
                  <button
                    type="button"
                    onClick={addMenuItem}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    {t.registerStore.addBtn}
                  </button>
                </div>
                <FieldError message={errors.menu} />

                <div className="space-y-4">
                  {menuItems.map((item, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-100 relative">
                      {menuItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMenuItem(index)}
                          className="absolute top-3 right-3 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-red-500 hover:bg-red-200 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}

                      <p className="text-xs text-gray-500 mb-3">
                        {t.registerStore.menuLabel} {index + 1}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-4">
                        <div>
                          <label className="block text-sm text-gray-700 mb-1.5">
                            {t.registerStore.dishImage}<RequiredMark />
                          </label>
                          {item.imagePreviewUrl ? (
                            <div className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-white">
                              <img
                                src={item.imagePreviewUrl}
                                alt={item.nameVn || t.registerStore.dishImage}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removeMenuImage(index)}
                                className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"
                              >
                                <X className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          ) : (
                            <label
                              className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-white ${
                                errors[`menu.${index}.image`]
                                  ? "border-red-300 text-red-400"
                                  : "border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-400"
                              }`}
                            >
                              <Upload className="w-6 h-6" />
                              <span className="text-xs text-center">{t.registerStore.addDishImage}</span>
                              <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                                onChange={(event) => handleMenuImageSelect(index, event)}
                                className="hidden"
                              />
                            </label>
                          )}
                          <FieldError message={errors[`menu.${index}.image`]} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm text-gray-700 mb-1.5">
                              {t.registerStore.dishNameVn}<RequiredMark />
                            </label>
                            <input
                              type="text"
                              value={item.nameVn}
                              onChange={(event) => updateMenuItem(index, "nameVn", event.target.value)}
                              placeholder={t.registerStore.dishNameVn}
                              className={inputClass(Boolean(errors[`menu.${index}.nameVn`]), "w-full px-3 py-2")}
                            />
                            <FieldError message={errors[`menu.${index}.nameVn`]} />
                          </div>

                          <div>
                            <label className="block text-sm text-gray-700 mb-1.5">
                              {t.registerStore.dishNameJp}<RequiredMark />
                            </label>
                            <input
                              type="text"
                              value={item.nameJp}
                              onChange={(event) => updateMenuItem(index, "nameJp", event.target.value)}
                              placeholder={t.registerStore.dishNameJp}
                              className={inputClass(Boolean(errors[`menu.${index}.nameJp`]), "w-full px-3 py-2")}
                            />
                            <FieldError message={errors[`menu.${index}.nameJp`]} />
                          </div>

                          <div>
                            <label className="block text-sm text-gray-700 mb-1.5">
                              {t.registerStore.price}<RequiredMark />
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={item.price}
                              onChange={(event) => updateMenuItem(index, "price", digitsOnly(event.target.value))}
                              placeholder={t.registerStore.price}
                              className={inputClass(Boolean(errors[`menu.${index}.price`]), "w-full px-3 py-2")}
                            />
                            <FieldError message={errors[`menu.${index}.price`]} />
                          </div>

                          <div>
                            <label className="block text-sm text-gray-700 mb-1.5">
                              {t.registerStore.dishDesc}<RequiredMark />
                            </label>
                            <input
                              type="text"
                              value={item.description}
                              onChange={(event) => updateMenuItem(index, "description", event.target.value)}
                              placeholder={t.registerStore.dishDesc}
                              className={inputClass(Boolean(errors[`menu.${index}.description`]), "w-full px-3 py-2")}
                            />
                            <FieldError message={errors[`menu.${index}.description`]} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 py-3 text-gray-600 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                >
                  {t.registerStore.prevBtn}
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 py-3 text-white rounded-xl text-sm transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
                >
                  {t.registerStore.nextStep3}
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-gray-900 mb-1">
                  {t.registerStore.photoTitle}<RequiredMark />
                </h3>
                <p className="text-sm text-gray-400 mb-5">{t.registerStore.photoSub}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {restaurantImages.map((image, index) => (
                    <div key={image.previewUrl} className="aspect-video rounded-xl overflow-hidden relative group">
                      <img src={image.previewUrl} alt={image.file.name} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeRestaurantImage(index)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}

                  {restaurantImages.length < MAX_RESTAURANT_IMAGES && (
                    <button
                      type="button"
                      onClick={() => restaurantImageInputRef.current?.click()}
                      className={`aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${
                        errors.images
                          ? "border-red-300 text-red-400"
                          : "border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-400"
                      }`}
                    >
                      <Upload className="w-6 h-6" />
                      <span className="text-xs">{t.registerStore.addPhoto}</span>
                    </button>
                  )}
                </div>
                <input
                  ref={restaurantImageInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleRestaurantImageSelect}
                  className="hidden"
                />
                <FieldError message={errors.images} />
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-1">
                  <Tag className="w-4 h-4 text-blue-400" />
                  <h3 className="text-gray-900">
                    {t.registerStore.tagTitle}<RequiredMark />
                  </h3>
                </div>
                <p className="text-sm text-gray-400 mb-4">{t.registerStore.tagSub}</p>
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
                <FieldError message={errors.tags} />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 py-3 text-gray-600 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                >
                  {t.registerStore.prevBtn}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 text-white rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
                >
                  {saving ? t.registerStore.saving : t.registerStore.submitBtn}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {showMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col" style={{ height: "80vh" }}>
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Chọn vị trí trên bản đồ</h3>
              <button type="button" onClick={() => setShowMapModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden relative">
              <div className="relative z-[1000]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Nhập tên đường, khu vực..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
                  />
                </div>

                {isSearching && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm text-gray-500 text-center">
                    Đang tìm kiếm...
                  </div>
                )}

                {!isSearching && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    {suggestions.map((item) => (
                      <button
                        key={`${item.lat}-${item.lon}-${item.display_name}`}
                        type="button"
                        className="w-full p-3 hover:bg-gray-50 cursor-pointer text-sm text-left border-b border-gray-50 last:border-0"
                        onClick={() => {
                          const nextLocation = { lat: Number(item.lat), lng: Number(item.lon) };
                          setMapCenter(nextLocation);
                          setSelectedLocation(nextLocation);
                          setSearchQuery(item.display_name);
                          setSuggestions([]);
                        }}
                      >
                        {item.display_name}
                      </button>
                    ))}
                  </div>
                )}

                {!isSearching && hasSearched && suggestions.length === 0 && searchQuery.trim().length > 2 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm text-gray-500 text-center">
                    Không tìm thấy địa điểm nào phù hợp.
                  </div>
                )}
              </div>

              <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 relative z-0">
                <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={13} style={{ height: "100%", width: "100%" }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapUpdater center={mapCenter} />
                  <MapEvents onLocationSelect={handleMapClick} />
                  {selectedLocation && <Marker position={[selectedLocation.lat, selectedLocation.lng]} />}
                </MapContainer>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowMapModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmSelectedAddress}
                disabled={!searchQuery.trim()}
                className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl"
              >
                Xác nhận địa chỉ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
