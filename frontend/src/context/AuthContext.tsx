"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface IUser {
  id: string;
  name: string;
  email: string;
  role: "Guest" | "Host" | "Admin";
  avatar: string;
}

interface IAuthContext {
  user: IUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserRole: (newRole: "Guest" | "Host" | "Admin") => void;
}

const AuthContext = createContext<IAuthContext | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize: Check if access token exists in session
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
          },
        });
        const data = await res.json();
        if (res.ok && data.status === "success") {
          setUser(data.user);
          setToken(localStorage.getItem("accessToken"));
        } else {
          // Attempt refresh
          const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          });
          const refreshData = await refreshRes.json();
          if (refreshRes.ok && refreshData.status === "success") {
            localStorage.setItem("accessToken", refreshData.accessToken);
            setToken(refreshData.accessToken);
            
            // Re-fetch profile
            const meRes = await fetch(`${API_URL}/auth/me`, {
              headers: { Authorization: `Bearer ${refreshData.accessToken}` },
            });
            const meData = await meRes.json();
            if (meRes.ok) setUser(meData.user);
          }
        }
      } catch (err) {
        console.error("Auth context initialization failed", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to login");
    }

    localStorage.setItem("accessToken", data.accessToken);
    setToken(data.accessToken);
    setUser(data.user);
  };

  const signup = async (name: string, email: string, password: string, role: string) => {
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to signup");
    }

    localStorage.setItem("accessToken", data.accessToken);
    setToken(data.accessToken);
    setUser(data.user);
  };

  const googleLogin = async (idToken: string) => {
    const res = await fetch(`${API_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to authenticate with Google");
    }

    localStorage.setItem("accessToken", data.accessToken);
    setToken(data.accessToken);
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
      });
    } catch (err) {
      console.error("Logout network call error", err);
    } finally {
      localStorage.removeItem("accessToken");
      setToken(null);
      setUser(null);
    }
  };

  const updateUserRole = (newRole: "Guest" | "Host" | "Admin") => {
    if (user) {
      setUser({ ...user, role: newRole });
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, googleLogin, logout, updateUserRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
