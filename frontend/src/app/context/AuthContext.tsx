import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { createUser, loginUser, updateUser } from "../api/client";
import type { User } from "../types";

interface AuthContextType {
  currentUser: User | null;
  isLoggedIn: boolean;
  userLocation: { lat: number; lng: number } | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  signup: (email: string, password: string, name: string, role: "diner" | "owner") => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  syncCurrentUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("currentUser");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          (error) => {
            console.error("Error getting location:", error);
          }
        );
      }
    } else {
      localStorage.removeItem("currentUser");
      setUserLocation(null);
    }
  }, [currentUser]);

  const login = async (email: string, password: string): Promise<boolean> => {
    if (!email || !password) return false;

    try {
      const user = await loginUser({ email, password });
      setCurrentUser(user);
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const syncCurrentUser = (user: User) => {
    setCurrentUser(user);
  };

  const signup = async (email: string, password: string, name: string, role: "diner" | "owner"): Promise<{ success: boolean; error?: string }> => {
    if (!email || !password || !name) return { success: false, error: "Missing required fields" };

    try {
      const newUser = await createUser({ name, email, password, role });
      setCurrentUser(newUser);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to create account" };
    }
  };

  const updateProfile = async (data: Partial<User>): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const savedUser = await updateUser(currentUser.id, data);
      setCurrentUser(savedUser);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoggedIn: currentUser !== null,
        userLocation,
        login,
        logout,
        signup,
        updateProfile,
        syncCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
