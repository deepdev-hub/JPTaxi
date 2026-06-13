import type { Conversation, MenuItem, Message, Restaurant, Review, Role, User } from "../types";

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:8081/api";
const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, "");
const rawPublicAppUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim() || "";
const PUBLIC_APP_URL = rawPublicAppUrl.replace(/\/+$/, "");

function buildApiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getPublicAppUrl() {
  if (PUBLIC_APP_URL) return PUBLIC_APP_URL;
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return "http://localhost:5173";
}

const DEFAULT_FOOD_TAGS = [
  "Phở/フォー",
  "Bò/牛肉",
  "Gà/鶏肉",
  "Bún chả/ブンチャー",
  "Bánh mì/バインミー",
  "Chả cá/チャーカー",
  "Nem/ネム",
  "Cơm/ご飯",
  "Hải sản/海鮮",
  "Chay/ベジタリアン",
  "Truyền thống/伝統的",
  "Nhanh/早い",
  "Rẻ/安い",
  "Sáng/朝食",
  "Trưa/昼食",
  "Tối/夕食",
];

export interface SaveRestaurantPayload {
  ownerId?: string;
  nameVn: string;
  nameJp: string;
  address: string;
  addressJp?: string;
  phone: string;
  description: string;
  descriptionJp?: string;
  coverImage?: string;
  images: string[];
  menu: MenuItem[];
  openHours: string;
  priceRange?: string;
  avgPrice: number;
  tags: string[];
  status: Restaurant["status"];
  lat?: number;
  lng?: number;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `API request failed: ${response.status} ${response.statusText}`;

    try {
      const errorText = await response.text();
      if (errorText) {
        try {
          const errorBody = JSON.parse(errorText);
          if (errorBody?.message) message = errorBody.message;
          else if (errorBody?.error) message = errorBody.error;
          else message = errorText;
        } catch {
          message = errorText;
        }
      }
    } catch {
      // Keep the HTTP status message when the backend does not return JSON.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  return parseResponse<T>(response);
}

async function requestForm<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    method: "POST",
    body: formData,
  });

  return parseResponse<T>(response);
}

export function getRestaurants(ownerId?: string) {
  const query = ownerId ? `?ownerId=${encodeURIComponent(ownerId)}` : "";
  return request<Restaurant[]>(`/restaurants${query}`);
}

export function getRestaurant(id: string) {
  return request<Restaurant>(`/restaurants/${encodeURIComponent(id)}`);
}

export async function getFoodTags() {
  try {
    const tags = await request<string[]>("/restaurants/tags");
    return mergeFoodTags(tags);
  } catch {
    return DEFAULT_FOOD_TAGS;
  }
}

function mergeFoodTags(tags: string[]) {
  const normalizedTags = tags
    .filter((tag) => tag && tag.trim())
    .map((tag) => tag.trim());

  return Array.from(new Set([...normalizedTags, ...DEFAULT_FOOD_TAGS]));
}

export function createRestaurant(data: SaveRestaurantPayload) {
  return request<Restaurant>("/restaurants", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateRestaurant(id: string, data: SaveRestaurantPayload) {
  return request<Restaurant>(`/restaurants/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function uploadRestaurantImages(imageFiles: File[]) {
  return uploadImagesInChunks("/restaurants/images", imageFiles, 8);
}

async function uploadImagesInChunks(path: string, imageFiles: File[], chunkSize: number) {
  const uploadedUrls: string[] = [];

  for (let index = 0; index < imageFiles.length; index += chunkSize) {
    const formData = new FormData();
    imageFiles
      .slice(index, index + chunkSize)
      .forEach((file) => formData.append("images", file));
    const chunkUrls = await requestForm<string[]>(path, formData);
    uploadedUrls.push(...chunkUrls);
  }

  return uploadedUrls;
}

export function uploadMenuImage(imageFile: File) {
  const formData = new FormData();
  formData.append("image", imageFile);
  return requestForm<{ url: string }>("/restaurants/menu-images", formData);
}

export function uploadAvatarImage(userId: string, imageFile: File) {
  const formData = new FormData();
  formData.append("userId", userId);
  formData.append("image", imageFile);
  return requestForm<User>("/users/avatar", formData);
}

export function getReviews(restaurantId?: string, userId?: string) {
  const params = new URLSearchParams();
  if (restaurantId) params.set("restaurantId", restaurantId);
  if (userId) params.set("userId", userId);
  const query = params.toString() ? `?${params.toString()}` : "";
  return request<Review[]>(`/reviews${query}`);
}

export function createReview(data: {
  restaurantId: string;
  userId: string;
  rating: number;
  comment: string;
  images?: string[];
  imageFiles?: File[];
}) {
  if (data.imageFiles && data.imageFiles.length > 0) {
    const formData = new FormData();
    formData.append("restaurantId", data.restaurantId);
    formData.append("userId", data.userId);
    formData.append("rating", String(data.rating));
    formData.append("comment", data.comment);
    data.imageFiles.forEach((file) => formData.append("images", file));
    return requestForm<Review>("/reviews", formData);
  }

  return request<Review>("/reviews", {
    method: "POST",
    body: JSON.stringify({
      restaurantId: data.restaurantId,
      userId: data.userId,
      rating: data.rating,
      comment: data.comment,
      images: data.images ?? [],
    }),
  });
}

export function reactToReview(reviewId: string, data: { userId: string; reactionType: "like" | "dislike" }) {
  return request<Review>(`/reviews/${encodeURIComponent(reviewId)}/reaction`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getUsers() {
  return request<User[]>("/users");
}

export function getUserByEmail(email: string) {
  return request<User>(`/users/by-email?email=${encodeURIComponent(email)}`);
}

export function loginUser(data: { email: string; password: string }) {
  return request<User>("/users/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: Exclude<Role, "guest">;
}) {
  return request<User>("/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateUser(id: string, data: Partial<User> & { password?: string }) {
  return request<User>(`/users/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function requestPasswordReset(data: { email: string }) {
  return request<{ message: string }>("/users/forgot-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function resetPassword(data: { token: string; newPassword: string }) {
  return request<User>("/users/reset-password", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getConversations(userId: string) {
  return request<Conversation[]>(`/conversations?userId=${encodeURIComponent(userId)}`);
}

export function createConversation(data: {
  userId: string;
  receiverId?: string;
  restaurantId?: string;
}) {
  return request<Conversation>("/conversations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getMessages(userId: string, conversationId?: string) {
  const params = new URLSearchParams({ userId });
  if (conversationId) params.set("conversationId", conversationId);
  return request<Message[]>(`/messages?${params.toString()}`);
}

export function createMessage(data: {
  conversationId?: string;
  senderId: string;
  receiverId: string;
  restaurantId?: string;
  content: string;
}) {
  return request<Message>("/messages", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
