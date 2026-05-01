import type { Conversation, MenuItem, Message, Restaurant, Review, Role, User } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8081/api";

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

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export function getRestaurants(ownerId?: string) {
  const query = ownerId ? `?ownerId=${encodeURIComponent(ownerId)}` : "";
  return request<Restaurant[]>(`/restaurants${query}`);
}

export function getRestaurant(id: string) {
  return request<Restaurant>(`/restaurants/${encodeURIComponent(id)}`);
}

export function getFoodTags() {
  return request<string[]>("/restaurants/tags");
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

export function getReviews(restaurantId?: string) {
  const query = restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : "";
  return request<Review[]>(`/reviews${query}`);
}

export function createReview(data: {
  restaurantId: string;
  userId: string;
  rating: number;
  comment: string;
  images: string[];
}) {
  return request<Review>("/reviews", {
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

export function getConversations(userId: string) {
  return request<Conversation[]>(`/conversations?userId=${encodeURIComponent(userId)}`);
}

export function getMessages(userId: string) {
  return request<Message[]>(`/messages?userId=${encodeURIComponent(userId)}`);
}

export function createMessage(data: {
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
