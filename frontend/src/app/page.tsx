"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AiAssistant from "@/components/AiAssistant";
import { listingsApi, aiApi, wishlistApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "next-themes";
import {
  Sparkles,
  Map,
  List,
  Star,
  Heart,
  Flame,
  Home,
  Image as ImageIcon,
  ShieldCheck,
  Compass,
  HelpCircle,
  TrendingUp,
  Users,
  DollarSign,
  Search,
  ChevronRight,
  ChevronDown,
  Globe,
  Mail,
  Smartphone,
  CheckCircle,
  Menu,
  X,
  MapPin,
  Calendar,
  Layers,
  ArrowUpRight,
  Sun,
  Moon,
  Info,
  Phone,
  LayoutDashboard,
  LogOut
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  owner?: { _id: string; name: string; avatar?: string };
}

const CATEGORIES = [
  { id: "all", label: "All stays", icon: Home },
  { id: "beach", label: "Beachfront", icon: Compass, query: { amenities: "Beach Access" } },
  { id: "villas", label: "Mansions", query: { propertyType: "Villa" }, icon: Flame },
  { id: "cabins", label: "Cabins", query: { propertyType: "Cabin" }, icon: Home },
  { id: "apartments", label: "Apartments", query: { propertyType: "Apartment" }, icon: ShieldCheck },
  { id: "lake", label: "Lake View", query: { amenities: "Lake View" }, icon: Layers },
  { id: "mountain", label: "Mountain", query: { propertyType: "Cabin" }, icon: TrendingUp },
];

const QUICK_SUGGESTIONS = [
  "Luxury villa in Goa",
  "Cabin with mountain view",
  "Pet friendly apartment",
  "Beach house near airport",
];


const FAQS = [
  { id: "semantic-search", q: "How does the AI semantic search parse my request?", a: "We proxy your query to our AI Engine which extracts target destinations, pricing caps, and requested amenities like 'Pool' or 'Wifi', returning direct database matches instantly." },
    { id: "waitlist", q: "How do overlapped date waitlists operate?", a: "If your selected dates are booked, join the waitlist. Our queue manager tracks the calendar and triggers automated Socket alerts to notify you if the slot opens." },
  { id: "dynamic-pricing", q: "How accurate is the AI Dynamic Pricing strategy?", a: "It pulls competitor listings in real-time, matching seasonality demand peaks, holidays, and history metrics to optimize host profit margins." }
];

export default function HomePage() {
  const { user, logout, updateUserRole } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<IListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [showMap, setShowMap] = useState(false);
  const [naturalQuery, setNaturalQuery] = useState("");
  const [wishlistedIds, setWishlistedIds] = useState<string[]>([]);
  const [aiParsedDetails, setAiParsedDetails] = useState<any>(null);

  // Layout Themes & Dropdowns
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [isLangOpen, setIsLangOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState("English");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // AI Tab Showcase
  const [activeAiTab, setActiveAiTab] = useState<"planner" | "pricing" | "fraud">("planner");

  // World Map Pin hover

  // FAQ search text
  const [faqSearch, setFaqSearch] = useState("");

  const toggleDarkMode = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

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
  }, []);

  useEffect(() => {
    if (user) {
      fetchWishlist();
    } else {
      setWishlistedIds([]);
    }
  }, [user]);

  const handleCategorySelect = (catId: string, query?: Record<string, any>) => {
    setActiveCategory(catId);
    if (catId === "all") {
      fetchListings();
    } else {
      fetchListings(query);
    }
  };

  const handleAiSearchSubmit = async (queryText: string) => {
    setNaturalQuery(queryText);
    setLoading(true);
    try {
      const res = await aiApi.semanticSearch(queryText);
      if (res.status === "success") {
        setListings(res.data.listings);
        setAiParsedDetails(res.data.parsedParams);
        toast.success(`AI matched ${res.data.listings.length} stays!`);
      } else {
        toast.error(res.message || "AI search failed");
      }
    } catch (err) {
      toast.error("AI semantic query failed");
    } finally {
      setLoading(false);
    }
  };

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

  const toggleRole = async () => {
    if (!user) return;
    const nextRole = user.role === "Host" ? "Guest" : "Host";
    await updateUserRole(nextRole);
    toast.success(`Switched to ${nextRole} perspective!`);
    router.refresh();
  };

  const filteredFaqs = FAQS.filter(
    (f) =>
      f.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
      f.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  const destinations = Object.values(
    listings.reduce((groups: Record<string, {
      name: string;
      country: string;
      count: number;
      totalPrice: number;
      totalRating: number;
      image: string;
    }>, listing) => {
      const key = `${listing.city}-${listing.country}`;
      const current = groups[key] || {
        name: listing.city,
        country: listing.country,
        count: 0,
        totalPrice: 0,
        totalRating: 0,
        image: listing.images?.[0] || "",
      };
      current.count += 1;
      current.totalPrice += listing.price;
      current.totalRating += listing.rating || 0;
      if (!current.image && listing.images?.[0]) current.image = listing.images[0];
      groups[key] = current;
      return groups;
    }, {})
  )
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const hostHighlights = Object.values(
    listings.reduce((groups: Record<string, {
      id: string;
      name: string;
      avatar: string;
      listings: number;
    }>, listing) => {
      if (!listing.owner?._id) return groups;
      const id = listing.owner._id;
      const current = groups[id] || {
        id,
        name: listing.owner.name,
        avatar: listing.owner.avatar || "",
        listings: 0,
      };
      current.listings += 1;
      if (!current.avatar && listing.owner.avatar) current.avatar = listing.owner.avatar;
      groups[id] = current;
      return groups;
    }, {})
  )
    .sort((a, b) => b.listings - a.listings)
    .slice(0, 4);

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      
      {/* --- Section 1: Sticky Navigation Bar --- */}
      <nav className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <a href="/" className="flex items-center gap-1.5 font-outfit text-2xl font-bold tracking-tight text-rose-500">
              <span className="bg-rose-500 text-white p-1 rounded-lg">SS</span>
              <span>StaySmart</span>
            </a>
          </div>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-6 text-xs font-bold text-zinc-600 dark:text-zinc-300">
            <a href="/" className="hover:text-rose-500 transition">Home</a>
            <button onClick={() => handleCategorySelect("all")} className="hover:text-rose-500 transition">Explore</button>
            <a href="#destinations" className="hover:text-rose-500 transition">Destinations</a>
            <a href="#ai-showcase" className="hover:text-rose-500 transition">AI Search</a>
            <a href="#faq" className="hover:text-rose-500 transition">FAQ</a>
            {user && (
              <button onClick={toggleRole} className="hover:text-rose-500 transition">
                Switch perspective ({user.role})
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition flex items-center gap-1"
                aria-label="Language Selector"
              >
                <Globe className="h-4.5 w-4.5" />
                <span className="text-[10px] font-bold uppercase">{selectedLang.substring(0, 2)}</span>
              </button>
              {isLangOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg py-1 z-50 text-xs font-semibold">
                  {["English", "Español", "Deutsch"].map((l) => (
                    <button
                      key={l}
                      onClick={() => {
                        setSelectedLang(l);
                        setIsLangOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              aria-label="Toggle Theme"
            >
              {mounted && resolvedTheme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>

            {/* User Account actions */}
            {user ? (
              <div className="flex items-center gap-3">
                <a
                  href={user.role === "Host" ? "/dashboard/host" : "/dashboard/guest"}
                  className="px-4 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 text-xs font-bold transition shadow-sm hidden md:inline-block"
                >
                  Dashboard
                </a>
                <button
                  onClick={logout}
                  className="p-2 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition"
                  aria-label="Log Out"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push("/login")}
                  className="px-4 py-2 rounded-full text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  Log In
                </button>
                <button
                  onClick={() => router.push("/signup")}
                  className="px-4 py-2 rounded-full text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white shadow transition"
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* Mobile Hamburger menu */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              aria-label="Toggle Mobile Menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 py-4 space-y-3 text-sm font-semibold flex flex-col"
            >
              <a href="/" onClick={() => setIsMobileMenuOpen(false)}>Home</a>
              <button onClick={() => { handleCategorySelect("all"); setIsMobileMenuOpen(false); }} className="text-left">Explore</button>
              <a href="#destinations" onClick={() => setIsMobileMenuOpen(false)}>Destinations</a>
              <a href="#ai-showcase" onClick={() => setIsMobileMenuOpen(false)}>AI Search</a>
              <a href="#faq" onClick={() => setIsMobileMenuOpen(false)}>FAQ</a>
              {user && (
                <button onClick={() => { toggleRole(); setIsMobileMenuOpen(false); }} className="text-left text-rose-500">
                  Switch Role ({user.role})
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* --- Section 2 & 3: Hero & AI Search Experience --- */}
      <header className="relative w-full overflow-hidden py-24 bg-zinc-900 text-white border-b border-white/10">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-rose-500 to-transparent blur-3xl animate-pulse" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white/5 rounded-full text-[10px] font-bold tracking-widest text-rose-400 border border-white/10"
          >
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>DISCOVER YOUR PERFECT STAY WITH AI</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-outfit text-4xl sm:text-7xl font-black tracking-tight max-w-5xl mx-auto leading-none bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent"
          >
            The Future of Travel Starts Here
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-400 max-w-lg mx-auto text-sm sm:text-base leading-relaxed"
          >
            Enter your destination goals in plain English. Enjoy concurrent checkout protection and secure Razorpay payments.
          </motion.p>

          {/* AI Search input wrapper */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="max-w-2xl mx-auto w-full space-y-4"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAiSearchSubmit(naturalQuery);
              }}
              className="flex gap-2 p-2 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl"
            >
              <div className="flex-1 relative flex items-center pl-3">
                <Search className="w-5 h-5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="e.g. Luxury villa in Goa under ₹5000 with pool"
                  value={naturalQuery}
                  onChange={(e) => setNaturalQuery(e.target.value)}
                  className="w-full bg-transparent border-none outline-none py-2 px-3 text-sm text-white placeholder-zinc-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white text-xs font-bold shadow transition flex items-center gap-1.5 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Match Stays</span>
              </button>
            </form>

            {/* Quick autocomplete chip filters */}
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_SUGGESTIONS.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAiSearchSubmit(chip)}
                  className="px-3.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] text-zinc-300 font-semibold transition"
                >
                  {chip}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-24">
        
        {/* --- Section 5: Property Categories Carousel --- */}
        <div>
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-8 overflow-x-auto scrollbar-none gap-4">
            <div className="flex items-center gap-2 shrink-0">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.id, cat.query)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold border transition ${
                      activeCategory === cat.id
                        ? "border-rose-500 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400"
                        : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowMap(!showMap)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shadow shrink-0"
            >
              {showMap ? (
                <>
                  <List className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                  <span>Show List</span>
                </>
              ) : (
                <>
                  <Map className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                  <span>Show Map</span>
                </>
              )}
            </button>
          </div>

          {/* AI Filter Applied Indicator */}
          {aiParsedDetails && (
            <div className="mb-6 flex flex-wrap gap-2 items-center bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-950 p-3.5 rounded-2xl text-xs shadow-sm">
              <span className="font-bold text-indigo-500">AI parsed parameters:</span>
              {aiParsedDetails.city && <span className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2.5 py-0.5 rounded-full">{aiParsedDetails.city}</span>}
              {aiParsedDetails.priceMax && <span className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2.5 py-0.5 rounded-full">Under ₹{aiParsedDetails.priceMax}</span>}
              {aiParsedDetails.propertyType && <span className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2.5 py-0.5 rounded-full">{aiParsedDetails.propertyType}</span>}
            </div>
          )}

          {/* --- Section 6: Featured Listings Grid --- */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3 animate-pulse">
                  <div className="aspect-square w-full rounded-3xl bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                  <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4" />
                </div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-20 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 bg-zinc-50/50 dark:bg-zinc-900/10">
              <h3 className="font-outfit text-lg font-bold mb-1">No matches found</h3>
              <p className="text-zinc-500 text-xs">Try searching for other parameters or clearing custom filters.</p>
              <button
                onClick={() => handleCategorySelect("all")}
                className="mt-4 px-4.5 py-2 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-full text-xs font-bold shadow hover:opacity-90 transition"
              >
                Reset Filters
              </button>
            </div>
          ) : showMap ? (
            <div className="h-[520px] w-full rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden relative shadow-sm">
              <div className="absolute inset-0 bg-zinc-100 dark:bg-zinc-900 flex flex-col items-center justify-center p-8 text-center">
                <Map className="h-10 w-10 text-rose-500 mb-2 animate-bounce" />
                <h3 className="font-outfit text-lg font-bold">Interactive Map views</h3>
                <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-6">Explore listings geographically.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-4xl overflow-y-auto max-h-[340px]">
                  {listings.map((l) => (
                    <div
                      key={l._id}
                      onClick={() => window.location.href = `/listings/${l._id}`}
                      className="flex gap-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-3 rounded-2xl hover:shadow cursor-pointer transition text-left"
                    >
                      {l.images && l.images.length > 0 ? (
                        <img src={l.images[0]} alt={l.title} className="h-14 w-14 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="h-14 w-14 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex flex-col items-center justify-center font-bold text-[8px] uppercase tracking-wider shrink-0 border border-zinc-200 dark:border-zinc-800">
                          📸 No photos
                        </div>
                      )}
                      <div className="flex flex-col justify-between overflow-hidden text-xs">
                        <h4 className="font-bold truncate text-zinc-900 dark:text-zinc-50">{l.title}</h4>
                        <span className="text-[10px] text-zinc-400">{l.city}</span>
                        <span className="text-xs font-bold text-rose-500">₹{l.price}/night</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {listings.map((listing) => (
                <div
                  key={listing._id}
                  className="group relative cursor-pointer flex flex-col bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-3xl p-3 hover:shadow-lg transition duration-300"
                >
                  {/* Heart Wishlist Trigger */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWishlist(listing._id);
                    }}
                    className="absolute right-6 top-6 z-10 p-2 rounded-full bg-white/70 dark:bg-zinc-950/70 text-zinc-700 hover:scale-105 active:scale-95 transition shadow-sm"
                  >
                    <Heart
                      className={`h-4.5 w-4.5 transition-colors ${
                        wishlistedIds.includes(listing._id) ? "fill-rose-500 text-rose-500" : "text-zinc-600"
                      }`}
                    />
                  </button>

                  <div onClick={() => window.location.href = `/listings/${listing._id}`} className="space-y-3">
                    <div className="aspect-square w-full rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 relative">
                      {listing.images && listing.images.length > 0 ? (
                        <img
                          src={listing.images[0]}
                          alt={listing.title}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-900 text-zinc-450">
                          <ImageIcon className="w-8 h-8 opacity-45 mb-1" />
                          <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 font-outfit">No photos</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 px-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-rose-500 tracking-wider">
                          {listing.propertyType}
                        </span>
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {listing.rating > 0 ? listing.rating.toFixed(1) : "New"}
                          </span>
                        </div>
                      </div>
                      <h3 className="font-outfit font-bold text-sm text-zinc-900 dark:text-zinc-50 truncate leading-snug">
                        {listing.title}
                      </h3>
                      <p className="text-zinc-500 dark:text-zinc-400 truncate">
                        {listing.city}, {listing.country} • {listing.bedrooms} Beds
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
        </div>

        {/* --- Section 4: Popular Destinations --- */}
        <section id="destinations" className="space-y-6">
          <div>
            <h2 className="font-outfit text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Popular Indian Getaways
            </h2>
            <span className="text-xs text-zinc-500 block">Spotlight properties in top holiday locations</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {destinations.map((d) => (
              <div
                key={`${d.name}-${d.country}`}
                onClick={() => handleAiSearchSubmit(`stays in ${d.name}`)}
                className="group relative rounded-2xl overflow-hidden h-44 cursor-pointer shadow-sm border border-zinc-200 dark:border-zinc-800"
              >
                <img
                  src={d.image || "/window.svg"}
                  alt={d.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-4 text-white">
                  <h4 className="font-bold text-sm">{d.name}</h4>
                  <span className="text-[10px] text-zinc-300">{d.count} {d.count === 1 ? "stay" : "stays"} • avg ₹{Math.round(d.totalPrice / d.count).toLocaleString()}/night • {d.totalRating > 0 ? `${(d.totalRating / d.count).toFixed(1)}★` : "New"}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* --- Section 7: Why StaySmart --- */}
        <section className="mt-20 py-12 border-t border-zinc-200 dark:border-zinc-800">
          <div className="text-center max-w-xl mx-auto space-y-2 mb-12">
            <h2 className="font-outfit text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Why Travelers Prefer StaySmart
            </h2>
            <p className="text-sm text-zinc-500">
              Simplifying home finding and checkouts using automation and secure payment verification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-3 shadow-sm">
              <span className="text-2xl">🔍</span>
              <h3 className="font-outfit font-bold text-sm">AI Semantic Parsing</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Describe your dream stay in natural words. Our backend processes the query to return relevant listings instantly.
              </p>
            </div>
            <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-3 shadow-sm">
              <span className="text-2xl">🔒</span>
              <h3 className="font-outfit font-bold text-sm">Zero-Overlap Dates</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                StaySmart locks checkout slots temporarily during processing. Double-bookings and booking conflicts are strictly blocked.
              </p>
            </div>
            <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-3 shadow-sm">
              <span className="text-2xl">💳</span>
              <h3 className="font-outfit font-bold text-sm">Secure Razorpay Payments</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Pay securely through Razorpay with cards and supported UPI methods. Payment signatures are verified server-side before a booking is confirmed.
              </p>
            </div>
          </div>
        </section>

        {/* --- Section 8: AI Showcase tabbed display --- */}
        <section id="ai-showcase" className="space-y-6 border-t border-zinc-200 dark:border-zinc-800 pt-16">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="font-outfit text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              Powered by StaySmart AI
            </h2>
            <p className="text-xs text-zinc-500 font-semibold tracking-wide">
              Auditing our custom machine-learning capabilities.
            </p>
          </div>

          <div className="flex justify-center gap-2 max-w-md mx-auto p-1 bg-zinc-200/50 dark:bg-zinc-900/50 rounded-2xl">
            <button
              onClick={() => setActiveAiTab("planner")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                activeAiTab === "planner" ? "bg-white dark:bg-zinc-800 shadow text-indigo-600 dark:text-indigo-400" : "text-zinc-500"
              }`}
            >
              Trip Planner
            </button>
            <button
              onClick={() => setActiveAiTab("pricing")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                activeAiTab === "pricing" ? "bg-white dark:bg-zinc-800 shadow text-indigo-600 dark:text-indigo-400" : "text-zinc-500"
              }`}
            >
              Dynamic Pricing
            </button>
            <button
              onClick={() => setActiveAiTab("fraud")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                activeAiTab === "fraud" ? "bg-white dark:bg-zinc-800 shadow text-indigo-600 dark:text-indigo-400" : "text-zinc-500"
              }`}
            >
              Fraud Audits
            </button>
          </div>

          <div className="max-w-4xl mx-auto border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl bg-white dark:bg-zinc-900 shadow-sm min-h-60 flex items-center">
            <AnimatePresence mode="wait">
              {activeAiTab === "planner" && (
                <motion.div
                  key="planner"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4 text-xs w-full"
                >
                  <div className="flex items-center gap-2 text-indigo-500 font-bold">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                    <span>AI HOLIDAY SCHEDULER</span>
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400">
                    Constructs day-by-day sightseeing programs, transit, cafes, and budgets dynamically.
                  </p>
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-mono text-[10px] space-y-2 text-zinc-500 dark:text-zinc-400">
                    <span className="font-bold text-rose-500 block">Day 1: Coastline Wanderings</span>
                    <span>- 09:30 AM: Check-in at Sea Lagoon Loft, enjoy the welcome area.</span>
                    <span>- 01:00 PM: Seafood lunch thali at Beach Bistro (approx. ₹700).</span>
                  </div>
                </motion.div>
              )}

              {activeAiTab === "pricing" && (
                <motion.div
                  key="pricing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4 text-xs w-full"
                >
                  <div className="flex items-center gap-2 text-rose-500 font-bold">
                    <TrendingUp className="w-5 h-5" />
                    <span>DYNAMIC MARKET PRICING</span>
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400">
                    Maximizes host earnings by automatically tracking seasonal spikes and competitor stays.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">Weekday base</span>
                      <span className="text-sm font-bold block text-zinc-900 dark:text-zinc-50">₹3,400</span>
                    </div>
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">Weekend Peak</span>
                      <span className="text-sm font-bold block text-emerald-500">₹4,200 (+23%)</span>
                    </div>
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">Average Occupancy</span>
                      <span className="text-sm font-bold block text-indigo-500">92% Index</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeAiTab === "fraud" && (
                <motion.div
                  key="fraud"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4 text-xs w-full"
                >
                  <div className="flex items-center gap-2 text-amber-500 font-bold">
                    <ShieldCheck className="w-5 h-5" />
                    <span>AI AUTO FRAUD CHECKS</span>
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400">
                    Tracks IP velocities, logins limits, and checkout bounds to block high-risk transaction attempts.
                  </p>
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">Session Audit Score: Low Risk</span>
                      <span className="text-[10px] text-zinc-400 block mt-1">Multi-device checks: 1 active. Limit validated.</span>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 rounded-full font-bold text-[10px]">
                      Verified Safe
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto py-10 border-y border-zinc-200 dark:border-zinc-800 text-center">
          <div>
            <span className="text-3xl font-black block text-indigo-500">{listings.length}</span>
            <span className="text-[10px] text-zinc-400 uppercase font-semibold">Live Listings</span>
          </div>
          <div>
            <span className="text-3xl font-black block text-rose-500">{hostHighlights.length}</span>
            <span className="text-[10px] text-zinc-400 uppercase font-semibold">Active Hosts</span>
          </div>
          <div>
            <span className="text-3xl font-black block text-amber-500">{destinations.length}</span>
            <span className="text-[10px] text-zinc-400 uppercase font-semibold">Destinations</span>
          </div>
          <div>
            <span className="text-3xl font-black block text-emerald-500">
              {listings.length
                ? `${(listings.reduce((sum, listing) => sum + (listing.rating || 0), 0) / listings.length).toFixed(1)}★`
                : "—"}
            </span>
            <span className="text-[10px] text-zinc-400 uppercase font-semibold">Live Rating</span>
          </div>
        </section>

        {/* --- Section 10: Featured Hosts --- */}
        <section className="space-y-6">
          <div>
            <h2 className="font-outfit text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Meet Our Featured Hosts
            </h2>
            <span className="text-xs text-zinc-500 block">Professional property managers on StaySmart</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {hostHighlights.map((host) => (
              <div key={host.id} className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl flex items-center gap-4 shadow-sm">
                <img src={host.avatar || "/window.svg"} alt={host.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                <div className="text-xs">
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-50">{host.name}</h4>
                  <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider block">Host</span>
                  <span className="text-zinc-400 text-[10px] block mt-1">
                    {host.listings} listing(s) published
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* --- Section 12: Travel Inspiration & Blogs --- */}
        <section className="space-y-6">
          <div>
            <h2 className="font-outfit text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Travel Inspiration & Guides
            </h2>
            <span className="text-xs text-zinc-500 block">Explore the best packing checklists and itineraries</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 bg-white dark:bg-zinc-900 space-y-3 shadow-sm">
              <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">BEACH GUIDES</span>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">10 Hidden Beaches in South Goa</h3>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">Discover quiet coves, artisanal seafood thalis, and secret snorkeling coordinates away from north crowds.</p>
            </div>
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 bg-white dark:bg-zinc-900 space-y-3 shadow-sm">
              <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">HOSTING TIPS</span>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">How AI Pricing Maximizes Returns</h3>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">Learn how StaySmart's dynamic pricing models automatically adjust weekend rates to increase earnings by 24%.</p>
            </div>
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 bg-white dark:bg-zinc-900 space-y-3 shadow-sm">
              <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">CULTURE</span>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">Heritage Walk checklist for Pondicherry</h3>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">A complete guide to exploring French Quarter architecture, bakeries, and spiritual Auroville ashram spots.</p>
            </div>
          </div>
        </section>

        {/* --- Section 13 & 14: Searchable FAQs & Support Help Card --- */}
        <section id="faq" className="grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-zinc-200 dark:border-zinc-800 pt-16 max-w-7xl mx-auto">
          <div className="md:col-span-2 space-y-6">
            <div>
              <h3 className="font-outfit text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                Frequently Asked Questions
              </h3>
              <span className="text-xs text-zinc-500 block mb-4">Search questions dynamically below</span>
              <input
                type="text"
                placeholder="Search FAQs e.g. payments, waitlist..."
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="space-y-4">
              {filteredFaqs.map((f) => {
                const isExpanded = expandedFaqId === f.id;
                return (
                  <div
                    key={f.id}
                    className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700/80 shadow-sm transition-all duration-300"
                  >
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={`faq-answer-${f.id}`}
                      id={`faq-btn-${f.id}`}
                      onClick={() => setExpandedFaqId(isExpanded ? null : f.id)}
                      className="w-full flex justify-between items-center p-5 text-left font-bold text-sm text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      <span>{f.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-zinc-400 dark:text-zinc-500 transition-transform duration-300 ${
                          isExpanded ? "rotate-180 text-rose-500 dark:text-rose-400" : ""
                        }`}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          id={`faq-answer-${f.id}`}
                          role="region"
                          aria-labelledby={`faq-btn-${f.id}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                        >
                          <div className="p-5 pt-0 text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 leading-relaxed whitespace-pre-wrap">
                            {f.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
              {filteredFaqs.length === 0 && (
                <p className="text-xs text-zinc-500 italic text-center py-4">No matching FAQ items found.</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl bg-white dark:bg-zinc-900 space-y-6 shadow-sm flex flex-col justify-between h-full relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 dark:bg-rose-500/10 rounded-full blur-2xl" />
              <div className="space-y-3 relative">
                <span className="px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-500 text-[9px] font-bold uppercase tracking-wider">
                  24/7 Support
                </span>
                <h3 className="font-outfit text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  Still have questions?
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Can't find the answers in our FAQs? Get in touch with the StaySmart support team. We're here to assist you at any time.
                </p>
              </div>

              <div className="space-y-3 relative pt-4">
                <a
                  href="tel:+18005550199"
                  className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition group focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <Phone className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <span className="block text-[10px] text-zinc-400 font-bold uppercase">Call Hotline</span>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">+1 (800) SMART-STAY</span>
                  </div>
                </a>

                <a
                  href="mailto:support@staysmart.com"
                  className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition group focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <Mail className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
                  <div className="text-left">
                    <span className="block text-[10px] text-zinc-400 font-bold uppercase">Email Support</span>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">support@staysmart.com</span>
                  </div>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("ai-assistant-trigger");
                    if (el) {
                      (el as any).click();
                      toast.success("AI Assistant opened!");
                    } else {
                      toast.error("AI Assistant is offline.");
                    }
                  }}
                  className="w-full py-3 px-4 bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white rounded-2xl text-xs font-bold transition shadow-md shadow-rose-500/10 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                >
                  Chat with Travel Assistant
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* --- Section 15 & 16: Newsletter & Mobile App Promotion --- */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-zinc-200 dark:border-zinc-800 pt-16">
          <div className="md:col-span-2 bg-zinc-900 rounded-3xl p-8 text-white border border-white/10 relative overflow-hidden flex flex-col justify-between min-h-56">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-rose-500 to-transparent blur-2xl" />
            <div className="relative space-y-2">
              <h3 className="font-outfit text-2xl font-bold">Stay Updated on Exclusive Offers</h3>
              <p className="text-xs text-zinc-400 max-w-sm">Sign up for our newsletter to receive the latest travel guides, secret discounts, and AI itineraries.</p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                toast.success("Subscribed successfully!");
              }}
              className="relative w-full max-w-sm flex gap-2 mt-4"
            >
              <input
                type="email"
                required
                placeholder="jane.doe@example.com"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none placeholder-zinc-500"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-white text-zinc-900 hover:bg-zinc-100 rounded-xl text-xs font-bold transition shrink-0 shadow-lg"
              >
                Subscribe
              </button>
            </form>
          </div>

          {/* App promotion */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 flex flex-col justify-between min-h-56 text-xs">
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-500 text-[9px] font-bold uppercase tracking-wider">
                Coming Soon
              </span>
              <h4 className="font-bold text-sm mt-2 text-zinc-900 dark:text-zinc-50">StaySmart Mobile App</h4>
              <p className="text-zinc-500 mt-1">Book, verify OTPs, and chat with hosts on the go. Scan the code to pre-register.</p>
            </div>

            <div className="flex items-center gap-4 mt-4">
              <div className="h-16 w-16 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center font-bold text-[8px] text-zinc-400 tracking-wider">
                [ QR CODE ]
              </div>
              <div className="space-y-1">
                <span className="block font-bold text-zinc-900 dark:text-zinc-100">App Store</span>
                <span className="block font-bold text-zinc-900 dark:text-zinc-100">Google Play</span>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* --- Section 17: Enterprise Footer --- */}
      <footer className="w-full border-t border-zinc-200 dark:border-zinc-800 bg-zinc-900 text-zinc-400 py-12 mt-20 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h4 className="font-bold text-white uppercase tracking-wider text-[10px]">Company</h4>
            <ul className="space-y-2">
              <li><a href="#" className="hover:underline">About Us</a></li>
              <li><a href="#" className="hover:underline">Careers</a></li>
              <li><a href="#" className="hover:underline">Partners</a></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold text-white uppercase tracking-wider text-[10px]">Support</h4>
            <ul className="space-y-2">
              <li><a href="#" className="hover:underline">Help Center</a></li>
              <li><a href="#" className="hover:underline">Cancellation Options</a></li>
              <li><a href="#" className="hover:underline">Trust & Safety</a></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold text-white uppercase tracking-wider text-[10px]">Hosting</h4>
            <ul className="space-y-2">
              <li><a href="#" className="hover:underline">List Your Property</a></li>
              <li><a href="#" className="hover:underline">Host Resources</a></li>
              <li><a href="#" className="hover:underline">Community Forum</a></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold text-white uppercase tracking-wider text-[10px]">Legal</h4>
            <ul className="space-y-2">
              <li><a href="#" className="hover:underline">Privacy Policy</a></li>
              <li><a href="#" className="hover:underline">Terms of Service</a></li>
              <li><a href="#" className="hover:underline">Cookies Settings</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-white/10 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[10px]">© 2026 StaySmart Inc. All rights reserved.</p>
          <div className="flex items-center gap-4 font-bold">
            <span className="hover:underline cursor-pointer">English (IN)</span>
            <span className="hover:underline cursor-pointer">INR (₹)</span>
          </div>
        </div>
      </footer>

      <AiAssistant />
      
    </div>
  );
}
