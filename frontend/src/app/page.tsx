"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AiAssistant from "@/components/AiAssistant";
import { listingsApi, aiApi, wishlistApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, Map, List, Star, Heart, Flame, Home, ShieldCheck, Compass, HelpCircle } from "lucide-react";
import toast from "react-hot-toast";

interface IListing {
  _id: string;
  title: string;
  images: string[];
  price: number;
  city: string;
  country: string;
  propertyType: string;
  bedrooms: number;
  rating: number;
}

const CATEGORIES = [
  { id: "all", label: "All stays", icon: Home },
  { id: "beach", label: "Beachfront", icon: Compass, query: { amenities: "Beach Access" } },
  { id: "villas", label: "Mansions", query: { propertyType: "Villa" }, icon: Flame },
  { id: "cabins", label: "Cabins", query: { propertyType: "Cabin" }, icon: Home },
  { id: "apartments", label: "Apartments", query: { propertyType: "Apartment" }, icon: ShieldCheck },
];

export default function HomePage() {
  const { user } = useAuth();
  const [listings, setListings] = useState<IListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [showMap, setShowMap] = useState(false);
  const [searchMode, setSearchMode] = useState<"standard" | "ai">("standard");
  const [naturalQuery, setNaturalQuery] = useState("");
  const [wishlistedIds, setWishlistedIds] = useState<string[]>([]);
  const [aiParsedDetails, setAiParsedDetails] = useState<any>(null);

  // Fetch listings based on standard filters or active categories
  const fetchListings = async (customParams?: Record<string, any>) => {
    setLoading(true);
    setAiParsedDetails(null);
    try {
      const res = await listingsApi.getAll(customParams);
      if (res.status === "success") {
        setListings(res.data.listings);
      }
    } catch (err) {
      toast.error("Failed to load listings");
    } finally {
      setLoading(false);
    }
  };

  // Sync wishlist
  const fetchWishlist = async () => {
    if (!user) return;
    try {
      const res = await wishlistApi.get();
      if (res.status === "success" && res.data.wishlist) {
        setWishlistedIds(res.data.wishlist.listings.map((l: any) => l._id || l));
      }
    } catch (err) {
      console.error("Wishlist load error", err);
    }
  };

  useEffect(() => {
    fetchListings();
    fetchWishlist();
  }, [user]);

  // Handle category selector
  const handleCategorySelect = (catId: string, query?: Record<string, any>) => {
    setActiveCategory(catId);
    if (catId === "all") {
      fetchListings();
    } else {
      fetchListings(query);
    }
  };

  // Handle AI semantic search
  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!naturalQuery.trim()) return;

    setLoading(true);
    try {
      const res = await aiApi.semanticSearch(naturalQuery);
      if (res.status === "success") {
        setListings(res.data.listings);
        setAiParsedDetails(res.data.parsedParams);
        toast.success(`AI returned ${res.data.listings.length} matches!`);
      } else {
        toast.error(res.message || "AI search failed");
      }
    } catch (err) {
      toast.error("AI Semantic Search failed");
    } finally {
      setLoading(false);
    }
  };

  // Toggle wishlist
  const toggleWishlist = async (listingId: string) => {
    if (!user) {
      toast.error("Please login to save favorites");
      return;
    }

    try {
      const res = await wishlistApi.toggle(listingId);
      if (res.status === "success") {
        if (res.data.isAdded) {
          setWishlistedIds((prev) => [...prev, listingId]);
          toast.success("Added to favorites!");
        } else {
          setWishlistedIds((prev) => prev.filter((id) => id !== listingId));
          toast.success("Removed from favorites");
        }
      }
    } catch (err) {
      toast.error("Failed to update wishlist");
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* Hero / Filter Bar Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Semantic search display option */}
        <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 bg-zinc-50 dark:bg-zinc-900/40">
          <div className="space-y-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Sparkles className="h-5 w-5 text-rose-500 animate-pulse" />
              <h2 className="font-outfit text-xl font-bold tracking-tight">AI Smart Search</h2>
            </div>
            <p className="text-xs text-zinc-500 max-w-md">
              Ask anything using natural queries like: <span className="italic">"I want a quiet beachfront villa under ₹6000."</span>
            </p>
          </div>

          <form onSubmit={handleAiSearch} className="flex-1 w-full max-w-lg flex gap-2">
            <input
              type="text"
              placeholder="Explain what you are looking for..."
              value={naturalQuery}
              onChange={(e) => setNaturalQuery(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white font-semibold text-sm shadow-md flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              <span>Ask AI</span>
            </button>
          </form>
        </div>

        {/* AI parsed parameter badge pill outputs */}
        {aiParsedDetails && (
          <div className="mb-6 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-zinc-500 uppercase font-semibold">AI Filters applied:</span>
            {aiParsedDetails.propertyType && (
              <span className="px-2.5 py-1 text-xs bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-full font-medium">
                {aiParsedDetails.propertyType}
              </span>
            )}
            {aiParsedDetails.priceMax && (
              <span className="px-2.5 py-1 text-xs bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full font-medium">
                Under ₹{aiParsedDetails.priceMax}
              </span>
            )}
            {aiParsedDetails.city && (
              <span className="px-2.5 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full font-medium">
                Near {aiParsedDetails.city}
              </span>
            )}
            {aiParsedDetails.bedrooms && (
              <span className="px-2.5 py-1 text-xs bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full font-medium">
                {aiParsedDetails.bedrooms}+ Beds
              </span>
            )}
            {aiParsedDetails.keywords?.map((kw: string, i: number) => (
              <span key={i} className="px-2.5 py-1 text-xs bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-full font-medium">
                #{kw}
              </span>
            ))}
          </div>
        )}

        {/* Category Pills Bar */}
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-8 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-3 shrink-0">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id, cat.query)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border transition ${
                    activeCategory === cat.id
                      ? "border-rose-500 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400"
                      : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Map toggle button */}
          <button
            onClick={() => setShowMap(!showMap)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition shadow-sm shrink-0"
          >
            {showMap ? (
              <>
                <List className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
                <span>Show List</span>
              </>
            ) : (
              <>
                <Map className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
                <span>Show Map</span>
              </>
            )}
          </button>
        </div>

        {/* Listings Display */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3 animate-pulse">
                <div className="aspect-square w-full rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 bg-zinc-50/50 dark:bg-zinc-900/10">
            <h3 className="font-outfit text-xl font-bold mb-1">No homes matches</h3>
            <p className="text-zinc-500 text-xs">Try clearing filters, searching for another location, or adjusting your AI query request.</p>
            <button
              onClick={() => handleCategorySelect("all")}
              className="mt-4 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full text-xs font-semibold shadow hover:opacity-90"
            >
              Reset Filters
            </button>
          </div>
        ) : showMap ? (
          /* Interactive Map Fallback overlay */
          <div className="h-[600px] w-full rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden relative shadow-lg">
            {/* Visual simulation of Google Maps or interactive elements */}
            <div className="absolute inset-0 bg-zinc-100 dark:bg-zinc-900 flex flex-col items-center justify-center p-8 text-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-50/20 via-zinc-100 dark:from-indigo-950/10 dark:via-zinc-900">
              <Map className="h-10 w-10 text-rose-500 mb-2 animate-bounce" />
              <h3 className="font-outfit text-lg font-bold">Interactive Map Views</h3>
              <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-6">
                Interactive mapping system showing {listings.length} properties nearby.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-4xl overflow-y-auto max-h-[400px] p-2">
                {listings.map((l) => (
                  <div
                    key={l._id}
                    onClick={() => window.location.href = `/listings/${l._id}`}
                    className="flex gap-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-3 rounded-2xl hover:shadow-md cursor-pointer transition text-left"
                  >
                    <img
                      src={l.images[0]}
                      alt={l.title}
                      className="h-16 w-16 rounded-xl object-cover shrink-0"
                    />
                    <div className="flex flex-col justify-between overflow-hidden">
                      <h4 className="font-semibold text-xs truncate text-zinc-900 dark:text-zinc-50">{l.title}</h4>
                      <p className="text-[10px] text-zinc-500">{l.city}, {l.country}</p>
                      <span className="text-xs font-bold text-rose-500">₹{l.price}/night</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Cards Grid List view */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {listings.map((listing) => (
              <div
                key={listing._id}
                className="group relative cursor-pointer flex flex-col bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900/60 rounded-3xl p-3 hover:shadow-lg transition-all duration-300"
              >
                
                {/* Save Heart Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWishlist(listing._id);
                  }}
                  className="absolute right-6 top-6 z-10 p-2 rounded-full bg-white/70 dark:bg-zinc-950/70 text-zinc-700 dark:text-zinc-300 hover:scale-105 active:scale-95 transition shadow-sm"
                >
                  <Heart
                    className={`h-4.5 w-4.5 transition-colors ${
                      wishlistedIds.includes(listing._id) ? "fill-rose-500 text-rose-500" : "text-zinc-600"
                    }`}
                  />
                </button>

                {/* Listing card link wrapper */}
                <div onClick={() => window.location.href = `/listings/${listing._id}`} className="space-y-3">
                  
                  {/* Photo Carousel Container */}
                  <div className="aspect-square w-full rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 relative">
                    <img
                      src={listing.images[0]}
                      alt={listing.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  {/* Title & Stats */}
                  <div className="space-y-1 px-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-rose-500 tracking-wider">
                        {listing.propertyType}
                      </span>
                      <div className="flex items-center gap-1 text-xs">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {listing.rating > 0 ? listing.rating.toFixed(1) : "New"}
                        </span>
                      </div>
                    </div>

                    <h3 className="font-outfit font-bold text-sm text-zinc-900 dark:text-zinc-50 truncate leading-snug">
                      {listing.title}
                    </h3>
                    
                    <p className="text-xs text-zinc-500 truncate leading-relaxed">
                      {listing.city}, {listing.country} • {listing.bedrooms} bed{listing.bedrooms > 1 ? "s" : ""}
                    </p>

                    <div className="pt-2 flex items-baseline gap-1">
                      <span className="font-bold text-sm text-zinc-900 dark:text-zinc-50">₹{listing.price}</span>
                      <span className="text-zinc-500 text-[10px]">/ night</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <AiAssistant />
      <Footer />
    </div>
  );
}
