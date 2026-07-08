"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AiAssistant from "@/components/AiAssistant";
import { bookingsApi, wishlistApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { Calendar, Heart, Trash2, ShieldAlert, ArrowRight, UserCircle, Star } from "lucide-react";
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

export default function GuestDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<IBooking[]>([]);
  const [wishlist, setWishlist] = useState<IWishlist | null>(null);
  const [loading, setLoading] = useState(true);

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
    } catch (err) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  // Handle booking cancellation
  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    try {
      const res = await bookingsApi.cancel(bookingId);
      if (res.status === "success") {
        toast.success("Reservation cancelled successfully");
        loadDashboardData();
      } else {
        toast.error(res.message || "Failed to cancel booking");
      }
    } catch (err) {
      toast.error("Cancellation transaction failed");
    }
  };

  // Toggle wishlist removal
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

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
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
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Profile Card Header */}
        <div className="mb-8 flex flex-col sm:flex-row items-center gap-6 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-900/40">
          <img
            src={user.avatar}
            alt={user.name}
            className="h-16 w-16 rounded-full object-cover ring-2 ring-rose-500"
          />
          <div className="space-y-1 text-center sm:text-left">
            <h1 className="font-outfit text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Welcome, {user.name}
            </h1>
            <p className="text-xs text-zinc-500">{user.email} • Guest Profile</p>
          </div>
        </div>

        {/* Column partitions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Bookings Section */}
          <div className="lg:col-span-2 space-y-6">
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
              <div className="p-8 text-center border border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/10">
                <p className="text-zinc-500 text-xs mb-3">You don't have any bookings reserved.</p>
                <a
                  href="/"
                  className="inline-block px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-semibold rounded-full hover:opacity-90"
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
                      className="border border-zinc-200 dark:border-zinc-800 p-4 rounded-3xl bg-white dark:bg-zinc-900 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center hover:shadow-md transition"
                    >
                      <div className="flex gap-4">
                        <img
                          src={listing.images[0]}
                          alt={listing.title}
                          className="h-20 w-20 rounded-2xl object-cover shrink-0"
                        />
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
                            <span className="text-xs font-bold text-rose-500">₹{booking.totalPrice}</span>
                            <span className="text-[10px] text-zinc-500"> total</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-100 dark:border-zinc-800">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                            booking.status === "Cancelled"
                              ? "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                              : "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {booking.status}
                        </span>

                        {booking.status !== "Cancelled" && (
                          <button
                            onClick={() => handleCancelBooking(booking._id)}
                            className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-zinc-500 hover:text-red-500 transition"
                            title="Cancel Reservation"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Wishlist Sidebar Section */}
          <div className="space-y-6">
            <h2 className="font-outfit text-xl font-bold flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-500" />
              <span>Wishlist Collection</span>
            </h2>

            {loading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
              </div>
            ) : !wishlist || wishlist.listings.length === 0 ? (
              <p className="text-zinc-500 text-xs italic">Your wishlist is empty. Favorite listings on the home page.</p>
            ) : (
              <div className="space-y-3">
                {wishlist.listings.map((l) => (
                  <div
                    key={l._id}
                    className="border border-zinc-200 dark:border-zinc-800 p-3 rounded-2xl bg-white dark:bg-zinc-900 flex gap-3 hover:shadow-md transition relative group"
                  >
                    <img
                      src={l.images[0]}
                      alt={l.title}
                      className="h-16 w-16 rounded-xl object-cover shrink-0 cursor-pointer"
                      onClick={() => window.location.href = `/listings/${l._id}`}
                    />
                    <div className="flex flex-col justify-between overflow-hidden">
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
                          className="p-1 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition"
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

      <AiAssistant />
      <Footer />
    </div>
  );
}
