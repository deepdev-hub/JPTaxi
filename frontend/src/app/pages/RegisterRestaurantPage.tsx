import React, { useState } from "react";
import { useNavigate, Link } from "react-router";
import {
  ChevronLeft, Plus, X, Upload, Clock, MapPin, Tag,
  CheckCircle, AlertCircle, DollarSign
} from "lucide-react";
import { createRestaurant, getFoodTags } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useApiData } from "../hooks/useApiData";

interface MenuItemForm {
  nameVn: string;
  nameJp: string;
  price: string;
  description: string;
}

export function RegisterRestaurantPage() {
  const navigate = useNavigate();
  const { currentUser, isLoggedIn } = useAuth();
  const { data: foodTags } = useApiData(getFoodTags, [], []);

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

  if (!isLoggedIn || !currentUser) {
    navigate("/login");
    return null;
  }

  const steps = [
    { num: 1, label: "基本情報" },
    { num: 2, label: "メニュー" },
    { num: 3, label: "写真・タグ" },
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

  const updateMenuItem = (index: number, field: keyof MenuItemForm, value: string) => {
    setMenuItems(menuItems.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
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
      if (!formData.nameVn.trim()) newErrors.nameVn = "ベトナム語名を入力してください";
      if (!formData.nameJp.trim()) newErrors.nameJp = "日本語名を入力してください";
      if (!formData.address.trim()) newErrors.address = "住所を入力してください";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
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
          })),
        openHours: formData.openHours,
        avgPrice: Number(formData.avgPrice) || 0,
        tags: formData.selectedTags,
        status: "closed",
        lat: 21.027764,
        lng: 105.83416,
      });
      setSubmitted(true);
      setTimeout(() => {
        navigate("/owner/restaurants");
      }, 2000);
    } catch {
      setErrors({ submit: "Cannot save restaurant. Please check backend and database connection." });
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
          <h2 className="text-gray-900 mb-2">店舗を登録しました！</h2>
          <p className="text-sm text-gray-400">店舗管理ページに戻ります...</p>
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
            戻る
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-700">新規店舗登録</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-gray-900 mb-2">店舗情報を登録</h1>
        <p className="text-sm text-gray-400 mb-8">Đăng ký thông tin quán ăn của bạn</p>

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
                <h3 className="text-gray-900 mb-5">基本情報</h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1.5">
                        店名（ベトナム語）<span className="text-red-400">*</span>
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
                        店名（日本語）<span className="text-red-400">*</span>
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
                      住所 / Địa chỉ<span className="text-red-400">*</span>
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
                      className="mt-2 text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3" />
                      地図から選択
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1.5">電話番号</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="024 3826 1011"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1.5">
                        <Clock className="inline w-4 h-4 mr-1" />
                        営業時間
                      </label>
                      <input
                        type="text"
                        value={formData.openHours}
                        onChange={(e) => setFormData({ ...formData, openHours: e.target.value })}
                        placeholder="10:00 - 21:00"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1.5">
                        <DollarSign className="inline w-4 h-4 mr-1" />
                        平均単価 (VND)
                      </label>
                      <input
                        type="number"
                        value={formData.avgPrice}
                        onChange={(e) => setFormData({ ...formData, avgPrice: e.target.value })}
                        placeholder="65000"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1.5">説明（ベトナム語）</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="お店の説明をベトナム語で..."
                      rows={3}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1.5">説明（日本語）</label>
                    <textarea
                      value={formData.descriptionJp}
                      onChange={(e) => setFormData({ ...formData, descriptionJp: e.target.value })}
                      placeholder="お店の説明を日本語で..."
                      rows={3}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors resize-none"
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="w-full py-3 text-white rounded-xl text-sm transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
              >
                次へ：メニュー設定
              </button>
            </div>
          )}

          {/* Step 2: Menu */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-gray-900">メニュー設定</h3>
                  <button
                    type="button"
                    onClick={addMenuItem}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    追加
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
                      <p className="text-xs text-gray-500 mb-3">メニュー {index + 1}</p>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <input
                          type="text"
                          value={item.nameVn}
                          onChange={(e) => updateMenuItem(index, "nameVn", e.target.value)}
                          placeholder="料理名（ベトナム語）"
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 bg-white"
                        />
                        <input
                          type="text"
                          value={item.nameJp}
                          onChange={(e) => updateMenuItem(index, "nameJp", e.target.value)}
                          placeholder="料理名（日本語）"
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => updateMenuItem(index, "price", e.target.value)}
                          placeholder="価格 (VND)"
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 bg-white"
                        />
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateMenuItem(index, "description", e.target.value)}
                          placeholder="説明（任意）"
                          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 bg-white"
                        />
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
                  前へ
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 py-3 text-white rounded-xl text-sm transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
                >
                  次へ：写真・タグ
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Photos & Tags */}
          {currentStep === 3 && (
            <div className="space-y-5">
              {/* Photos */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-gray-900 mb-1">店舗・料理写真</h3>
                <p className="text-sm text-gray-400 mb-5">最大8枚の写真をアップロード</p>
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
                      <span className="text-xs">写真を追加</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-1">
                  <Tag className="w-4 h-4 text-blue-400" />
                  <h3 className="text-gray-900">料理タグ</h3>
                </div>
                <p className="text-sm text-gray-400 mb-4">お店の料理に合うタグを選択してください</p>
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
                  前へ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 text-white rounded-xl text-sm transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
                >
                  店舗を登録する
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
