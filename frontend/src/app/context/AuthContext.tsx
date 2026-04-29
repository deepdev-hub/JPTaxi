import React, { createContext, useContext, useState, ReactNode } from "react";
import { User, mockUsers } from "../data/mockData";

interface AuthContextType {
  currentUser: User | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  signup: (email: string, password: string, name: string, role: "diner" | "owner") => boolean;
  updateProfile: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const login = (email: string, password: string): boolean => {
    // Mock login - accept any password, just match email
    const user = mockUsers.find((u) => u.email === email);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    // Allow demo login
    if (email && password) {
      setCurrentUser(mockUsers[0]);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const signup = (email: string, password: string, name: string, role: "diner" | "owner"): boolean => {
    const newUser: User = {
      id: `u${Date.now()}`,
      name,
      email,
      role,
    };
    setCurrentUser(newUser);
    return true;
  };

  const updateProfile = (data: Partial<User>) => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, ...data });
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
