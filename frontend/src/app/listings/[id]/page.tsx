"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AiAssistant from "@/components/AiAssistant";
import CalendarPicker from "@/components/CalendarPicker";
import VirtualTour from "@/components/VirtualTour";
import PropertyMap from "@/components/PropertyMap";
import AiPricingAnalysis from "@/components/AiPricingAnalysis";
import UserAvatar from "@/components/Avatar";
import { listingsApi, bookingsApi, reviewsApi, aiApi, paymentsApi, couponsApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import {
  Star,
  MapPin,
  Calendar,
  Users,
  Sparkles,
  ChevronRight,
  MessageSquare,
  Plus,
  Trash2,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  FileText,
  X,
  User as UserIcon,
  Check,
  Download,
  Printer,
  LayoutDashboard,
  QrCode,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

const getWeatherDesc = (code: number) => {
  if (code === 0) return { label: "Sunny / Clear", emoji: "☀️" };
  if ([1, 2, 3].includes(code)) return { label: "Partly Cloudy", emoji: "⛅" };
  if ([45, 48].includes(code)) return { label: "Foggy / Mist", emoji: "🌫️" };
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return { label: "Rainy", emoji: "🌧️" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: "Snowy", emoji: "❄️" };
  if ([95, 96, 99].includes(code)) return { label: "Thunderstorm", emoji: "⛈️" };
  return { label: "Mild / Cloudy", emoji: "☁️" };
};

interface IHouseRules {
  smokingAllowed: boolean;
  petsAllowed: boolean;
  partiesAllowed: boolean;
  childrenAllowed: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  checkInFrom?: string;
  checkInUntil?: string;
  checkOutBy?: string;
  customRules?: string[];
}

interface IListing {
  _id: string;
  title: string;
  description: string;
  images: string[];
  imageDetails?: Array<{
    url: string;
    category: "Living Room" | "Bedroom" | "Kitchen" | "Bathroom" | "Exterior" | "Other";
    order: number;
    isCover: boolean;
  }>;
  price: number;
  city: string;
  country: string;
  address: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  guests: number;
  owner: {
    _id: string;
    name: string;
    avatar: string;
    email: string;
  };
  rating: number;
  reviewCount: number;
  location: {
    coordinates: [number, number];
  };
  cancellationPolicy?: string;
  cancellationPolicyDetails?: string;
  virtualTour?: {
    enabled: boolean;
    rooms: Array<{
      id: string;
      name: string;
      panorama: string;
      hotspots?: Array<{
        pitch: number;
        yaw: number;
        type: "info" | "scene";
        text: string;
        targetRoomId?: string;
      }>;
    }>;
  };
  houseRules?: IHouseRules;
}

interface IReview {
  _id: string;
  author: {
    name: string;
    avatar: string;
  };
  rating: number;
  comment: string;
  images: string[];
  createdAt: string;
}

export default function ListingDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const router = useRouter();

  const [listing, setListing] = useState<IListing | null>(null);
  const [reviews, setReviews] = useState<IReview[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking Form State
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  // Checkout modal state
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutDetails, setCheckoutDetails] = useState<any>(null);
  const [paying, setPaying] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [upiTxnId, setUpiTxnId] = useState("");
  const [mockStatus, setMockStatus] = useState<"SUCCESS" | "FAILURE">("SUCCESS");
  const [mockMethod, setMockMethod] = useState<"CARD" | "UPI" | "NETBANKING" | "MOCK">("CARD");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"gateway" | "upi">("gateway");
  const [upiStep, setUpiStep] = useState<1 | 2>(1);

  // Available coupons list
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);

  // Carousel state
  const [showCarousel, setShowCarousel] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  // Waitlist State
  const [showWaitlistOption, setShowWaitlistOption] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  const [bookedDates, setBookedDates] = useState<any[]>([]);

  // AI Pricing Details State
  const [pricingDetails, setPricingDetails] = useState<any>(null);
  const [pricingLoading, setPricingLoading] = useState(true);

  // AI Review Intelligence State
  const [reviewSummary, setReviewSummary] = useState<any>(null);
  const [reviewSummaryLoading, setReviewSummaryLoading] = useState(true);

  // Add Review State
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [reviewPhotos, setReviewPhotos] = useState<FileList | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Geodata states
  const [weather, setWeather] = useState<any>(null);
  const [attractions, setAttractions] = useState<any[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [attractionsLoading, setAttractionsLoading] = useState(true);

  // Fetch listing details and reviews
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await listingsApi.getOne(id);
      if (res.status === "success" && res.data) {
        setListing(res.data.listing);
        setReviews(res.data.reviews || []);
      } else {
        toast.error("Listing not found");
        router.push("/");
      }
    } catch (err) {
      toast.error("Failed to load listing details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  useEffect(() => {
    if (!listing?._id) return;

    const fetchGeodata = async () => {
      try {
        const weatherRes = await listingsApi.getWeather(listing._id);
        if (weatherRes.status === "success" && weatherRes.data) {
          setWeather(weatherRes.data.weather);
        }
      } catch (err) {
        console.error("Failed to load weather data", err);
      } finally {
        setWeatherLoading(false);
      }

      try {
        const attractionsRes = await listingsApi.getNearbyAttractions(listing._id);
        if (attractionsRes.status === "success" && attractionsRes.data) {
          setAttractions(attractionsRes.data.attractions || []);
        }
      } catch (err) {
        console.error("Failed to load attractions data", err);
      } finally {
        setAttractionsLoading(false);
      }
    };

    fetchGeodata();
  }, [listing?._id]);

  // Load available coupons
  useEffect(() => {
    if (!listing?._id) return;
    const fetchCoupons = async () => {
      setCouponsLoading(true);
      try {
        const res = await couponsApi.getAvailable(listing._id);
        if (res.status === "success" && res.data) {
          setAvailableCoupons(res.data.coupons || []);
        }
      } catch (err) {
        console.error("Failed to load available coupons", err);
      } finally {
        setCouponsLoading(false);
      }
    };
    fetchCoupons();
  }, [listing?._id]);

  // Load AI Pricing on mount
  useEffect(() => {
    if (!id || loading) return;

    const fetchAiPricing = async () => {
      try {
        const res = await aiApi.getPricingDetails(id);
        if (res.status === "success") {
          setPricingDetails(res.data);
        }
      } catch (err) {
        console.error("AI Pricing load error", err);
      } finally {
        setPricingLoading(false);
      }
    };

    const fetchAiReviews = async () => {
      try {
        const res = await aiApi.getReviewInsights(id);
        if (res.status === "success") {
          setReviewSummary(res.data.summary);
        }
      } catch (err) {
        console.error("AI Reviews load error", err);
      } finally {
        setReviewSummaryLoading(false);
      }
    };

    fetchAiPricing();
    fetchAiReviews();
  }, [id, loading]);

  useEffect(() => {
    if (showCheckoutModal) {
      setShowSuccessScreen(false);
      setConfirmedBooking(null);
    }
  }, [showCheckoutModal]);

  useEffect(() => {
    if (!id) return;
    const fetchBookedDates = async () => {
      try {
        const res = await bookingsApi.getListingBookedDates(id);
        if (res.status === "success" && res.data) {
          setBookedDates(res.data.bookedDates || []);
        }
      } catch (err) {
        console.error("Failed to load booked dates", err);
      }
    };
    fetchBookedDates();
  }, [id]);

  // Initiate checkout & acquire lock
  const handleBookingInit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to reserve stays");
      return;
    }

    if (!startDate || !endDate) {
      toast.error("Please enter booking dates");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      toast.error("Checkout must be after check-in");
      return;
    }

    setBookingLoading(true);
    try {
      const res = await paymentsApi.checkout({
        listingId: id,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        couponCode: couponCode.trim() || undefined,
      });

      if (res.status === "success") {
        setCheckoutDetails(res.data);
        setShowCheckoutModal(true);
        setShowWaitlistOption(false);
        toast.success("Dates locked! Complete your payment details.");
      } else {
        toast.error(res.message || "Overlapping booking detected.");
        setShowWaitlistOption(true);
      }
    } catch (err) {
      toast.error("Locking checkouts failed.");
      setShowWaitlistOption(true);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!user) {
      toast.error("Please login to join the waitlist");
      return;
    }
    setWaitlistLoading(true);
    try {
      const res = await bookingsApi.joinWaitlist({
        listingId: id,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });
      if (res.status === "success") {
        toast.success("Joined waitlist! We will notify you if these dates open up.");
        setShowWaitlistOption(false);
      } else {
        toast.error(res.message || "Failed to join waitlist");
      }
    } catch (err) {
      toast.error("Failed to connect to waitlist server");
    } finally {
      setWaitlistLoading(false);
    }
  };

  const loadRazorpayJs = (): Promise<any> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve((window as any).Razorpay);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve((window as any).Razorpay);
      script.onerror = () => resolve(null);
      document.body.appendChild(script);
    });
  };

  // Razorpay is the single supported payment gateway.
  const handleMockPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutDetails) return;
    setPaying(true);

    try {
      const res = await paymentsApi.confirmMock({
        bookingId: checkoutDetails.bookingId,
        status: mockStatus,
        paymentMethod: mockMethod,
      });

      if (res.status === "success") {
        if (mockStatus === "SUCCESS") {
          toast.success("Mock payment successful! Booking confirmed.");
          setConfirmedBooking(res.data.booking);
          setShowSuccessScreen(true);
        } else {
          toast.error("Mock payment failed as requested. You can retry.");
        }
      } else {
        toast.error(res.message || "Mock payment confirmation failed.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during mock payment.");
    } finally {
      setPaying(false);
    }
  };

  // The server creates the order; Razorpay verifies the customer payment;
  // the server verifies the signature and captured status before confirming the booking.
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutDetails) return;

    setPaying(true);

    try {
      const Razorpay = await loadRazorpayJs();
      if (!Razorpay) {
        toast.error("Unable to load Razorpay Checkout. Check your internet connection.");
        return;
      }

      const options = {
        key: checkoutDetails.keyId,
        amount: checkoutDetails.amount,
        currency: checkoutDetails.currency || "INR",
        name: "StaySmart",
        description: `Booking for ${listing?.title || "your stay"}`,
        order_id: checkoutDetails.orderId,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        theme: {
          color: "#4f46e5",
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const result = await paymentsApi.confirm({
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
              bookingId: checkoutDetails.bookingId,
            });

            if (result.status === "success") {
              toast.success("Payment successful. Booking confirmed!");
              setConfirmedBooking(result.data.booking);
              setShowSuccessScreen(true);
            } else {
              toast.error(result.message || "Payment verification failed.");
            }
          } catch (error) {
            toast.error("Payment verification failed. Please contact support if money was deducted.");
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      };

      const razorpay = new Razorpay(options);
      razorpay.on("payment.failed", (response: any) => {
        setPaying(false);
        toast.error(response?.error?.description || "Payment failed. Please try again.");
      });
    } catch (error) {
      setPaying(false);
      toast.error("Unable to start Razorpay Checkout.");
    }
  };

  const handleUpiPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiTxnId.trim()) return toast.error("Please enter the UPI Transaction Reference ID.");
    if (!/^[a-zA-Z0-9]{12}$/.test(upiTxnId.trim())) {
      return toast.error("Invalid UPI Transaction Reference ID format. Must be 12 alphanumeric characters.");
    }

    setPaying(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api"}/payments/upi/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
        },
        body: JSON.stringify({
          listingId: listing?._id,
          startDate,
          endDate,
          couponCode,
          upiTxnId: upiTxnId.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        toast.success("UPI payment transaction submitted!");
        setConfirmedBooking(data.data.booking);
        setShowSuccessScreen(true);
      } else {
        toast.error(data.message || "Failed to submit UPI details.");
      }
    } catch (err) {
      toast.error("Network error submitting UPI payment.");
    } finally {
      setPaying(false);
    }
  };

  const handleDownloadPdf = async (bookingId: string) => {
    const downloadToastId = toast.loading("Generating PDF Invoice...");
    try {
      const token = localStorage.getItem("accessToken") || "";
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api"}/payments/invoice/${bookingId}/pdf`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Failed to download PDF invoice.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-STAY-${bookingId.substring(18, 24).toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF downloaded successfully!", { id: downloadToastId });
    } catch (err) {
      toast.error("Failed to generate PDF.", { id: downloadToastId });
    }
  };

  // Submit Review Handler
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to write reviews");
      return;
    }

    if (!newComment.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    setReviewSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("rating", newRating.toString());
      formData.append("comment", newComment);

      if (reviewPhotos) {
        for (let i = 0; i < reviewPhotos.length; i++) {
          formData.append("images", reviewPhotos[i]);
        }
      }

      const res = await reviewsApi.create(id, formData);
      if (res.status === "success") {
        toast.success("Review posted successfully!");
        setNewComment("");
        setNewRating(5);
        setReviewPhotos(null);
        loadData();
      } else {
        toast.error(res.message || "Failed to post review");
      }
    } catch (err) {
      toast.error("Review posting failed");
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Navbar />
        <div className="flex-1 max-w-7xl mx-auto px-4 py-16 w-full animate-pulse space-y-6">
          <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
          <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4" />
          <div className="h-96 bg-zinc-200 dark:bg-zinc-800 rounded-3xl" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!listing) return null;

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title & Metadata Headers */}
        <div className="mb-6 space-y-2">
          <h1 className="font-outfit text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {listing.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">{listing.rating.toFixed(1)}</span>
              <span>({listing.reviewCount} reviews)</span>
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{listing.address}, {listing.city}, {listing.country}</span>
            </span>
            <span className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" /> Instant Book available
            </span>
          </div>
        </div>

        {/* Gallery grid layout */}
        {(!listing.images || listing.images.length === 0) ? (
          <div className="flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 p-12 rounded-3xl bg-zinc-50 dark:bg-zinc-950/20 text-zinc-400 aspect-[16/9] max-h-[420px] mb-8">
            <span className="text-4xl mb-2">📸</span>
            <p className="font-semibold text-sm">No photos uploaded by the host.</p>
          </div>
        ) : listing.images.length === 1 ? (
          <div
            onClick={() => {
              setActivePhotoIdx(0);
              setShowCarousel(true);
            }}
            className="w-full rounded-3xl overflow-hidden mb-8 shadow-sm aspect-[16/9] max-h-[420px] cursor-pointer relative group"
          >
            <img
              src={listing.images[0]}
              alt={listing.title}
              className="h-full w-full object-cover group-hover:scale-[1.01] transition duration-500"
            />
          </div>
        ) : (
          <div
            onClick={() => {
              setActivePhotoIdx(0);
              setShowCarousel(true);
            }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-3xl overflow-hidden mb-8 shadow-sm aspect-[16/9] max-h-[420px] cursor-pointer relative group"
          >
            <div className="h-full w-full relative">
              <img
                src={listing.images[0]}
                alt={listing.title}
                className="h-full w-full object-cover group-hover:scale-[1.01] transition duration-500"
              />
            </div>
            <div className="hidden md:grid grid-cols-2 gap-4 h-full">
              {listing.images.slice(1, 5).map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={listing.title}
                  className="h-full w-full object-cover hover:opacity-95 transition"
                />
              ))}
            </div>
            <div className="absolute bottom-4 right-4 bg-white/90 dark:bg-zinc-950/90 text-zinc-900 dark:text-zinc-50 px-3 py-1.5 rounded-xl font-bold text-[10px] shadow border border-zinc-200 dark:border-zinc-800 uppercase tracking-wider">
              📸 Show all photos
            </div>
          </div>
        )}

        {/* Details columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Main info pane */}
          <div className="lg:col-span-2 space-y-8">
            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6 flex items-center justify-between">
              <div className="space-y-3">
                <div className="space-y-1">
                  <h2 className="font-outfit text-xl font-bold text-zinc-900 dark:text-zinc-50">
                    {listing.propertyType} hosted by {listing.owner.name}
                  </h2>
                  <p className="text-xs text-zinc-500">
                    {listing.guests} guests • {listing.bedrooms} bedrooms • {listing.bathrooms} bathrooms
                  </p>
                </div>
                
                {/* Contact Host button */}
                <button
                  onClick={() => {
                    if (!user) {
                      toast.error("Please sign in to contact the host.");
                      router.push("/login");
                      return;
                    }
                    if (user.id === listing.owner._id) {
                      toast.error("You cannot message yourself.");
                      return;
                    }
                    router.push(`/messages?hostId=${listing.owner._id}&listingId=${listing._id}`);
                  }}
                  className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Message Host</span>
                </button>
              </div>
              <UserAvatar user={listing.owner} size="lg" />
            </div>

            {/* Description */}
            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
              <h3 className="font-outfit text-lg font-bold mb-3">About this space</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {listing.description}
              </p>
            </div>

            {/* AI Pricing & Competitor Intelligence panel */}
            <AiPricingAnalysis pricingDetails={pricingDetails} currentPrice={listing.price} />

            {/* AI Review Sentiment Insights */}
            <div className="border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl bg-white dark:bg-zinc-900 space-y-4 shadow-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-500" />
                <h3 className="font-outfit font-bold text-sm text-zinc-900 dark:text-zinc-100">
                  AI Review Sentiment Synthesis
                </h3>
              </div>

              {reviewSummaryLoading ? (
                <div className="h-20 bg-zinc-50 dark:bg-zinc-950 rounded-2xl animate-pulse" />
              ) : reviewSummary ? (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="font-bold text-emerald-500 block mb-1">Key Pros:</span>
                      <ul className="list-disc list-inside space-y-1 text-zinc-600 dark:text-zinc-400">
                        {reviewSummary.pros.map((p: string, idx: number) => <li key={idx}>{p}</li>)}
                      </ul>
                    </div>
                    <div>
                      <span className="font-bold text-rose-500 block mb-1">Room for improvement:</span>
                      <ul className="list-disc list-inside space-y-1 text-zinc-600 dark:text-zinc-400">
                        {reviewSummary.cons.map((c: string, idx: number) => <li key={idx}>{c}</li>)}
                      </ul>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-3 text-center">
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Cleanliness</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">{reviewSummary.cleanlinessScore}/10</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Quietness</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">{10 - reviewSummary.noiseLevelScore}/10</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Sentiment</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">{reviewSummary.sentimentScore}% Positive</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-400">Review analysis is currently unavailable.</p>
              )}
            </div>

            {/* Map View */}
            <div className="space-y-4">
              <h3 className="font-outfit text-lg font-bold">Where you'll be</h3>
              <div className="h-72 w-full rounded-3xl overflow-hidden relative shadow-sm">
                {listing.location?.coordinates ? (
                  <PropertyMap 
                    latitude={listing.location.coordinates[1]} 
                    longitude={listing.location.coordinates[0]} 
                  />
                ) : (
                  <div className="h-full w-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <p className="text-xs text-zinc-400">Location coordinates unavailable.</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <MapPin className="w-4 h-4 text-rose-500" />
                <span>{listing.address || `${listing.city}, ${listing.country}`}</span>
              </div>
            </div>

            {/* Virtual Property Tour Panel */}
            <div className="space-y-4">
              <h3 className="font-outfit text-lg font-bold text-zinc-900 dark:text-zinc-50">Virtual Property Tour</h3>
              <VirtualTour
                tourData={listing.virtualTour}
                imageDetails={listing.imageDetails}
                images={listing.images}
              />
            </div>

            {/* Nearby Attractions & Transit */}
            <div className="border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl bg-white dark:bg-zinc-900 space-y-4 shadow-sm">
              <h3 className="font-outfit text-lg font-bold">What's Nearby</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Dynamic Attractions */}
                {attractionsLoading ? (
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl space-y-2 animate-pulse col-span-2">
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
                    <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3" />
                  </div>
                ) : attractions.length > 0 ? (
                  <>
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl space-y-2">
                      <span className="font-bold block text-zinc-900 dark:text-zinc-50">📍 Sightseeing & Leisure</span>
                      <div className="space-y-1 text-zinc-500 text-[11px]">
                        {attractions.filter((a) => a.type === "Tourism").slice(0, 3).map((a, i) => (
                          <div key={i} className="flex justify-between">
                            <span>{a.name}</span>
                            <span className="font-semibold text-zinc-400">{a.distance || "Nearby"}</span>
                          </div>
                        ))}
                        {attractions.filter((a) => a.type === "Tourism").length === 0 && (
                          <p className="italic text-[10px] text-zinc-400">No tourist spots listed nearby.</p>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl space-y-2">
                      <span className="font-bold block text-zinc-900 dark:text-zinc-50">🍽️ Dining & Cafes</span>
                      <div className="space-y-1 text-zinc-500 text-[11px]">
                        {attractions.filter((a) => a.type === "Dining").slice(0, 3).map((a, i) => (
                          <div key={i} className="flex justify-between">
                            <span>{a.name}</span>
                            <span className="font-semibold text-zinc-400">{a.distance || "Nearby"}</span>
                          </div>
                        ))}
                        {attractions.filter((a) => a.type === "Dining").length === 0 && (
                          <p className="italic text-[10px] text-zinc-400">No eateries found nearby.</p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl text-zinc-400 italic text-center col-span-2">
                    Nearby attractions temporarily unavailable.
                  </div>
                )}

                {/* Weather Widget */}
                {weatherLoading ? (
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl flex items-center justify-between animate-pulse col-span-2">
                    <div className="space-y-2">
                      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-24" />
                      <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-16" />
                    </div>
                    <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-12" />
                  </div>
                ) : weather ? (
                  (() => {
                    const desc = getWeatherDesc(weather.current_weather?.weathercode ?? 1);
                    return (
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl flex items-center justify-between col-span-2 border border-indigo-500/10">
                        <div>
                          <span className="font-bold block text-zinc-900 dark:text-zinc-50">
                            {desc.emoji} Current Local Weather
                          </span>
                          <span className="text-zinc-500 text-[11px] block">{desc.label}</span>
                          <span className="text-[10px] text-zinc-400">Wind: {weather.current_weather?.windspeed} km/h</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                            {weather.current_weather?.temperature}°C
                          </span>
                          <span className="text-[10px] text-zinc-400 block">Open-Meteo Verified</span>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl text-zinc-400 italic text-center col-span-2">
                    Weather forecast unavailable.
                  </div>
                )}
              </div>
            </div>

            {/* Rules & Policies */}
            <div className="border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl bg-white dark:bg-zinc-900 space-y-4 shadow-sm text-xs">
              <h3 className="font-outfit text-lg font-bold text-zinc-900 dark:text-zinc-50">Rules & Policies</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 block">🏡 House Rules</span>
                  <div className="grid grid-cols-2 gap-2 text-zinc-500 text-[11px] mb-2">
                    <div>⏱️ Check-in: {listing.houseRules?.checkInFrom || "14:00"} - {listing.houseRules?.checkInUntil || "22:00"}</div>
                    <div>⏱️ Checkout: By {listing.houseRules?.checkOutBy || "11:00"}</div>
                    <div>🚬 Smoking: {listing.houseRules?.smokingAllowed ? "Allowed" : "Not Allowed"}</div>
                    <div>🐾 Pets: {listing.houseRules?.petsAllowed ? "Allowed" : "Not Allowed"}</div>
                    <div>🎉 Parties: {listing.houseRules?.partiesAllowed ? "Allowed" : "Not Allowed"}</div>
                    <div>👶 Children: {listing.houseRules?.childrenAllowed ? "Allowed" : "Not Allowed"}</div>
                  </div>
                  {listing.houseRules?.quietHoursStart && listing.houseRules?.quietHoursEnd && (
                    <div className="text-[11px] text-zinc-500">🤫 Quiet Hours: {listing.houseRules.quietHoursStart} - {listing.houseRules.quietHoursEnd}</div>
                  )}
                  {listing.houseRules?.customRules && listing.houseRules.customRules.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <span className="font-bold text-zinc-700 dark:text-zinc-300 block text-[10px] uppercase">Additional Rules:</span>
                      <ul className="list-disc pl-4 space-y-1 text-zinc-500 text-[11px]">
                        {listing.houseRules.customRules.map((rule: string, idx: number) => (
                          <li key={idx}>{rule}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 block">🛡️ Cancellation Policy ({listing.cancellationPolicy || "Moderate"})</span>
                  <p className="text-zinc-500 text-[11px] leading-relaxed">
                    {listing.cancellationPolicy === "Flexible" && (
                      "Flexible policy: Cancel up to 24 hours before check-in for a 100% refund. Cancellations within 24 hours of check-in are subject to 0% base stay refund (cleaning fee and taxes will still be returned)."
                    )}
                    {listing.cancellationPolicy === "Strict" && (
                      "Strict policy: Cancel up to 14 days before check-in for a 100% refund. Cancel between 7 to 14 days before check-in for a 50% refund. Cancellations within 7 days of check-in are non-refundable."
                    )}
                    {(listing.cancellationPolicy === "Moderate" || !listing.cancellationPolicy) && (
                      "Moderate policy: Cancel up to 5 days before check-in for a 100% refund. Cancel between 2 to 5 days before check-in for a 50% refund. Cancellations within 48 hours of check-in are non-refundable."
                    )}
                    {listing.cancellationPolicy === "Custom" && (
                      listing.cancellationPolicyDetails || "Custom policy details not specified by host."
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Widget Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl bg-white dark:bg-zinc-900 shadow-xl space-y-6">
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">₹{listing.price}</span>
                  <span className="text-xs text-zinc-500"> / night</span>
                </div>
              </div>

              <form onSubmit={handleBookingInit} className="space-y-4">
                <CalendarPicker
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(start, end) => {
                    setStartDate(start);
                    setEndDate(end);
                  }}
                  bookedDates={bookedDates}
                />

                <div>
                  <label className="block text-[10px] uppercase font-bold text-zinc-400 mb-1">Have a coupon?</label>
                  {!couponCode ? (
                    <select
                      value=""
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="">Select available coupon ▼</option>
                      {availableCoupons.length === 0 ? (
                        <option disabled>No coupons available</option>
                      ) : (
                        availableCoupons.map((coupon) => (
                          <option key={coupon._id} value={coupon.code}>
                            {coupon.code} — {coupon.discountPercent}% OFF
                          </option>
                        ))
                      )}
                    </select>
                  ) : (
                    <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 p-3 rounded-xl text-xs">
                      <div>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 block">Coupon Applied ✓</span>
                        <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200 mr-2">{couponCode}</span>
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-md font-bold">
                          {availableCoupons.find((c) => c.code === couponCode)?.discountPercent || 10}% OFF
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCouponCode("")}
                        className="text-xs text-red-500 hover:text-red-750 font-bold px-2 py-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="w-full py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm shadow transition disabled:opacity-50"
                >
                  {bookingLoading ? "Locking checkout dates..." : "Reserve Stay"}
                </button>

                {showWaitlistOption && (
                  <button
                    type="button"
                    onClick={handleJoinWaitlist}
                    disabled={waitlistLoading}
                    className="w-full py-2.5 mt-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    {waitlistLoading ? "Joining queue..." : "Join Dates Waitlist"}
                  </button>
                )}
              </form>

              <div className="text-center text-[10px] text-zinc-500">
                You won't be charged yet. Secures date locks.
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Lists */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-8 mb-8 space-y-8">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-rose-500" />
            <h2 className="font-outfit text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Reviews ({reviews.length})
            </h2>
          </div>

          {reviews.length === 0 ? (
            <p className="text-zinc-500 text-xs italic">No reviews for this home yet. Be the first to review!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reviews.map((rev) => (
                <div
                  key={rev._id}
                  className="border border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/10 p-5 rounded-3xl space-y-4"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <UserAvatar user={rev.author} size="sm" />
                      <div>
                        <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-50">{rev.author.name}</h4>
                        <span className="text-[10px] text-zinc-400">
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {rev.comment}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Add critique form */}
          {user ? (
            <div className="w-full max-w-xl border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl bg-white dark:bg-zinc-900 space-y-4 shadow-sm">
              <h3 className="font-outfit text-base font-bold flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                <span>Write a critique review</span>
              </h3>

              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">Rating (1-5 stars)</label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRating(star)}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`h-6 w-6 transition ${
                            star <= newRating ? "fill-amber-400 text-amber-400" : "text-zinc-300 dark:text-zinc-700"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Comment</label>
                  <textarea
                    required
                    rows={4}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Provide details about your stay experience..."
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Attach review photos (Optional)</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setReviewPhotos(e.target.files)}
                    className="text-xs text-zinc-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-200 dark:file:bg-zinc-800 file:text-zinc-700 dark:file:text-zinc-300"
                  />
                </div>

                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition"
                >
                  {reviewSubmitting ? "Posting..." : "Submit critique"}
                </button>
              </form>
            </div>
          ) : (
            <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/10 text-xs text-zinc-500 italic">
              Please login or create an account to write reviews for this property.
            </div>
          )}
        </div>
      </main>

      {/* Razorpay Checkout Modal Panel */}
      <AnimatePresence>
        {showCheckoutModal && checkoutDetails && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col"
            >
              {showSuccessScreen && confirmedBooking ? (
                /* Success Screen */
                <div className="p-6 text-center space-y-6 flex flex-col items-center">
                  <div className="no-print w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/50 dark:border-emerald-900/30">
                    <Check className="w-8 h-8" />
                  </div>
                  <div className="no-print">
                    <h3 className="font-outfit font-bold text-lg text-zinc-900 dark:text-zinc-50">
                      {confirmedBooking.status === "PendingVerification" ? "Booking Submitted ✓" : "Payment Successful ✓"}
                    </h3>
                    <p className={`${confirmedBooking.status === "PendingVerification" ? "text-amber-500" : "text-emerald-500"} font-semibold text-xs mt-1`}>
                      {confirmedBooking.status === "PendingVerification" ? "Pending Host Verification" : "Booking Confirmed ✓"}
                    </p>
                  </div>
                  
                  {/* Reference Receipt */}
                  <div id="booking-receipt" className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl text-left text-xs space-y-4">
                    <div className="text-center border-b border-zinc-200 dark:border-zinc-800 pb-3">
                      <h2 className="text-base font-bold font-outfit text-zinc-900 dark:text-zinc-550">StaySmart</h2>
                      <p className="text-[9px] text-zinc-400 font-medium">AI-Enhanced Vacation Rental Platform</p>
                      <h3 className="text-[10px] font-bold font-outfit text-indigo-650 dark:text-indigo-400 uppercase tracking-wider mt-2">Booking Confirmation & Invoice</h3>
                    </div>

                    {/* Stay Details */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-[9px] uppercase text-zinc-400 tracking-wider">Stay Details</h4>
                      <div className="grid grid-cols-2 gap-2 text-zinc-650 dark:text-zinc-350">
                        <div>
                          <span className="block text-[9px] text-zinc-400">Booking ID</span>
                          <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                            {`STAY-${confirmedBooking._id.substring(0, 8).toUpperCase()}`}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-zinc-400">Property</span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate block">
                            {listing?.title}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-zinc-400">City</span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                            {listing?.city || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-zinc-400">Check-In Date</span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                            {new Date(confirmedBooking.startDate).toDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-zinc-400">Check-Out Date</span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                            {new Date(confirmedBooking.endDate).toDateString()}
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
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{user?.name || "Guest"}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-zinc-400">Email Address</span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate block">{user?.email || "N/A"}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-zinc-400">Transaction Reference</span>
                          <span className="font-mono text-zinc-800 dark:text-zinc-200 block truncate">
                            {confirmedBooking.upiTxnId || confirmedBooking.orderId || confirmedBooking._id}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-zinc-400">Payment Method</span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200 uppercase">
                            {confirmedBooking.paymentMethod || "Mock"}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-zinc-400">Payment Provider</span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {confirmedBooking.paymentMethod?.toLowerCase() === "upi"
                              ? "Direct UPI"
                              : confirmedBooking.paymentMethod?.toLowerCase() === "mock"
                              ? "Mock Gateway"
                              : "Razorpay Gateway"}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-zinc-400">Booking Status</span>
                          <span className={`font-bold uppercase ${
                            confirmedBooking.status === "Confirmed"
                              ? "text-emerald-600 animate-none"
                              : confirmedBooking.status === "PendingVerification"
                              ? "text-amber-500 animate-none"
                              : "text-zinc-500 animate-none"
                          }`}>
                            {confirmedBooking.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Charges Breakdown */}
                    <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 space-y-2">
                      <h4 className="font-bold text-[9px] uppercase text-zinc-400 tracking-wider">Charges Breakdown</h4>
                      <div className="space-y-1.5 text-zinc-600 dark:text-zinc-400">
                        <div className="flex justify-between">
                          <span>Stay base price ({confirmedBooking.pricingSnapshot?.nights || Math.round((new Date(confirmedBooking.endDate).getTime() - new Date(confirmedBooking.startDate).getTime()) / (1000 * 60 * 60 * 24))} nights)</span>
                          <span>₹{(confirmedBooking.pricingSnapshot?.accommodationAmount || (confirmedBooking.totalPrice - confirmedBooking.taxes - confirmedBooking.cleaningFee)).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cleaning Fee</span>
                          <span>₹{(confirmedBooking.pricingSnapshot?.cleaningFee || confirmedBooking.cleaningFee || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Occupancy Taxes & GST</span>
                          <span>₹{(confirmedBooking.pricingSnapshot?.gstAmount || confirmedBooking.taxes || 0).toLocaleString()}</span>
                        </div>
                        {(confirmedBooking.pricingSnapshot?.discount || 0) > 0 && (
                          <div className="flex justify-between text-emerald-500">
                            <span>Promo Discount</span>
                            <span>-₹{confirmedBooking.pricingSnapshot?.discount.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-100 text-xs border-t border-zinc-100 dark:border-zinc-800/80 pt-2 mt-1">
                          <span>Grand Total Paid</span>
                          <span>₹{confirmedBooking.totalPrice.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="no-print w-full space-y-2.5">
                    <button
                      onClick={() => {
                        setShowCheckoutModal(false);
                        setShowSuccessScreen(false);
                        router.push("/dashboard/guest");
                      }}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>View in My Trips</span>
                    </button>
                    
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        onClick={() => handleDownloadPdf(confirmedBooking._id)}
                        className="py-2.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-[10px] font-bold text-zinc-600 dark:text-zinc-400 flex items-center justify-center gap-1 transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </button>
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
                        className="py-2.5 border border-zinc-200 dark:border-zinc-800 disabled:opacity-50 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-[10px] font-bold text-zinc-600 dark:text-zinc-400 flex items-center justify-center gap-1 transition cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{isPrinting ? "Printing..." : "Print Receipt"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900">
                    <div>
                      <h3 className="font-bold font-outfit text-base">Complete Secure Checkout</h3>
                      <span className="text-[10px] text-zinc-400">Locking booking dates for 5 minutes</span>
                    </div>
                    <button
                      onClick={() => setShowCheckoutModal(false)}
                      className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400 transition animate-none"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Selector bar */}
                  <div className="px-6 pt-4 pb-2 border-b border-zinc-150 dark:border-zinc-850">
                    <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-2">Select Payment Method</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedPaymentMethod("gateway")}
                        className={`py-3 px-4 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                          selectedPaymentMethod === "gateway"
                            ? "bg-indigo-50 border-indigo-500 text-indigo-750 dark:bg-indigo-950/20 dark:border-indigo-850 dark:text-indigo-400 font-outfit"
                            : "bg-white border-zinc-200 text-zinc-600 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-450 hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                        }`}
                      >
                        <span>💳 {checkoutDetails.gateway === "mock" ? "Test Gateway" : "Razorpay Gateway"}</span>
                      </button>
                      <button
                        type="button"
                        disabled={!checkoutDetails.hostUpiDetails?.upiId}
                        onClick={() => {
                          setSelectedPaymentMethod("upi");
                          setUpiStep(1);
                        }}
                        className={`py-3 px-4 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                          !checkoutDetails.hostUpiDetails?.upiId ? "opacity-50 cursor-not-allowed" : ""
                        } ${
                          selectedPaymentMethod === "upi"
                            ? "bg-indigo-50 border-indigo-500 text-indigo-750 dark:bg-indigo-950/20 dark:border-indigo-850 dark:text-indigo-400 font-outfit"
                            : "bg-white border-zinc-200 text-zinc-650 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-450 hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                        }`}
                      >
                        <span>📱 Direct UPI</span>
                      </button>
                    </div>
                    {!checkoutDetails.hostUpiDetails?.upiId && (
                      <p className="text-[10px] text-rose-500 mt-1.5 font-semibold">Direct UPI is unavailable because the host has not configured their UPI payment details.</p>
                    )}
                  </div>

                  {selectedPaymentMethod === "gateway" ? (
                    checkoutDetails.gateway === "mock" ? (
                      <form onSubmit={handleMockPaymentSubmit} className="p-6 space-y-6">
                        {/* Cost breakup list */}
                        <div className="space-y-2 text-xs border-b border-zinc-100 dark:border-zinc-800 pb-4">
                          <div className="flex justify-between text-zinc-500">
                            <span>Stay base price ({checkoutDetails.nights} nights)</span>
                            <span>₹{checkoutDetails.pricing.accommodationAmount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-zinc-500">
                            <span>Cleaning Fee</span>
                            <span>₹{checkoutDetails.pricing.cleaningFee.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-zinc-500">
                            <span>Platform Service Fee</span>
                            <span>₹{checkoutDetails.pricing.platformFee.toLocaleString()}</span>
                          </div>
                          {checkoutDetails.pricing.cgst > 0 && (
                            <div className="flex justify-between text-zinc-500">
                              <span>CGST ({Math.round(checkoutDetails.pricing.gstRate * 50)}%)</span>
                              <span>₹{checkoutDetails.pricing.cgst.toLocaleString()}</span>
                            </div>
                          )}
                          {checkoutDetails.pricing.sgst > 0 && (
                            <div className="flex justify-between text-zinc-500">
                              <span>SGST ({Math.round(checkoutDetails.pricing.gstRate * 50)}%)</span>
                              <span>₹{checkoutDetails.pricing.sgst.toLocaleString()}</span>
                            </div>
                          )}
                          {checkoutDetails.pricing.igst > 0 && (
                            <div className="flex justify-between text-zinc-500">
                              <span>IGST ({Math.round(checkoutDetails.pricing.gstRate * 100)}%)</span>
                              <span>₹{checkoutDetails.pricing.igst.toLocaleString()}</span>
                            </div>
                          )}
                          {checkoutDetails.pricing.discount > 0 && (
                            <div className="flex justify-between text-emerald-500">
                              <span>Promo Coupon Applied</span>
                              <span>-₹{checkoutDetails.pricing.discount.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-100 text-sm pt-1">
                            <span>Total due charged</span>
                            <span>₹{checkoutDetails.pricing.totalPrice.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Mock payment controls */}
                        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4 space-y-4">
                          <div className="text-center pb-2 border-b border-zinc-100 dark:border-zinc-850">
                            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Test Payment Gateway</p>
                            <p className="text-[10px] text-zinc-500 mt-0.5 font-semibold">Please simulate a test card or UPI payout below.</p>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Select Payment Method</label>
                              <select
                                value={mockMethod}
                                onChange={(e) => setMockMethod(e.target.value as any)}
                                className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              >
                                <option value="CARD">Credit/Debit Card (Mock)</option>
                                <option value="UPI">UPI Payment (Mock)</option>
                                <option value="NETBANKING">Netbanking (Mock)</option>
                                <option value="MOCK">Direct Mock Provider</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Select Outcome Scenario</label>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setMockStatus("SUCCESS")}
                                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                                    mockStatus === "SUCCESS"
                                      ? "bg-emerald-50 border-emerald-300 text-emerald-750 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400 font-outfit"
                                      : "bg-white border-zinc-200 text-zinc-600 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-450"
                                  }`}
                                >
                                  TEST SUCCESS
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setMockStatus("FAILURE")}
                                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                                    mockStatus === "FAILURE"
                                      ? "bg-rose-50 border-rose-300 text-rose-755 dark:bg-rose-950/20 dark:border-rose-800 dark:text-rose-400 font-outfit"
                                      : "bg-white border-zinc-200 text-zinc-650 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-450"
                                  }`}
                                >
                                  TEST FAILURE
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={paying}
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          {paying ? "Processing..." : `Confirm Payment: ₹${checkoutDetails.pricing.totalPrice.toLocaleString()}`}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handlePaymentSubmit} className="p-6 space-y-6">
                        {/* Cost breakup list */}
                        <div className="space-y-2 text-xs border-b border-zinc-100 dark:border-zinc-800 pb-4">
                          <div className="flex justify-between text-zinc-500">
                            <span>Stay base price ({checkoutDetails.nights} nights)</span>
                            <span>₹{checkoutDetails.pricing.accommodationAmount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-zinc-500">
                            <span>Cleaning Fee</span>
                            <span>₹{checkoutDetails.pricing.cleaningFee.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-zinc-500">
                            <span>Platform Service Fee</span>
                            <span>₹{checkoutDetails.pricing.platformFee.toLocaleString()}</span>
                          </div>
                          {checkoutDetails.pricing.cgst > 0 && (
                            <div className="flex justify-between text-zinc-500">
                              <span>CGST ({Math.round(checkoutDetails.pricing.gstRate * 50)}%)</span>
                              <span>₹{checkoutDetails.pricing.cgst.toLocaleString()}</span>
                            </div>
                          )}
                          {checkoutDetails.pricing.sgst > 0 && (
                            <div className="flex justify-between text-zinc-500">
                              <span>SGST ({Math.round(checkoutDetails.pricing.gstRate * 50)}%)</span>
                              <span>₹{checkoutDetails.pricing.sgst.toLocaleString()}</span>
                            </div>
                          )}
                          {checkoutDetails.pricing.igst > 0 && (
                            <div className="flex justify-between text-zinc-500">
                              <span>IGST ({Math.round(checkoutDetails.pricing.gstRate * 100)}%)</span>
                              <span>₹{checkoutDetails.pricing.igst.toLocaleString()}</span>
                            </div>
                          )}
                          {checkoutDetails.pricing.discount > 0 && (
                            <div className="flex justify-between text-emerald-500">
                              <span>Promo Coupon Applied</span>
                              <span>-₹{checkoutDetails.pricing.discount.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-100 text-sm pt-1">
                            <span>Total due charged</span>
                            <span>₹{checkoutDetails.pricing.totalPrice.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4 space-y-2">
                          <div className="flex items-center gap-2 font-bold text-sm">
                            <ShieldCheck className="w-4 h-4 text-indigo-500" />
                            Secure Razorpay Checkout
                          </div>
                          <p className="text-[11px] text-zinc-550 dark:text-zinc-400 leading-relaxed">
                            Pay securely with Razorpay. Available payment methods such as cards and UPI
                            are shown by Razorpay based on your account and location. StaySmart never
                            stores your card or UPI credentials.
                          </p>
                        </div>

                        <button
                          type="submit"
                          disabled={paying}
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          {paying ? "Processing..." : `Confirm Payment: ₹${checkoutDetails.pricing.totalPrice.toLocaleString()}`}
                        </button>
                      </form>
                    )
                  ) : (
                    <form onSubmit={handleUpiPaymentSubmit} className="p-6 space-y-6">
                      {/* Cost breakup list */}
                      <div className="space-y-2 text-xs border-b border-zinc-100 dark:border-zinc-805 pb-4">
                        <div className="flex justify-between text-zinc-505">
                          <span>Stay base price ({checkoutDetails.nights} nights)</span>
                          <span>₹{checkoutDetails.pricing.accommodationAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-zinc-505">
                          <span>Cleaning Fee</span>
                          <span>₹{checkoutDetails.pricing.cleaningFee.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-zinc-505">
                          <span>Platform Service Fee & Taxes</span>
                          <span>₹{(checkoutDetails.pricing.platformFee + checkoutDetails.pricing.gstAmount).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-bold text-zinc-900 dark:text-zinc-100 text-sm pt-1">
                          <span>Total due amount</span>
                          <span>₹{checkoutDetails.pricing.totalPrice.toLocaleString()}</span>
                        </div>
                      </div>

                      {upiStep === 1 ? (
                        /* Step 1: Scan & Pay */
                        <div className="space-y-5">
                          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4 space-y-4">
                            <div className="text-center">
                              <p className="text-xs font-bold text-zinc-750 dark:text-zinc-300">Scan QR Code to Pay</p>
                              <p className="text-[10px] text-zinc-500 mt-0.5 font-semibold">Pay ₹{checkoutDetails.pricing.totalPrice.toLocaleString()} directly to host</p>
                              
                              {checkoutDetails.hostUpiDetails?.upiQrCodeUrl ? (
                                <img
                                  src={checkoutDetails.hostUpiDetails.upiQrCodeUrl}
                                  alt="UPI QR Code"
                                  className="w-36 h-36 mx-auto object-contain border rounded-xl bg-white shadow-sm mt-3 p-1"
                                />
                              ) : (
                                /* Auto-generated QR Code */
                                <img
                                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                                    `upi://pay?pa=${checkoutDetails.hostUpiDetails?.upiId}&pn=${encodeURIComponent(
                                      checkoutDetails.hostUpiDetails?.accountHolderName || "Host"
                                    )}&am=${checkoutDetails.pricing.totalPrice}&cu=INR`
                                  )}`}
                                  alt="Auto-generated UPI QR Code"
                                  className="w-36 h-36 mx-auto object-contain border rounded-xl bg-white shadow-sm mt-3 p-1"
                                />
                              )}
                            </div>

                            <div className="text-xs space-y-2 border-t border-zinc-200/50 dark:border-zinc-800/80 pt-3">
                              <div className="flex justify-between">
                                <span className="text-zinc-550 dark:text-zinc-400">Account Holder:</span>
                                <span className="font-semibold text-zinc-850 dark:text-zinc-200">
                                  {checkoutDetails.hostUpiDetails?.accountHolderName || "Host"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-550 dark:text-zinc-400">UPI Address (VPA):</span>
                                <span className="font-semibold text-zinc-850 dark:text-zinc-200 font-mono text-[11px]">
                                  {checkoutDetails.hostUpiDetails?.upiId || "N/A"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-550 dark:text-zinc-400">Property:</span>
                                <span className="font-semibold text-zinc-855 dark:text-zinc-200 truncate max-w-[200px]">
                                  {listing?.title}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-550 dark:text-zinc-400">Check-in / Check-out:</span>
                                <span className="font-semibold text-zinc-855 dark:text-zinc-200">
                                  {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setUpiStep(2)}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>I've completed the payment</span>
                          </button>
                        </div>
                      ) : (
                        /* Step 2: Submit Reference ID */
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="block text-xs font-semibold text-zinc-650 dark:text-zinc-350">
                              Enter 12-character UPI Transaction ID
                            </label>
                            <p className="text-[10px] text-zinc-400">Verify your payment success by submitting the Reference/Transaction ID from your UPI app receipt.</p>
                            <input
                              type="text"
                              required
                              value={upiTxnId}
                              onChange={(e) => setUpiTxnId(e.target.value)}
                              placeholder="e.g. 123456789012"
                              pattern="^[a-zA-Z0-9]{12}$"
                              title="Must be exactly 12 alphanumeric characters"
                              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono uppercase"
                            />
                          </div>

                          <div className="flex gap-2.5">
                            <button
                              type="button"
                              onClick={() => setUpiStep(1)}
                              className="flex-1 py-3 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-650 dark:text-zinc-350 font-semibold text-xs rounded-xl transition cursor-pointer"
                            >
                              Back
                            </button>
                            <button
                              type="submit"
                              disabled={paying || !/^[a-zA-Z0-9]{12}$/.test(upiTxnId.trim())}
                              className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <ShieldCheck className="w-4 h-4" />
                              {paying ? "Submitting..." : `Submit Payment for Verification`}
                            </button>
                          </div>
                        </div>
                      )}
                    </form>
                  )}
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Photo Carousel Slider */}
      <AnimatePresence>
        {showCarousel && (
          <div className="fixed inset-0 bg-black/95 z-55 flex flex-col justify-between p-6">
            <div className="flex justify-between items-center text-white">
              <span className="text-xs font-bold uppercase tracking-wider">
                Photo {activePhotoIdx + 1} of {listing.images.length}
              </span>
              <button
                onClick={() => setShowCarousel(false)}
                className="p-2 hover:bg-white/10 rounded-full transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="relative flex items-center justify-center flex-1 w-full max-w-4xl mx-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : listing.images.length - 1));
                }}
                className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition z-10"
              >
                ◀
              </button>

              <motion.img
                key={activePhotoIdx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                src={listing.images[activePhotoIdx]}
                alt={`${listing.title} full view`}
                className="max-h-[70vh] max-w-full rounded-2xl object-contain shadow-2xl"
              />

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePhotoIdx((prev) => (prev < listing.images.length - 1 ? prev + 1 : 0));
                }}
                className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition z-10"
              >
                ▶
              </button>
            </div>

            <div className="flex gap-2 justify-center pb-4 overflow-x-auto scrollbar-none">
              {listing.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActivePhotoIdx(idx)}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition ${
                    activePhotoIdx === idx ? "border-rose-500 scale-105" : "border-transparent opacity-60"
                  }`}
                >
                  <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </AnimatePresence>

      <AiAssistant />
      <Footer />
    </div>
  );
}
