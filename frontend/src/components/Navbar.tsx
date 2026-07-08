"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sun, Moon, Search, User, LogOut, Compass, LayoutDashboard, Heart, Calendar } from "lucide-react";
import AuthModal from "./AuthModal";

export default function Navbar() {
  const { user, logout, updateUserRole } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  // Dark Mode Toggle
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    }
  }, []);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDarkMode(true);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const toggleRole = () => {
    if (!user) return;
    const nextRole = user.role === "Host" ? "Guest" : "Host";
    updateUserRole(nextRole);
    router.push(nextRole === "Host" ? "/dashboard/host" : "/dashboard/guest");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-1.5 font-outfit text-2xl font-bold tracking-tight text-rose-500">
            <span className="bg-rose-500 text-white p-1 rounded-lg">SS</span>
            <span>StaySmart</span>
          </Link>
        </div>

        {/* Semantic Search Bar */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center relative w-full max-w-md mx-4">
          <input
            type="text"
            placeholder="Try: 'villa with pool under 6000'..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-2 rounded-full border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
          />
          <button type="submit" className="absolute right-3 text-zinc-500 hover:text-rose-500">
            <Search className="h-4 w-4" />
          </button>
        </form>

        {/* Right Menu Controls */}
        <div className="flex items-center gap-4">
          
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            aria-label="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {/* User Session Handler */}
          {user ? (
            <div className="relative">
              <div className="flex items-center gap-3">
                
                {/* Mode Switcher pill */}
                <button
                  onClick={toggleRole}
                  className="hidden sm:inline-block px-3.5 py-1.5 rounded-full text-xs font-semibold border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  Switch to {user.role === "Host" ? "Guest" : "Host"} Mode
                </button>

                {/* Profile Circle Dropdown Trigger */}
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 p-1 border border-zinc-200 dark:border-zinc-800 rounded-full hover:shadow-sm focus:outline-none"
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                  <span className="hidden sm:inline text-sm font-medium pr-2 text-zinc-700 dark:text-zinc-300">
                    {user.name.split(" ")[0]}
                  </span>
                </button>
              </div>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2.5 w-52 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg py-2 z-50 text-sm">
                  <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800">
                    <p className="font-semibold text-zinc-800 dark:text-zinc-100 truncate">{user.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-300 text-[10px] font-bold">
                      {user.role} Profile
                    </span>
                  </div>

                  <Link
                    href={user.role === "Host" ? "/dashboard/host" : "/dashboard/guest"}
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>

                  <Link
                    href="/dashboard/guest"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Bookings</span>
                  </Link>

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-rose-500 transition text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => openAuth("login")}
                className="px-4 py-2 rounded-full text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                Log In
              </button>
              <button
                onClick={() => openAuth("signup")}
                className="px-4 py-2 rounded-full text-sm font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-sm transition"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Search Bar for Mobile */}
      <div className="md:hidden px-4 pb-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center relative w-full">
          <input
            type="text"
            placeholder="Try: 'beach villa under 6000'..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-2 rounded-full border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
          />
          <button type="submit" className="absolute right-3 text-zinc-500">
            <Search className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* Auth Modal Trigger */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
      />
    </header>
  );
}
