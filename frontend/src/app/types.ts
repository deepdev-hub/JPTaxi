export type Role = "guest" | "diner" | "owner" | "admin";

export interface User {
  id: string;
  name: string;
  nameJp?: string;
  email: string;
  phone?: string;
  address?: string;
  role: Role;
  avatar?: string;
}

export interface MenuItem {
  id: string;
  nameVn: string;
  nameJp: string;
  price: number;
  description?: string;
  image?: string;
}

export interface Review {
  id: string;
  restaurantId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  date: string;
  images?: string[];
  likes: number;
  dislikes: number;
  userLiked?: boolean;
  userDisliked?: boolean;
}

export interface Restaurant {
  id: string;
  ownerId: string;
  nameVn: string;
  nameJp: string;
  address: string;
  addressJp?: string;
  phone: string;
  description: string;
  descriptionJp?: string;
  coverImage: string;
  images: string[];
  menu: MenuItem[];
  openHours: string;
  priceRange: string;
  avgPrice: number;
  tags: string[];
  rating: number;
  reviewCount: number;
  distance?: number;
  status: "draft" | "open" | "closed" | "hidden" | "deleted";
  lat: number;
  lng: number;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  restaurantId?: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage: string;
  lastTimestamp: string;
  restaurantId?: string;
  restaurantName?: string;
}
