"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import UserAvatar from "@/components/Avatar";
import AiAssistant from "@/components/AiAssistant";
import { bookingsApi, wishlistApi, authApi, paymentsApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import {
  Calendar,
  Heart,
  Image as ImageIcon,
  Trash2,
  ShieldAlert,
  ArrowRight,
  UserCircle,
  Star,
  Monitor,
  Smartphone,
  Laptop,
  Globe,
  FileText,
  X,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface IBooking {
  _id: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: string;
  listing: {
    _id: string;
    title: string;
    images: string[];
    price: number;
    city: string;
    country: string;
  } | null;
}

interface IWishlist {
  listings: {
    _id: string;
    title: string;
    images: string[];
    price: number;
    city: string;
    country: string;
    rating: number;
  }[];
}

interface ISession {
  _id: string;
  deviceType: string;
  browser: string;
  os: string;
  ipAddress: string;
  lastActive: string;
}

export default function GuestDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<IBooking[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("Please sign in to continue.");
      router.push("/login");
    }
  }, [user, authLoading]);
  const [wishlist, setWishlist] = useState<IWishlist | null>(null);
  const [sessions, setSessions] = useState<ISession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [refundPreview, setRefundPreview] = useState<any | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Copy Account ID
  const copyAccountId = () => {
    if (!user?.id) return;
    navigator.clipboard.writeText(user.id);
    toast.success("Account ID copied to clipboard!");
  };

  // Download QR PNG
  const downloadQRCode = async () => {
    if (!user) return;
    try {
      const qrData = `staysmart:user:${user.id}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const blobURL = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobURL;
      link.download = `staysmart-qr-${(user as any).username || user.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobURL);
      toast.success("QR Code downloaded successfully!");
    } catch (err) {
      toast.error("Failed to download QR code image");
    }
  };

  // Calculate Profile Completion %
  const getProfileCompletion = () => {
    if (!user) return 0;
    let score = 0;
    // We cast to any in typescript for extended schema fields
    const u = user as any;
    if (u.firstName) score += 15;
    if (u.lastName) score += 15;
    if (u.username) score += 15;
    if (u.email) score += 15;
    if (u.avatar || u.profilePhoto) score += 15;
    if (u.phoneNumber || u.phone) score += 15;
    if (u.bio) score += 10;
    return score;
  };
  const completionPercentage = getProfileCompletion();

  // Edit Profile States
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editState, setEditState] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editDob, setEditDob] = useState("");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [tempAvatar, setTempAvatar] = useState<string | null>(null);
  const [removeAvatarFlag, setRemoveAvatarFlag] = useState(false);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Avatar size limit is 5MB");
        return;
      }
      setAvatarFile(file);
      setTempAvatar(URL.createObjectURL(file));
      setRemoveAvatarFlag(false);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setTempAvatar(null);
    setRemoveAvatarFlag(true);
  };

  // Initialize fields on open
  useEffect(() => {
    if (user) {
      setEditFirstName(user.firstName || "");
      setEditLastName(user.lastName || "");
      setEditUsername(user.username || "");
      setEditPhone(user.phoneNumber || user.phone || "");
      setEditBio(user.bio || "");
      setEditCountry(user.country || "");
      setEditState(user.state || "");
      setEditCity(user.city || "");
      if (user.dob) {
        setEditDob(new Date(user.dob).toISOString().split("T")[0]);
      } else {
        setEditDob("");
      }
      setAvatarFile(null);
      setTempAvatar(null);
      setRemoveAvatarFlag(false);
    }
  }, [user, showEditProfileModal]);

  // Profile Save action
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSubmitting(true);
    try {
      let currentAvatarUrl = (user as any)?.avatar;
      
      if (removeAvatarFlag) {
        const delRes = await authApi.removeAvatar();
        if (delRes.status === "success") {
          currentAvatarUrl = "";
        }
      } else if (avatarFile) {
        const formData = new FormData();
        formData.append("avatar", avatarFile);
        const uploadRes = await authApi.uploadAvatar(formData);
        if (uploadRes.status === "success") {
          currentAvatarUrl = uploadRes.avatar;
        } else {
          toast.error(uploadRes.message || "Failed to upload avatar");
          return;
        }
      }

      const res = await authApi.updateProfile({
        firstName: editFirstName,
        lastName: editLastName,
        username: editUsername,
        phone: editPhone,
        bio: editBio,
        country: editCountry,
        state: editState,
        city: editCity,
        dob: editDob,
        avatar: currentAvatarUrl,
      });

      if (res.status === "success") {
        toast.success("Profile updated successfully!");
        setShowEditProfileModal(false);
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      } else {
        toast.error(res.message || "Failed to update profile");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error");
    } finally {
      setEditSubmitting(false);
    }
  };

  // Invoice modal state
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);


  const loadDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const bookingsRes = await bookingsApi.getGuestBookings();
      if (bookingsRes.status === "success") {
        setBookings(bookingsRes.data.bookings || []);
      }

      const wishlistRes = await wishlistApi.get();
      if (wishlistRes.status === "success") {
        setWishlist(wishlistRes.data.wishlist);
      }

      const sessionsRes = await authApi.getSessions();
      if (sessionsRes.status === "success") {
        setSessions(sessionsRes.data.sessions || []);
      }
    } catch (err) {
      toast.error("Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const handleOpenCancelModal = async (bookingId: string) => {
    setCancelBookingId(bookingId);
    setPreviewLoading(true);
    setShowCancelModal(true);
    setRefundPreview(null);
    try {
      const res = await bookingsApi.getRefundPreview(bookingId);
      if (res.status === "success") {
        setRefundPreview(res.data);
      } else {
        toast.error("Failed to load refund breakdown");
        setShowCancelModal(false);
      }
    } catch (err) {
      toast.error("Error fetching cancellation policy details");
      setShowCancelModal(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelBookingId) return;
    setCancelLoading(true);
    try {
      const res = await bookingsApi.cancel(cancelBookingId);
      if (res.status === "success") {
        toast.success("Reservation cancelled successfully");
        setShowCancelModal(false);
        setRefundPreview(null);
        setCancelBookingId(null);
        loadDashboardData();
      } else {
        toast.error(res.message || "Failed to cancel booking");
      }
    } catch (err) {
      toast.error("Cancellation transaction failed");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleRemoveWishlist = async (listingId: string) => {
    try {
      const res = await wishlistApi.toggle(listingId);
      if (res.status === "success") {
        toast.success("Removed from wishlist");
        loadDashboardData();
      }
    } catch (err) {
      toast.error("Failed to remove item");
    }
  };

  // Revoke device session
  const handleRevokeSession = async (sessionId: string) => {
    try {
      const res = await authApi.revokeSession(sessionId);
      if (res.status === "success") {
        toast.success("Device revoked successfully");
        loadDashboardData();
      }
    } catch (err) {
      toast.error("Failed to revoke session");
    }
  };

  // Revoke all other device sessions
  const handleRevokeOthers = async () => {
    if (!confirm("Are you sure you want to log out all other devices?")) return;
    try {
      const res = await authApi.revokeOtherSessions();
      if (res.status === "success") {
        toast.success("All other sessions revoked successfully");
        loadDashboardData();
      }
    } catch (err) {
      toast.error("Failed to revoke other sessions");
    }
  };

  // Trigger invoice retrieval
  const handleShowInvoice = async (bookingId: string) => {
    try {
      const res = await paymentsApi.getInvoice(bookingId);
      if (res.status === "success") {
        setSelectedInvoice(res.data.invoice);
        setShowInvoiceModal(true);
      } else {
        toast.error("Invoice is currently processing or unavailable.");
      }
    } catch (err) {
      toast.error("Failed to load invoice receipt.");
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Navbar />
        <main className="flex-1 max-w-md mx-auto px-4 py-32 text-center space-y-4">
          <UserCircle className="h-16 w-16 text-rose-500 mx-auto" />
          <h2 className="font-outfit text-2xl font-bold">Access Denied</h2>
          <p className="text-zinc-500 text-xs">Please sign in or create an account to view your Guest Dashboard.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Card Header */}
        <div className="mb-8 flex flex-col sm:flex-row items-center gap-6 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl bg-white dark:bg-zinc-900 shadow-sm">
          <UserAvatar user={user} size="lg" className="ring-2 ring-rose-500" />
          <div className="space-y-1 text-center sm:text-left flex-1">
            <h1 className="font-outfit text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Welcome, {user.name}
            </h1>
            <p className="text-xs text-zinc-500">{user.email} • Guest Profile</p>
          </div>
          <button
            onClick={() => setShowEditProfileModal(true)}
            className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            Edit Profile
          </button>
        </div>

        {/* Dashboard Sections Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Booking Column */}
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <h2 className="font-outfit text-xl font-bold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-rose-500" />
                <span>Your Reservations ({bookings.length})</span>
              </h2>

              {loading ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
                  <div className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
                </div>
              ) : bookings.length === 0 ? (
                <div className="p-8 text-center border border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900/50">
                  <p className="text-zinc-500 text-xs mb-3">You don't have any bookings reserved.</p>
                  <a
                    href="/"
                    className="inline-block px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-full hover:bg-indigo-700"
                  >
                    Explore Stays
                  </a>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => {
                    const listing = booking.listing;
                    if (!listing) return null;

                    return (
                      <div
                        key={booking._id}
                        className="border border-zinc-200 dark:border-zinc-800 p-4 rounded-3xl bg-white dark:bg-zinc-900 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center hover:shadow-sm transition"
                      >
                        <div className="flex gap-4">
                          {listing.images && listing.images.length > 0 ? (
                            <img
                              src={listing.images[0]}
                              alt={listing.title}
                              className="h-20 w-20 rounded-2xl object-cover shrink-0"
                            />
                          ) : (
                            <div className="h-20 w-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex flex-col items-center justify-center font-bold text-[8px] uppercase tracking-wider shrink-0 border border-zinc-200 dark:border-zinc-800">
                              📸 No photos
                            </div>
                          )}
                          <div className="space-y-1">
                            <h3
                              onClick={() => window.location.href = `/listings/${listing._id}`}
                              className="font-bold text-sm text-zinc-900 dark:text-zinc-50 hover:underline cursor-pointer"
                            >
                              {listing.title}
                            </h3>
                            <p className="text-xs text-zinc-500">
                              {listing.city}, {listing.country}
                            </p>
                            <div className="flex gap-1 items-center text-[10px] text-zinc-400">
                              <span>{new Date(booking.startDate).toLocaleDateString()}</span>
                              <ArrowRight className="h-3 w-3" />
                              <span>{new Date(booking.endDate).toLocaleDateString()}</span>
                            </div>
                            <div>
                              <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400">₹{booking.totalPrice}</span>
                              <span className="text-[10px] text-zinc-500"> total</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-100 dark:border-zinc-800">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                              booking.status === "Cancelled"
                                ? "bg-red-100 dark:bg-red-950/45 text-red-600 dark:text-red-400"
                                : "bg-emerald-100 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {booking.status}
                          </span>

                          {(booking.status === "Confirmed" || booking.status === "Completed") && (
                            <button
                              onClick={() => handleShowInvoice(booking._id)}
                              className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition"
                              title="Download billing receipt"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          )}

                          {booking.status !== "Cancelled" && (
                            <button
                              onClick={() => handleOpenCancelModal(booking._id)}
                              className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 text-zinc-500 hover:text-red-500 transition"
                              title="Cancel Reservation"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sessions Management panel */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-outfit text-xl font-bold flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-indigo-500" />
                  <span>Active Sessions & Devices</span>
                </h2>
                {sessions.length > 1 && (
                  <button
                    onClick={handleRevokeOthers}
                    className="text-xs text-rose-500 hover:underline font-semibold"
                  >
                    Log out of other devices
                  </button>
                )}
              </div>

              <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                {sessions.map((sess) => {
                  const isMobile = sess.deviceType === "Mobile" || sess.deviceType === "Tablet";
                  return (
                    <div key={sess._id} className="p-4 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-zinc-500 dark:text-zinc-400">
                          {isMobile ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {sess.os} • {sess.browser}
                          </div>
                          <div className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                            <Globe className="w-3 h-3" /> {sess.ipAddress} • Active: {new Date(sess.lastActive).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRevokeSession(sess._id)}
                        className="text-xs text-zinc-400 hover:text-rose-500 font-medium border border-zinc-100 dark:border-zinc-800 px-3 py-1.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                      >
                        Revoke Access
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Wishlist Sidebar */}
          <div className="space-y-6">
            {/* Profile Completion Card */}
            <div className="border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl bg-white dark:bg-zinc-900 shadow-sm space-y-3">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-zinc-500">Profile Completion</span>
                <span className="text-rose-500">{completionPercentage}%</span>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-400">
                Fill details in profile configurations to reach 100%.
              </p>
            </div>

            {/* Account Identification QR Card */}
            <div className="border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 shadow-sm space-y-4 text-center">
              <div className="flex items-center gap-2 justify-center">
                <Sparkles className="w-4 h-4 text-rose-500 animate-pulse" />
                <h3 className="font-outfit font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  StaySmart Access Card
                </h3>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-zinc-100 inline-block">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`staysmart:user:${user?.id}`)}`}
                  alt="Account QR"
                  className="w-32 h-32 mx-auto object-contain"
                />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                  Username: @{(user as any)?.username || "smart_traveler"}
                </span>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={copyAccountId}
                    className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-[10px] font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                  >
                    Copy ID
                  </button>
                  <button
                    onClick={downloadQRCode}
                    className="px-3 py-1.5 bg-rose-500 text-white rounded-xl text-[10px] font-bold hover:bg-rose-600 transition"
                  >
                    Download QR
                  </button>
                </div>
              </div>
            </div>

            {/* Wishlist Sidebar */}
            <h2 className="font-outfit text-xl font-bold flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-500" />
              <span>Wishlist Collection</span>
            </h2>

            {loading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-16 bg-zinc-200 dark:bg-zinc-855 rounded-2xl" />
              </div>
            ) : !wishlist || wishlist.listings.length === 0 ? (
              <p className="text-zinc-500 text-xs italic">Your wishlist is empty. Favorite listings on the home page.</p>
            ) : (
              <div className="space-y-3">
                {wishlist.listings.map((l) => (
                  <div
                    key={l._id}
                    className="border border-zinc-200 dark:border-zinc-800 p-3 rounded-2xl bg-white dark:bg-zinc-900 flex gap-3 hover:shadow-sm transition relative"
                  >
                    {l.images && l.images.length > 0 ? (
                      <img
                        src={l.images[0]}
                        alt={l.title}
                        className="h-16 w-16 rounded-xl object-cover shrink-0 cursor-pointer"
                        onClick={() => window.location.href = `/listings/${l._id}`}
                      />
                    ) : (
                      <div
                        className="h-16 w-16 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex flex-col items-center justify-center font-bold text-[8px] uppercase tracking-wider shrink-0 border border-zinc-200 dark:border-zinc-800 cursor-pointer"
                        onClick={() => window.location.href = `/listings/${l._id}`}
                      >
                        📸 No photos
                      </div>
                    )}
                    <div className="flex flex-col justify-between overflow-hidden flex-1">
                      <h4
                        onClick={() => window.location.href = `/listings/${l._id}`}
                        className="font-semibold text-xs text-zinc-900 dark:text-zinc-50 hover:underline cursor-pointer truncate"
                      >
                        {l.title}
                      </h4>
                      <p className="text-[10px] text-zinc-500">{l.city}, {l.country}</p>
                      <div className="flex items-center justify-between gap-4 w-full">
                        <span className="text-xs font-bold text-rose-500">₹{l.price}/night</span>
                        <button
                          onClick={() => handleRemoveWishlist(l._id)}
                          className="p-1 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-400 hover:text-red-500 transition"
                          title="Remove from Wishlist"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Invoice Modal Overlay */}
      <AnimatePresence>
        {showInvoiceModal && selectedInvoice && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900">
                <div>
                  <h3 className="font-bold font-outfit text-lg">Billing Invoice</h3>
                  <span className="text-xs text-zinc-400">{selectedInvoice.invoiceNumber}</span>
                </div>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="no-print p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div id="booking-receipt" className="p-6 space-y-6 overflow-y-auto max-h-[60vh] text-xs bg-white dark:bg-zinc-950">
                <div className="text-center border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <h2 className="text-base font-bold font-outfit text-zinc-900 dark:text-zinc-550">StaySmart</h2>
                  <p className="text-[9px] text-zinc-400 font-medium">AI-Enhanced Vacation Rental Platform</p>
                  <h3 className="text-[10px] font-bold font-outfit text-indigo-650 dark:text-indigo-400 uppercase tracking-wider mt-2">Booking Confirmation & Invoice</h3>
                </div>

                {/* Stay Details */}
                <div className="space-y-2">
                  <h4 className="font-bold text-[9px] uppercase text-zinc-400 tracking-wider">Stay Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-zinc-600 dark:text-zinc-400">
                    <div>
                      <span className="block text-[9px] text-zinc-400">Booking ID</span>
                      <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                        {selectedInvoice.invoiceNumber.replace("INV-", "STAY-")}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-zinc-400">Property</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate block">
                        {selectedInvoice.propertyDetails.title}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-zinc-400">City</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                        {selectedInvoice.propertyDetails.city || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-zinc-400">Check-In Date</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                        {new Date(selectedInvoice.stayDetails.startDate).toDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-zinc-400">Check-Out Date</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                        {new Date(selectedInvoice.stayDetails.endDate).toDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Guest & Payment Info */}
                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 space-y-2">
                  <h4 className="font-bold text-[9px] uppercase text-zinc-400 tracking-wider">Guest & Payment Info</h4>
                  <div className="grid grid-cols-2 gap-2 text-zinc-650 dark:text-zinc-350">
                    <div>
                      <span className="block text-[9px] text-zinc-400">Guest Name</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{selectedInvoice.billingDetails.name}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-zinc-400">Email Address</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate block">{selectedInvoice.billingDetails.email}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-zinc-400">Transaction Reference</span>
                      <span className="font-mono text-zinc-800 dark:text-zinc-200 block truncate">
                        {selectedInvoice.transactionDetails.paymentIntentId}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-zinc-400">Payment Method</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 uppercase">
                        {selectedInvoice.transactionDetails.paymentMethod}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-zinc-400">Payment Provider</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {selectedInvoice.transactionDetails.paymentMethod?.toLowerCase() === "upi"
                          ? "Direct UPI"
                          : selectedInvoice.transactionDetails.paymentMethod?.toLowerCase() === "mock"
                          ? "Mock Gateway"
                          : "Razorpay Gateway"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-zinc-400">Booking Status</span>
                      <span className={`font-bold uppercase ${
                        selectedInvoice.transactionDetails.bookingStatus === "Confirmed"
                          ? "text-emerald-600 animate-none"
                          : selectedInvoice.transactionDetails.bookingStatus === "PendingVerification"
                          ? "text-amber-500 animate-none"
                          : "text-zinc-500 animate-none"
                      }`}>
                        {selectedInvoice.transactionDetails.bookingStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Charges Breakdown */}
                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 space-y-2">
                  <h4 className="font-bold text-[9px] uppercase text-zinc-400 tracking-wider">Charges Breakdown</h4>
                  <div className="space-y-1.5 text-zinc-600 dark:text-zinc-400">
                    <div className="flex justify-between">
                      <span>Stay base price</span>
                      <span>₹{selectedInvoice.pricingBreakdown.baseAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cleaning Fee</span>
                      <span>₹{selectedInvoice.pricingBreakdown.cleaningFee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Occupancy Taxes & GST</span>
                      <span>₹{selectedInvoice.pricingBreakdown.taxes.toLocaleString()}</span>
                    </div>
                    {selectedInvoice.pricingBreakdown.discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-500">
                        <span>Promo Discount</span>
                        <span>-₹{selectedInvoice.pricingBreakdown.discountAmount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold border-t border-zinc-100 dark:border-zinc-800 pt-2 text-zinc-900 dark:text-zinc-100 text-sm">
                      <span>Grand Total Paid</span>
                      <span>₹{selectedInvoice.pricingBreakdown.totalPaid.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="no-print p-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2 bg-zinc-50 dark:bg-zinc-900">
                <button
                  disabled={isPrinting}
                  onClick={() => {
                    if (isPrinting) return;
                    setIsPrinting(true);
                    
                    const printContent = document.getElementById("booking-receipt")?.innerHTML;
                    if (!printContent) {
                      toast.error("Receipt content is not ready yet.");
                      setIsPrinting(false);
                      return;
                    }

                    const iframe = document.createElement("iframe");
                    iframe.style.position = "fixed";
                    iframe.style.right = "0";
                    iframe.style.bottom = "0";
                    iframe.style.width = "0";
                    iframe.style.height = "0";
                    iframe.style.border = "0";
                    iframe.style.zIndex = "-1000";
                    document.body.appendChild(iframe);

                    const doc = iframe.contentWindow?.document || iframe.contentDocument;
                    if (doc) {
                      doc.open();
                      doc.write(`
                        <html>
                          <head>
                            <title>Booking Confirmation & Invoice</title>
                            <link rel="preconnect" href="https://fonts.googleapis.com">
                            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                            <style>
                              body {
                                font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                                background: white;
                                color: black;
                                margin: 0;
                                padding: 24px;
                              }
                              .font-outfit { font-family: 'Outfit', sans-serif; }
                              .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
                              .font-bold { font-weight: 700; }
                              .font-semibold { font-weight: 600; }
                              .text-center { text-align: center; }
                              .text-right { text-align: right; }
                              .text-left { text-align: left; }
                              .text-xs { font-size: 12px; }
                              .text-sm { font-size: 14px; }
                              .text-base { font-size: 16px; }
                              .text-lg { font-size: 18px; }
                              .text-[9px] { font-size: 9px; }
                              .text-[10px] { font-size: 10px; }
                              .tracking-wider { letter-spacing: 0.05em; }
                              .uppercase { text-transform: uppercase; }
                              .space-y-4 > * + * { margin-top: 16px; }
                              .space-y-2 > * + * { margin-top: 8px; }
                              .grid { display: grid; }
                              .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                              .gap-2 { gap: 8px; }
                              .border-b { border-bottom: 1px solid #e4e4e7; }
                              .border-t { border-top: 1px solid #e4e4e7; }
                              .pb-3 { padding-bottom: 12px; }
                              .pt-3 { padding-top: 12px; }
                              .mt-2 { margin-top: 8px; }
                              .mt-1 { margin-top: 4px; }
                              .mr-2 { margin-right: 8px; }
                              .mb-1 { margin-bottom: 4px; }
                              .flex { display: flex; }
                              .justify-between { justify-content: space-between; }
                              .items-center { align-items: center; }
                              .w-full { width: 100%; }
                              .block { display: block; }
                              .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                              
                              .text-zinc-400 { color: #a1a1aa !important; }
                              .text-zinc-500 { color: #71717a !important; }
                              .text-zinc-800 { color: #27272a !important; }
                              .text-zinc-900 { color: #09090b !important; }
                              .text-emerald-500 { color: #059669 !important; }
                              .text-emerald-600 { color: #059669 !important; }
                              .text-indigo-650 { color: #4f46e5 !important; }
                              .text-indigo-400 { color: #4f46e5 !important; }
                              .bg-zinc-950 { background-color: #ffffff !important; }
                              .dark\\:bg-zinc-950 { background-color: #ffffff !important; }
                              
                              @page {
                                size: portrait;
                                margin: 1.5cm;
                              }
                            </style>
                          </head>
                          <body>
                            <div style="max-width: 600px; margin: 0 auto; border: 1px solid #e4e4e7; padding: 24px; border-radius: 12px; background: white;">
                              ${printContent}
                            </div>
                          </body>
                        </html>
                      `);
                      doc.close();

                      setTimeout(() => {
                        try {
                          iframe.contentWindow?.focus();
                          iframe.contentWindow?.print();
                        } catch (e) {
                          console.error("Iframe print error", e);
                        }
                        setTimeout(() => {
                          try {
                            document.body.removeChild(iframe);
                          } catch (err) {}
                          setIsPrinting(false);
                        }, 1000);
                      }, 500);
                    } else {
                      setIsPrinting(false);
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-xl text-xs shadow-sm transition"
                >
                  {isPrinting ? "Printing..." : "Print Receipt"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <h3 className="font-outfit text-lg font-bold text-zinc-900 dark:text-zinc-50">Edit Profile</h3>
                <button onClick={() => setShowEditProfileModal(false)} className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleProfileSave} className="space-y-3 text-xs">
                {/* Avatar upload section */}
                <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50">
                  <UserAvatar user={{ avatar: tempAvatar || user.avatar, name: user.name }} size="lg" />
                  <div className="space-y-1.5 flex-1">
                    <span className="block text-[10px] font-bold uppercase text-zinc-400">Profile Photo</span>
                    <div className="flex gap-2">
                      <label className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[10px] font-bold cursor-pointer transition">
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarFileChange}
                        />
                      </label>
                      {(user.avatar || tempAvatar) && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/20 text-zinc-600 dark:text-zinc-400 hover:text-red-500 rounded-lg text-[10px] font-bold transition cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">First Name</label>
                    <input
                      type="text"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Username</label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Bio</label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 rounded-xl focus:outline-none min-h-16"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Country</label>
                    <input
                      type="text"
                      value={editCountry}
                      onChange={(e) => setEditCountry(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">State</label>
                    <input
                      type="text"
                      value={editState}
                      onChange={(e) => setEditState(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">City</label>
                    <input
                      type="text"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={editDob}
                    onChange={(e) => setEditDob(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 rounded-xl focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => setShowEditProfileModal(false)}
                    className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-bold transition hover:opacity-90 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition disabled:opacity-50 shadow-md cursor-pointer"
                  >
                    {editSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showCancelModal && (
          <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 relative text-left"
            >
              <h3 className="font-outfit font-bold text-lg text-zinc-900 dark:text-zinc-50 mb-3 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                Confirm Cancellation
              </h3>

              {previewLoading ? (
                <div className="py-8 flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-zinc-500 font-medium">Calculating refund breakdown...</span>
                </div>
              ) : refundPreview ? (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Your cancellation request has been estimated. Based on the checkout timestamp and check-in timeline ({refundPreview.hoursBeforeCheckin} hours remaining):
                  </p>

                  <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-800 space-y-2 text-xs">
                    <div className="flex justify-between text-zinc-650 dark:text-zinc-400">
                      <span>Total Amount Paid</span>
                      <span className="font-semibold text-zinc-900 dark:text-white">₹{refundPreview.originalAmount}</span>
                    </div>
                    <div className="flex justify-between text-zinc-650 dark:text-zinc-400">
                      <span>Cancellation Policy Refund %</span>
                      <span className="font-semibold text-rose-500">{refundPreview.refundPercent}%</span>
                    </div>
                    <div className="flex justify-between text-zinc-650 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-800 pt-2">
                      <span>Cancellation Penalty Fee</span>
                      <span className="font-semibold text-zinc-900 dark:text-white">₹{refundPreview.cancellationFee}</span>
                    </div>
                    <div className="flex justify-between text-zinc-650 dark:text-zinc-400 text-sm font-bold border-t border-zinc-200 dark:border-zinc-800 pt-2">
                      <span className="text-zinc-900 dark:text-white">Estimated Refund</span>
                      <span className="text-emerald-500">₹{refundPreview.refundableAmount}</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-zinc-400 dark:text-zinc-500 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-zinc-400" />
                      <span>&gt; 7 days prior: 100% refund</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-zinc-400" />
                      <span>2 to 7 days prior: 50% refund of base price, full refund of fees</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-zinc-400" />
                      <span>&lt; 48 hours prior: Non-refundable</span>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-3">
                    <button
                      type="button"
                      disabled={cancelLoading}
                      onClick={() => setShowCancelModal(false)}
                      className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-bold transition hover:opacity-90 cursor-pointer text-xs"
                    >
                      No, Keep Booking
                    </button>
                    <button
                      type="button"
                      disabled={cancelLoading}
                      onClick={handleCancelBooking}
                      className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition disabled:opacity-50 shadow-md cursor-pointer text-xs"
                    >
                      {cancelLoading ? "Processing Refund..." : "Yes, Cancel Booking"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-red-500 font-semibold">
                  Failed to fetch cancellation details.
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AiAssistant />
      <Footer />
    </div>
  );
}
