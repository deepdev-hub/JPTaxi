import React, { createContext, useContext, useState, ReactNode } from "react";
import { createUser, getUserByEmail, updateUser } from "../api/client";
import type { User } from "../types";

interface AuthContextType {
  currentUser: User | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  signup: (email: string, password: string, name: string, role: "diner" | "owner") => Promise<boolean>;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const login = async (email: string, password: string): Promise<boolean> => {
    if (!email || !password) return false;

    try {
      const user = await getUserByEmail(email);
      setCurrentUser(user);
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const signup = async (email: string, password: string, name: string, role: "diner" | "owner"): Promise<boolean> => {
    if (!email || !password || !name) return false;

    try {
      const newUser = await createUser({ name, email, password, role });
      setCurrentUser(newUser);
      return true;
    } catch {
      return false;
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
        login,
        logout,
        signup,
        updateProfile,
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
