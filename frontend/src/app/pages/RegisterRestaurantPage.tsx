import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import {
  ChevronLeft, Plus, X, Upload, Clock, MapPin, Tag,
  CheckCircle, AlertCircle, DollarSign, Search
} from "lucide-react";
import { createRestaurant, getFoodTags, uploadMenuImage } from "../api/client";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix leaflet marker icon issue in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Thành phần hỗ trợ click trên bản đồ
function MapEvents({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Thành phần hỗ trợ di chuyển bản đồ đến điểm mới
function MapUpdater({ center }: { center: {lat: number, lng: number} }) {
  const map = useMap();
  map.flyTo([center.lat, center.lng], map.getZoom());
  return null;
}
import { useAuth } from "../context/AuthContext";
import { useApiData } from "../hooks/useApiData";
import { useLanguage } from "../context/LanguageContext";

interface MenuItemForm {
  nameVn: string;
  nameJp: string;
  price: string;
  description: string;
  image?: string;
  isUploadingImage?: boolean;
}

export function RegisterRestaurantPage() {
  const navigate = useNavigate();
  const { currentUser, isLoggedIn } = useAuth();
  const { data: foodTags } = useApiData(getFoodTags, [], []);
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    nameVn: "",
    nameJp: "",
    address: "",
    phone: "",
    description: "",
    descriptionJp: "",
    openHours: "10:00 - 21:00",
    avgPrice: "",
    selectedTags: [] as string[],
  });

  const [menuItems, setMenuItems] = useState<MenuItemForm[]>([
    { nameVn: "", nameJp: "", price: "", description: "" },
  ]);

  const [images, setImages] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [showMapModal, setShowMapModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number}>({ lat: 21.027764, lng: 105.83416 });
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleNumericInput = (value: string, setter: (val: string) => void) => {
    if (/[^\d]/.test(value)) {
      alert("Vui lòng chỉ nhập số, không nhập chữ hay ký tự đặc biệt!");
      setter(value.replace(/[^\d]/g, ""));
    } else {
      setter(value);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length > 2) {
        handleSearchAddress(searchQuery.trim());
      } else {
        setSuggestions([]);
        setHasSearched(false);
      }
    }, 800);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  if (!isLoggedIn || !currentUser) {
    navigate("/login");
    return null;
  }

  const steps = [
    { num: 1, label: t.registerStore.step1 },
    { num: 2, label: t.registerStore.step2 },
    { num: 3, label: t.registerStore.step3 },
  ];

  const sampleImages = [
    "https://images.unsplash.com/photo-1677837914128-2367031a11e7?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1761409260819-c6da12bbb2c0?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1763703544688-2ac7839b0659?w=400&h=300&fit=crop",
  ];

  const addMenuItem = () => {
    setMenuItems([...menuItems, { nameVn: "", nameJp: "", price: "", description: "" }]);
  };

  const removeMenuItem = (index: number) => {
    setMenuItems(menuItems.filter((_, i) => i !== index));
  };

  const updateMenuItem = (index: number, field: string, value: any) => {
    setMenuItems(prev => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const toggleTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter((t) => t !== tag)
        : [...prev.selectedTags, tag],
    }));
  };

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};
    if (step === 1) {
      if (!formData.nameVn.trim()) newErrors.nameVn = t.registerStore.errNameVn;
      if (!formData.nameJp.trim()) newErrors.nameJp = t.registerStore.errNameJp;
      if (!formData.address.trim()) newErrors.address = t.registerStore.errAddress;
      if (!formData.phone.trim()) newErrors.phone = t.registerStore.errPhone;
      if (!formData.openHours.trim()) newErrors.openHours = t.registerStore.errOpenHours;
      if (!formData.avgPrice.toString().trim()) newErrors.avgPrice = t.registerStore.errAvgPrice;
      if (!formData.description.trim()) newErrors.description = t.registerStore.errDescVn;
      if (!formData.descriptionJp.trim()) newErrors.descriptionJp = t.registerStore.errDescJp;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSearchAddress = async (query: string) => {
    setIsSearching(true);
    setHasSearched(false);
    try {
      let results = [];
      // Lần 1: Tìm kiếm chính xác những gì user gõ
      let res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=vn`);
      if (res.ok) {
        results = await res.json();
      }
      
      // Lần 2: Nếu không tìm thấy, thử thêm chữ "Hà Nội" để OpenStreetMap dễ nhận diện hơn (OSM rất khó tính với số nhà thiếu tên thành phố)
      if (results.length === 0 && !query.toLowerCase().includes('hà nội') && !query.toLowerCase().includes('hanoi')) {
        res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Hà Nội')}&limit=5&countrycodes=vn`);
        if (res.ok) {
          results = await res.json();
        }
      }
      
      setSuggestions(results || []);
    } catch (error) {
      console.error("Error fetching location", error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data && data.display_name) {
        setSearchQuery(data.display_name);
      }
    } catch (error) {
      console.error("Error reverse geocoding", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1)) {
      setCurrentStep(1);
      return;
    }

    try {
      setSaving(true);
      await createRestaurant({
        ownerId: currentUser.id,
        nameVn: formData.nameVn,
        nameJp: formData.nameJp,
        address: formData.address,
        phone: formData.phone,
        description: formData.description,
        descriptionJp: formData.descriptionJp,
        coverImage: images[0],
        images,
        menu: menuItems
          .filter((item) => item.nameVn.trim())
          .map((item, index) => ({
            id: `new-${index}`,
            nameVn: item.nameVn,
            nameJp: item.nameJp || item.nameVn,
            price: Number(item.price) || 0,
            description: item.description,
            image: item.image,
          })),
        openHours: formData.openHours,
        avgPrice: Number(formData.avgPrice) || 0,
        tags: formData.selectedTags,
        status: "closed",
        lat: selectedLocation ? selectedLocation.lat : 21.027764,
        lng: selectedLocation ? selectedLocation.lng : 105.83416,
      });
      setSubmitted(true);
      setTimeout(() => {
        navigate("/owner/restaurants");
      }, 2000);
    } catch {
      setErrors({ submit: t.registerStore.errSubmit });
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
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
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

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          {steps.map((step, i) => (
            <React.Fragment key={step.num}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                    currentStep >= step.num
                      ? "text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                  style={currentStep >= step.num ? { background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" } : {}}
                >
                  {currentStep > step.num ? "✓" : step.num}
                </div>
                <span className={`text-sm hidden sm:inline ${currentStep >= step.num ? "text-blue-600" : "text-gray-400"}`}>
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
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
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-gray-900 mb-5">{t.registerStore.step1}</h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1.5">
                        {t.registerStore.nameVn}<span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.nameVn}
                        onChange={(e) => setFormData({ ...formData, nameVn: e.target.value })}
                        placeholder="Phở Bắc Cổ Truyền"
                        className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors ${
                          errors.nameVn ? "border-red-300" : "border-gray-200"
                        }`}
                      />
                      {errors.nameVn && (
                        <p className="text-xs text-red-500 mt-1">{errors.nameVn}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1.5">
                        {t.registerStore.nameJp}<span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.nameJp}
                        onChange={(e) => setFormData({ ...formData, nameJp: e.target.value })}
                        placeholder="バックコー伝統フォー"
                        className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors ${
                          errors.nameJp ? "border-red-300" : "border-gray-200"
                        }`}
                      />
                      {errors.nameJp && (
                        <p className="text-xs text-red-500 mt-1">{errors.nameJp}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1.5">
                      {t.registerStore.address}<span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="12 Hàng Bún, Hoàn Kiếm, Hà Nội"
                        className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors ${
                          errors.address ? "border-red-300" : "border-gray-200"
                        }`}
                      />
                    </div>
                    {errors.address && (
                      <p className="text-xs text-red-500 mt-1">{errors.address}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowMapModal(true)}
                      className="mt-2 text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3" />
                      {t.registerStore.selectMap}
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1.5">{t.registerStore.phone}<span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.phone}
                      onChange={(e) => handleNumericInput(e.target.value, (val) => setFormData({ ...formData, phone: val }))}
                      placeholder="0912345678"
                      className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors ${
                        errors.phone ? "border-red-300" : "border-gray-200"
                      }`}
                    />
                    {errors.phone && (
                      <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1.5">
                        <Clock className="inline w-4 h-4 mr-1" />
                        {t.registerStore.openHours}<span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.openHours}
                        onChange={(e) => setFormData({ ...formData, openHours: e.target.value })}
                        placeholder="10:00 - 21:00"
                        className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors ${
                          errors.openHours ? "border-red-300" : "border-gray-200"
                        }`}
                      />
                      {errors.openHours && (
                        <p className="text-xs text-red-500 mt-1">{errors.openHours}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1.5">
                        <DollarSign className="inline w-4 h-4 mr-1" />
                        {t.registerStore.avgPrice}<span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formData.avgPrice}
                        onChange={(e) => handleNumericInput(e.target.value, (val) => setFormData({ ...formData, avgPrice: val }))}
                        placeholder="65000"
                        className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors ${
                          errors.avgPrice ? "border-red-300" : "border-gray-200"
                        }`}
                      />
                      {errors.avgPrice && (
                        <p className="text-xs text-red-500 mt-1">{errors.avgPrice}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1.5">{t.registerStore.descVn}<span className="text-red-400">*</span></label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={t.registerStore.descVnPh}
                      rows={3}
                      className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors resize-none ${
                        errors.description ? "border-red-300" : "border-gray-200"
                      }`}
                    />
                    {errors.description && (
                      <p className="text-xs text-red-500 mt-1">{errors.description}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1.5">{t.registerStore.descJp}<span className="text-red-400">*</span></label>
                    <textarea
                      value={formData.descriptionJp}
                      onChange={(e) => setFormData({ ...formData, descriptionJp: e.target.value })}
                      placeholder={t.registerStore.descJpPh}
                      rows={3}
                      className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors resize-none ${
                        errors.descriptionJp ? "border-red-300" : "border-gray-200"
                      }`}
                    />
                    {errors.descriptionJp && (
                      <p className="text-xs text-red-500 mt-1">{errors.descriptionJp}</p>
                    )}
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

          {/* Step 2: Menu */}
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
                      <p className="text-xs text-gray-500 mb-3">{t.registerStore.menuLabel} {index + 1}</p>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <input
                          type="text"
                          value={item.nameVn}
                          onChange={(e) => updateMenuItem(index, "nameVn", e.target.value)}
                          placeholder={t.registerStore.dishNameVn}
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 bg-white"
                        />
                        <input
                          type="text"
                          value={item.nameJp}
                          onChange={(e) => updateMenuItem(index, "nameJp", e.target.value)}
                          placeholder={t.registerStore.dishNameJp}
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={item.price}
                          onChange={(e) => handleNumericInput(e.target.value, (val) => updateMenuItem(index, "price", val))}
                          placeholder={t.registerStore.price}
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 bg-white"
                        />
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateMenuItem(index, "description", e.target.value)}
                          placeholder={t.registerStore.dishDesc}
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 bg-white"
                        />
                      </div>
                      <div className="mt-3 flex items-center gap-4">
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            id={`menu-image-${index}`}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  if (typeof reader.result === "string") {
                                    updateMenuItem(index, "image", reader.result);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <label
                            htmlFor={`menu-image-${index}`}
                            className="cursor-pointer flex items-center justify-center w-16 h-16 bg-white border border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors overflow-hidden"
                          >
                            {item.isUploadingImage ? (
                              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                            ) : item.image ? (
                              <img src={item.image} alt="Menu item" className="w-full h-full object-cover" />
                            ) : (
                              <Upload className="w-5 h-5" />
                            )}
                          </label>
                        </div>
                        {!item.image && !item.isUploadingImage && (
                          <div className="text-xs text-gray-400">
                            Thêm ảnh minh họa cho món ăn
                          </div>
                        )}
                        {item.image && (
                          <button
                            type="button"
                            onClick={() => updateMenuItem(index, "image", "")}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Xóa ảnh
                          </button>
                        )}
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

          {/* Step 3: Photos & Tags */}
          {currentStep === 3 && (
            <div className="space-y-5">
              {/* Photos */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-gray-900 mb-1">{t.registerStore.photoTitle}</h3>
                <p className="text-sm text-gray-400 mb-5">{t.registerStore.photoSub}</p>
                <div className="grid grid-cols-3 gap-3">
                  {images.map((img, i) => (
                    <div key={i} className="aspect-video rounded-xl overflow-hidden relative group">
                      <img src={img} alt="upload" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {images.length < 8 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (images.length < 8) {
                          setImages([...images, sampleImages[images.length % sampleImages.length]]);
                        }
                      }}
                      className="aspect-video rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-blue-300 hover:text-blue-400 transition-colors"
                    >
                      <Upload className="w-6 h-6" />
                      <span className="text-xs">{t.registerStore.addPhoto}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-1">
                  <Tag className="w-4 h-4 text-blue-400" />
                  <h3 className="text-gray-900">{t.registerStore.tagTitle}</h3>
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
                  className="flex-1 py-3 text-white rounded-xl text-sm transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
                >
                  {t.registerStore.submitBtn}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {showMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col" style={{ height: '80vh' }}>
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Chọn vị trí trên bản đồ</h3>
              <button type="button" onClick={() => setShowMapModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Search & Map */}
            <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden relative">
              <div className="relative z-[1000]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nhập tên đường, khu vực..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
                  />
                </div>
                
                {isSearching && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm text-gray-500 text-center">
                    Đang tìm kiếm...
                  </div>
                )}
                
                {/* Suggestions Dropdown */}
                {!isSearching && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    {suggestions.map((item, idx) => (
                      <div 
                        key={idx}
                        className="p-3 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-50 last:border-0"
                        onClick={() => {
                          const lat = parseFloat(item.lat);
                          const lon = parseFloat(item.lon);
                          setMapCenter({lat, lng: lon});
                          setSelectedLocation({lat, lng: lon});
                          setSearchQuery(item.display_name);
                          setSuggestions([]);
                        }}
                      >
                        {item.display_name}
                      </div>
                    ))}
                  </div>
                )}

                {/* No results */}
                {!isSearching && hasSearched && suggestions.length === 0 && searchQuery.trim().length > 2 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm text-gray-500 text-center">
                    Không tìm thấy địa điểm nào phù hợp.
                  </div>
                )}
              </div>

                {/* Map Container */}
              <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 relative z-0">
                <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapUpdater center={mapCenter} />
                  <MapEvents onLocationSelect={handleMapClick} />
                  {selectedLocation && (
                    <Marker position={[selectedLocation.lat, selectedLocation.lng]} />
                  )}
                </MapContainer>
              </div>
            </div>

            {/* Footer / Confirm Button */}
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
              <button type="button" onClick={() => setShowMapModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl">
                Hủy
              </button>
              <button 
                type="button"
                onClick={() => {
                  setFormData({...formData, address: searchQuery});
                  setShowMapModal(false);
                }}
                className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
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
