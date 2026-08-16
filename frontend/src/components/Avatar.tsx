"use client";

import React from "react";
import { User } from "lucide-react";

interface UserAvatarProps {
  user?: {
    name?: string;
    avatar?: string;
    firstName?: string;
    lastName?: string;
  } | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export default function UserAvatar({ user, size = "md", className = "" }: UserAvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8 text-[10px]",
    md: "h-10 w-10 text-xs",
    lg: "h-14 w-14 text-base",
    xl: "h-20 w-20 text-xl",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-7 w-7",
    xl: "h-10 w-10",
  };

  const isPlaceholderOrEmpty = (url?: string) => {
    if (!url || url.trim() === "") return true;
    // Check if it's the old default Unsplash placeholder
    return url.includes("unsplash.com") && url.includes("photo-1535713875002-d1d0cf377fde");
  };

  if (!user || isPlaceholderOrEmpty(user.avatar)) {
    // Generate initials dynamically
    let initials = "";
    if (user?.firstName || user?.lastName) {
      initials = ((user.firstName?.[0] || "") + (user.lastName?.[0] || "")).toUpperCase();
    } else if (user?.name) {
      const parts = user.name.trim().split(/\s+/);
      if (parts.length > 1) {
        initials = ((parts[0]?.[0] || "") + (parts[parts.length - 1]?.[0] || "")).toUpperCase();
      } else {
        initials = (parts[0]?.[0] || "").toUpperCase();
      }
    }

    return (
      <div
        className={`rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold font-outfit uppercase shrink-0 border border-rose-200/40 dark:border-rose-900/30 transition ${sizeClasses[size]} ${className}`}
      >
        {initials || <User className={iconSizes[size]} />}
      </div>
    );
  }

  // If the user has a real avatar URL (local or Cloudinary or Google photo)
  // Ensure we append the API host if it is a local path (starts with /uploads)
  const avatar = user.avatar || "";
  const avatarUrl = avatar.startsWith("/uploads")
    ? (process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace("/api", "") : "http://localhost:8080") + avatar
    : avatar;

  return (
    <img
      src={avatarUrl}
      alt={user.name || "User Avatar"}
      className={`rounded-full object-cover shrink-0 border border-zinc-200/50 dark:border-zinc-800/50 ${sizeClasses[size]} ${className}`}
    />
  );
}
