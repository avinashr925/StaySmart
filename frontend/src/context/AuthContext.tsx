"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface IUser {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  name: string;
  email: string;
  role: "Guest" | "Host" | "PropertyManager" | "Admin" | "SuperAdmin";
  avatar?: string;
  profilePhoto?: string;
  phoneNumber?: string;
  phone?: string;
  bio?: string;
  work?: string;
  address?: string;
  languages?: string[];
  country?: string;
  state?: string;
  city?: string;
  dob?: string;
  lastLogin?: string;
  paymentProfile?: {
    provider: string;
    linkedAccountId?: string;
    status: "NOT_STARTED" | "PENDING" | "VERIFICATION_PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";
  };
  bankDetails?: {
    accountHolderName?: string;
    accountNumberMasked?: string;
    bankName?: string;
    upiId?: string;
    upiQrCodeUrl?: string;
  };
  isOnboarded?: boolean;
  gstDetails?: {
    isRegistered: boolean;
    gstin?: string;
    legalBusinessName?: string;
    registeredAddress?: string;
  };
  defaultHouseRules?: {
    smokingAllowed?: boolean;
    petsAllowed?: boolean;
    partiesAllowed?: boolean;
    childrenAllowed?: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    checkInFrom?: string;
    checkInUntil?: string;
    checkOutBy?: string;
    customRules?: string[];
  };
  loginHistory?: Array<{
    ip: string;
    device: string;
    browser: string;
    os: string;
    loginAt: string;
  }>;
}

interface IAuthContext {
  user: IUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signup: (payload: {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    password: string;
    role: string;
  }) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserRole: (newRole: "Guest" | "Host" | "PropertyManager" | "Admin" | "SuperAdmin") => void;
  refreshUser: () => Promise<void>;
  connectionError: "network" | "server" | "unauthorized" | "forbidden" | "not_found" | null;
}

const AuthContext = createContext<IAuthContext | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<"network" | "server" | "unauthorized" | "forbidden" | "not_found" | null>(null);

  const handleHttpStatusError = (status: number) => {
    if (status === 401) {
      setConnectionError("unauthorized");
      localStorage.removeItem("accessToken");
      setToken(null);
      setUser(null);
    } else if (status === 403) {
      setConnectionError("forbidden");
    } else if (status === 404) {
      setConnectionError("not_found");
    } else if (status >= 500) {
      setConnectionError("server");
    }
  };

  // Initialize: Check if access token exists in session
  useEffect(() => {
    const fetchMe = async () => {
      setConnectionError(null);
      try {
        const tokenVal = localStorage.getItem("accessToken");
        if (!tokenVal) {
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${tokenVal}`,
          },
          credentials: "include",
        });

        if (res.status === 401) {
          // Attempt refresh
          const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          });

          if (refreshRes.status === 401) {
            handleHttpStatusError(401);
            setLoading(false);
            return;
          }

          if (!refreshRes.ok) {
            handleHttpStatusError(refreshRes.status);
            setLoading(false);
            return;
          }

          const refreshData = await refreshRes.json();
          if (refreshData.status === "success" && refreshData.accessToken) {
            localStorage.setItem("accessToken", refreshData.accessToken);
            setToken(refreshData.accessToken);
            
            // Re-fetch profile
            const meRes = await fetch(`${API_URL}/auth/me`, {
              headers: { Authorization: `Bearer ${refreshData.accessToken}` },
            });

            if (!meRes.ok) {
              handleHttpStatusError(meRes.status);
              setLoading(false);
              return;
            }

            const meData = await meRes.json();
            if (meData.status === "success") {
              setUser(meData.user);
            }
          }
          setLoading(false);
          return;
        }

        if (!res.ok) {
          handleHttpStatusError(res.status);
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (data.status === "success") {
          setUser(data.user);
          setToken(tokenVal);
        }
      } catch (err) {
        console.error("Auth context initialization failed", err);
        setConnectionError("network");
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, []);

  const login = async (email: string, password: string, rememberMe?: boolean) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, rememberMe }),
      credentials: "include",
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to login");
    }

    localStorage.setItem("accessToken", data.accessToken);
    setToken(data.accessToken);
    setUser(data.user);
  };

  const signup = async (payload: {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    password: string;
    role: string;
  }) => {
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to signup");
    }
  };

  const googleLogin = async (idToken: string) => {
    const res = await fetch(`${API_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      credentials: "include",
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
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout network call error", err);
    } finally {
      localStorage.removeItem("accessToken");
      setToken(null);
      setUser(null);
    }
  };

  const updateUserRole = async (newRole: "Guest" | "Host" | "PropertyManager" | "Admin" | "SuperAdmin") => {
    if (user) {
      setUser({ ...user, role: newRole });
      try {
        await fetch(`${API_URL}/auth/profile`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
          },
          body: JSON.stringify({ role: newRole }),
        });
      } catch (err) {
        console.error("Failed to sync role to database", err);
      }
    }
  };

  const refreshUser = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
        },
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setUser(data.user);
      }
    } catch (err) {
      console.error("Refresh user failed", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, googleLogin, logout, updateUserRole, refreshUser, connectionError }}>
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
