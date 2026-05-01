import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import {
  ChevronLeft, Save, Upload, Plus, X, CheckCircle, ToggleLeft, ToggleRight
} from "lucide-react";
import { getFoodTags, getRestaurant, updateRestaurant } from "../api/client";
import type { MenuItem, Restaurant } from "../types";
import { useAuth } from "../context/AuthContext";
import { useApiData } from "../hooks/useApiData";

export function ManageRestaurantPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
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

  const sampleImages = [
    "https://images.unsplash.com/photo-1677837914128-2367031a11e7?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1761409260819-c6da12bbb2c0?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1763703544688-2ac7839b0659?w=600&h=400&fit=crop",
  ];

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
          Restaurant not found
        </Link>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;

    try {
      setSaving(true);
      const savedRestaurant = await updateRestaurant(restaurant.id, {
        ownerId: restaurant.ownerId,
        nameVn: formData.nameVn,
        nameJp: formData.nameJp,
        address: formData.address,
        addressJp: restaurant.addressJp,
        phone: formData.phone,
        description: formData.description,
        descriptionJp: formData.descriptionJp,
        coverImage: images[0] || restaurant.coverImage,
        images,
        menu: menuItems.filter((item) => item.nameVn.trim()),
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
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
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
    setMenuItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addSampleImage = () => {
    if (images.length < 8) {
      setImages((prev) => [...prev, sampleImages[prev.length % sampleImages.length]]);
    }
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
              戻る
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-700 truncate">{restaurant.nameJp}</span>
          </div>
          <Link
            to={`/restaurant/${restaurant.id}`}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            公開ページ →
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
                <h2 className="text-white">{restaurant.nameJp}</h2>
                <p className="text-white/70 text-xs">{restaurant.nameVn}</p>
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
                {formData.status === "open" ? "営業中" : "閉店"}
              </button>
            </div>
          </div>
        </div>

        {/* Saved notification */}
        {saved && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
            <CheckCircle className="w-4 h-4" />
            変更を保存しました！
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(["basic", "menu", "photos"] as const).map((tab) => {
            const labels = { basic: "基本情報", menu: "メニュー", photos: "写真・タグ" };
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
                  <label className="block text-sm text-gray-700 mb-1.5">店名（ベトナム語）</label>
                  <input
                    type="text"
                    value={formData.nameVn}
                    onChange={(e) => setFormData({ ...formData, nameVn: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">店名（日本語）</label>
                  <input
                    type="text"
                    value={formData.nameJp}
                    onChange={(e) => setFormData({ ...formData, nameJp: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1.5">住所</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1.5">電話番号</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">営業時間</label>
                  <input
                    type="text"
                    value={formData.openHours}
                    onChange={(e) => setFormData({ ...formData, openHours: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">平均単価 (VND)</label>
                  <input
                    type="number"
                    value={formData.avgPrice}
                    onChange={(e) => setFormData({ ...formData, avgPrice: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1.5">説明（ベトナム語）</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1.5">説明（日本語）</label>
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
                変更を保存
              </button>
            </div>
          )}

          {/* Menu */}
          {activeTab === "menu" && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-gray-900">メニュー管理</h3>
                <button
                  type="button"
                  onClick={addMenuItem}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4" />
                  追加
                </button>
              </div>
              <div className="space-y-3">
                {menuItems.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={item.nameVn}
                        onChange={(e) => updateMenuItem(index, "nameVn", e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 bg-white"
                      />
                      <input
                        type="text"
                        value={item.nameJp}
                        onChange={(e) => updateMenuItem(index, "nameJp", e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 bg-white"
                      />
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateMenuItem(index, "price", e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 bg-white"
                        placeholder="価格"
                      />
                      <input
                        type="text"
                        value={item.description || ""}
                        onChange={(e) => updateMenuItem(index, "description", e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 bg-white"
                        placeholder="説明"
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
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 mt-5 text-white rounded-xl text-sm transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
              >
                <Save className="w-4 h-4" />
                メニューを保存
              </button>
            </div>
          )}

          {/* Photos & Tags */}
          {activeTab === "photos" && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-gray-900 mb-4">写真管理</h3>
                <div className="grid grid-cols-2 gap-3">
                  {images.map((img, i) => (
                    <div key={i} className="aspect-video rounded-xl overflow-hidden relative group">
                      <img src={img} alt="restaurant" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImages(images.filter((_, index) => index !== i))}
                        className="absolute top-2 right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addSampleImage}
                    className="aspect-video rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-blue-300 hover:text-blue-400 transition-colors"
                  >
                    <Upload className="w-6 h-6" />
                    <span className="text-xs">写真を追加</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-gray-900 mb-4">料理タグ</h3>
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
                変更を保存
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
