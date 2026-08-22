"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AiAssistant from "@/components/AiAssistant";
import { listingsApi, bookingsApi, aiApi, couponsApi, authApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import PropertyMap from "@/components/PropertyMap";
import {
  ShieldCheck,
  Plus,
  Trash2,
  Home,
  Image as ImageIcon,
  Landmark,
  Users,
  DollarSign,
  Calendar,
  Upload,
  AlertCircle,
  TrendingUp,
  Sparkles,
  Percent,
  Check,
  Send,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  X,
  MapPin,
  Search,
  ChevronUp,
  ChevronDown,
  Edit,
  BookOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

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
  houseRules?: {
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
  };
}

interface IReservation {
  _id: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: string;
  paymentMethod?: string;
  upiTxnId?: string;
  listing: {
    _id: string;
    title: string;
  } | null;
  user: {
    _id: string;
    name: string;
    email: string;
    avatar: string;
  } | null;
}

const AMENITIES_OPTIONS = [
  "WiFi",
  "Air Conditioning",
  "Kitchen",
  "Free Parking",
  "Pool",
  "Hot Tub",
  "Gym",
  "Beach Access",
  "Pet Friendly",
  "TV",
];

const PROPERTY_TYPES = ["Entire home", "Villa", "Apartment", "Cabin", "Private room"];

export default function HostDashboard() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        toast.error("Please sign in to continue.");
        router.push("/login");
        return;
      }
      if (!user.isOnboarded) {
        toast.error("Please complete host onboarding first.");
        router.push("/become-host");
      }
    }
  }, [user, authLoading]);
  const [listings, setListings] = useState<IListing[]>([]);
  const [reservations, setReservations] = useState<IReservation[]>([]);
  const [loading, setLoading] = useState(true);

  // Multi-step form Wizard states
  const [showForm, setShowForm] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [latitude, setLatitude] = useState("15.5414");
  const [longitude, setLongitude] = useState("73.7486");
  const [geocoding, setGeocoding] = useState(false);
  const [tourEnabled, setTourEnabled] = useState(false);
  
  interface ITourHotspot {
    pitch: number;
    yaw: number;
    type: "info" | "scene";
    text: string;
    targetRoomId?: string;
  }

  interface ITourRoom {
    id: string;
    name: string;
    panorama: string;
    hotspots?: ITourHotspot[];
  }

  const [tourRooms, setTourRooms] = useState<ITourRoom[]>([]);
  const [propertyType, setPropertyType] = useState("Entire home");
  const [bedrooms, setBedrooms] = useState("1");
  const [bathrooms, setBathrooms] = useState("1");
  const [guests, setGuests] = useState("2");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  
  interface IExistingImage {
    url: string;
    category: "Living Room" | "Bedroom" | "Kitchen" | "Bathroom" | "Exterior" | "Other";
    isCover: boolean;
    order: number;
  }
  
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [existingImages, setExistingImages] = useState<IExistingImage[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [smokingAllowed, setSmokingAllowed] = useState(false);
  const [petsAllowed, setPetsAllowed] = useState(false);
  const [partiesAllowed, setPartiesAllowed] = useState(false);
  const [childrenAllowed, setChildrenAllowed] = useState(true);
  const [quietHoursStart, setQuietHoursStart] = useState("");
  const [quietHoursEnd, setQuietHoursEnd] = useState("");
  const [checkInFrom, setCheckInFrom] = useState("14:00");
  const [checkInUntil, setCheckInUntil] = useState("22:00");
  const [checkOutBy, setCheckOutBy] = useState("11:00");
  const [customRules, setCustomRules] = useState<string[]>([]);
  const [newCustomRule, setNewCustomRule] = useState("");
  const [cancellationPolicy, setCancellationPolicy] = useState<"Flexible" | "Moderate" | "Strict" | "Custom">("Moderate");
  const [cancellationPolicyDetails, setCancellationPolicyDetails] = useState("");

  // Payout onboarding states
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [bankHolderName, setBankHolderName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankBusinessName, setBankBusinessName] = useState("");
  const [bankStreet, setBankStreet] = useState("");
  const [bankCity, setBankCity] = useState("");
  const [bankState, setBankState] = useState("");
  const [bankPostalCode, setBankPostalCode] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<"bank" | "upi">("bank");
  const [upiId, setUpiId] = useState("");
  const [upiQrCodeUrl, setUpiQrCodeUrl] = useState("");
  const [uploadingQr, setUploadingQr] = useState(false);
  const [submittingPayout, setSubmittingPayout] = useState(false);
  const [syncingPayout, setSyncingPayout] = useState(false);

  // Campaigns list state
  const [coupons, setCoupons] = useState<Array<{ _id: string; code: string; discountPercent: number; active: boolean; eligibleListings?: string[] }>>([]);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponDiscount, setNewCouponDiscount] = useState("10");
  const [selectedListingId, setSelectedListingId] = useState("");

  // Host AI chat advisor state
  const [showAiAdvisor, setShowAiAdvisor] = useState(false);
  const [aiChatInput, setAiChatInput] = useState("");
  const [aiChatHistory, setAiChatHistory] = useState<{ role: "user" | "model"; parts: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  // Analytics state
  const [analytics, setAnalytics] = useState<{
    totalEarnings: number;
    pendingEarnings: number;
    settledEarnings: number;
    bookingsCount: number;
    grossBookingValue: number;
    platformFees: number;
    refunds: number;
    netHostEarnings: number;
    occupancyRate: number;
    cancellationRate: number;
    monthlyEarnings: Array<{ month: string; earnings: number }>;
    transactionHistory: Array<any>;
    averageBookingValue: number;
    pendingVerificationCount: number;
    upcomingBookingsCount: number;
    completedBookingsCount: number;
    cancelledBookingsCount: number;
    totalBookingsCount: number;
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Calendar states
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarListing, setCalendarListing] = useState<IListing | null>(null);
  const [calendarData, setCalendarData] = useState<any>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockType, setBlockType] = useState<"host-blocked" | "maintenance">("host-blocked");
  const [blockReason, setBlockReason] = useState("");
  const [blockingSubmit, setBlockingSubmit] = useState(false);

  // House Rules states
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [rulesListing, setRulesListing] = useState<IListing | null>(null);
  const [rulesForm, setRulesForm] = useState<any>({
    smokingAllowed: false,
    petsAllowed: false,
    partiesAllowed: false,
    childrenAllowed: true,
    checkInFrom: "14:00",
    checkOutBy: "11:00",
  });
  const [rulesSubmit, setRulesSubmit] = useState(false);

  const handleOpenCalendarModal = async (listing: IListing) => {
    setCalendarListing(listing);
    setShowCalendarModal(true);
    setCalendarLoading(true);
    try {
      const res = await listingsApi.getCalendar(listing._id);
      if (res.status === "success") {
        setCalendarData(res.data);
      } else {
        toast.error("Failed to load availability calendar.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error loading calendar details.");
    } finally {
      setCalendarLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];
    const startOffset = firstDay.getDay();
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }

    const totalDays = lastDay.getDate();
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }

    return days;
  };

  const getDayStatus = (d: Date) => {
    if (!calendarData) return { status: "available", color: "bg-emerald-500", text: "text-white" };

    // Check bookings
    const bookingMatch = calendarData.bookings?.find((b: any) => {
      const bStart = new Date(b.startDate);
      const bEnd = new Date(b.endDate);
      const cur = new Date(d);
      cur.setHours(12, 0, 0, 0);
      bStart.setHours(12, 0, 0, 0);
      bEnd.setHours(12, 0, 0, 0);
      return cur >= bStart && cur < bEnd;
    });

    if (bookingMatch) {
      if (bookingMatch.status === "Confirmed") {
        return { status: "booked", color: "bg-rose-500", text: "text-white", data: bookingMatch };
      } else {
        return { status: "locked", color: "bg-amber-500", text: "text-white", data: bookingMatch };
      }
    }

    // Check active locks
    const lockMatch = calendarData.locks?.find((l: any) => {
      const lStart = new Date(l.startDate);
      const lEnd = new Date(l.endDate);
      const cur = new Date(d);
      cur.setHours(12, 0, 0, 0);
      lStart.setHours(12, 0, 0, 0);
      lEnd.setHours(12, 0, 0, 0);
      return cur >= lStart && cur < lEnd;
    });

    if (lockMatch) {
      return { status: "locked", color: "bg-amber-500", text: "text-white", data: lockMatch };
    }

    // Check blackout dates
    const blackoutMatch = calendarData.blackoutDates?.find((b: any) => {
      const bStart = new Date(b.startDate);
      const bEnd = new Date(b.endDate);
      const cur = new Date(d);
      cur.setHours(12, 0, 0, 0);
      bStart.setHours(12, 0, 0, 0);
      bEnd.setHours(12, 0, 0, 0);
      return cur >= bStart && cur < bEnd;
    });

    if (blackoutMatch) {
      if (blackoutMatch.type === "maintenance") {
        return { status: "maintenance", color: "bg-blue-500", text: "text-white", data: blackoutMatch };
      } else {
        return { status: "blocked", color: "bg-zinc-900 dark:bg-zinc-800", text: "text-white", data: blackoutMatch };
      }
    }

    return { status: "available", color: "bg-emerald-500", text: "text-white" };
  };

  const handleBlockDatesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calendarListing || !blockStart || !blockEnd) return;
    setBlockingSubmit(true);
    try {
      const res = await listingsApi.blockDates(calendarListing._id, {
        startDate: blockStart,
        endDate: blockEnd,
        type: blockType,
        reason: blockReason,
      });
      if (res.status === "success") {
        toast.success("Dates blocked successfully!");
        setBlockStart("");
        setBlockEnd("");
        setBlockReason("");
        // Refresh calendar data
        const calRes = await listingsApi.getCalendar(calendarListing._id);
        if (calRes.status === "success") {
          setCalendarData(calRes.data);
        }
      } else {
        toast.error(res.message || "Failed to block dates.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error blocking dates.");
    } finally {
      setBlockingSubmit(false);
    }
  };

  const handleUnblockDates = async (start: string, end: string) => {
    if (!calendarListing) return;
    setBlockingSubmit(true);
    try {
      const res = await listingsApi.unblockDates(calendarListing._id, {
        startDate: start,
        endDate: end,
      });
      if (res.status === "success") {
        toast.success("Dates unblocked successfully!");
        // Refresh calendar data
        const calRes = await listingsApi.getCalendar(calendarListing._id);
        if (calRes.status === "success") {
          setCalendarData(calRes.data);
        }
      } else {
        toast.error(res.message || "Failed to unblock dates.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error unblocking dates.");
    } finally {
      setBlockingSubmit(false);
    }
  };

  const handleOpenRulesModal = (listing: IListing) => {
    setRulesListing(listing);
    setRulesForm({
      smokingAllowed: listing.houseRules?.smokingAllowed || false,
      petsAllowed: listing.houseRules?.petsAllowed || false,
      partiesAllowed: listing.houseRules?.partiesAllowed || false,
      childrenAllowed: listing.houseRules?.childrenAllowed !== false,
      checkInFrom: listing.houseRules?.checkInFrom || "14:00",
      checkOutBy: listing.houseRules?.checkOutBy || "11:00",
    });
    setShowRulesModal(true);
  };

  const handleRulesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rulesListing) return;
    setRulesSubmit(true);
    try {
      const res = await listingsApi.update(rulesListing._id, {
        houseRules: rulesForm,
      });
      if (res.status === "success") {
        toast.success("House rules updated successfully!");
        setShowRulesModal(false);
        loadHostData();
      } else {
        toast.error(res.message || "Failed to update house rules.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Error updating house rules.");
    } finally {
      setRulesSubmit(false);
    }
  };

  const loadHostData = async () => {
    if (!user) return;
    setLoading(true);
    setAnalyticsLoading(true);
    try {
      const listingsRes = await listingsApi.getHostListings();
      if (listingsRes.status === "success") {
        setListings(listingsRes.data.listings || []);
      }

      const bookingsRes = await bookingsApi.getHostBookings();
      if (bookingsRes.status === "success") {
        setReservations(bookingsRes.data.bookings || []);
      }

      const analyticsRes = await listingsApi.getHostAnalytics();
      if (analyticsRes.status === "success") {
        setAnalytics(analyticsRes.data);
      }

      const couponsRes = await couponsApi.getHostCoupons();
      if (couponsRes.status === "success") {
        setCoupons(couponsRes.data.coupons || []);
      }
    } catch (err) {
      toast.error("Failed to sync dashboard metrics");
    } finally {
      setLoading(false);
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    loadHostData();
  }, [user]);

  useEffect(() => {
    if (user?.bankDetails) {
      setBankHolderName(user.bankDetails.accountHolderName || "");
      setBankName(user.bankDetails.bankName || "");
      setUpiId(user.bankDetails.upiId || "");
      setUpiQrCodeUrl(user.bankDetails.upiQrCodeUrl || "");
      if (user.bankDetails.upiId && !user.bankDetails.accountNumberMasked) {
        setPayoutMethod("upi");
      } else {
        setPayoutMethod("bank");
      }
    }
    if (user?.address) setBankStreet(user.address);
    if (user?.city) setBankCity(user.city);
    if (user?.state) setBankState(user.state);
  }, [user]);

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Maximum allowed size is 5MB.");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    setUploadingQr(true);
    const uploadToastId = toast.loading("Uploading QR Code...");
    try {
      const res = await listingsApi.uploadImage(formData);
      if (res.status === "success" && res.data?.url) {
        setUpiQrCodeUrl(res.data.url);
        toast.success("UPI QR Code uploaded!", { id: uploadToastId });
      } else {
        toast.error(res.message || "Failed to upload QR code.", { id: uploadToastId });
      }
    } catch (err) {
      toast.error("Error uploading QR code.", { id: uploadToastId });
    } finally {
      setUploadingQr(false);
    }
  };

  const handleOnboardPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload: any = {
      fullName: user?.name,
      phone: user?.phone || user?.phoneNumber || "9876543210",
      email: user?.email,
      address: user?.address || bankStreet,
      city: user?.city || bankCity,
      state: user?.state || bankState,
      country: user?.country || "India",
      // Keep existing rules
      smokingAllowed: user?.defaultHouseRules?.smokingAllowed,
      petsAllowed: user?.defaultHouseRules?.petsAllowed,
      partiesAllowed: user?.defaultHouseRules?.partiesAllowed,
      childrenAllowed: user?.defaultHouseRules?.childrenAllowed,
      quietHoursStart: user?.defaultHouseRules?.quietHoursStart,
      quietHoursEnd: user?.defaultHouseRules?.quietHoursEnd,
      checkInFrom: user?.defaultHouseRules?.checkInFrom,
      checkInUntil: user?.defaultHouseRules?.checkInUntil,
      checkOutBy: user?.defaultHouseRules?.checkOutBy,
      customRules: user?.defaultHouseRules?.customRules,
      // Payout details
      businessName: bankBusinessName,
      street: bankStreet,
      postalCode: bankPostalCode,
    };

    if (payoutMethod === "upi") {
      if (!upiId) {
        toast.error("Please enter a UPI ID.");
        return;
      }
      const upiRegex = /^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/;
      if (!upiRegex.test(upiId.trim())) {
        toast.error("Invalid UPI ID format.");
        return;
      }
      payload.upiId = upiId.trim();
      payload.upiQrCodeUrl = upiQrCodeUrl.trim();
    } else {
      if (!bankHolderName) {
        toast.error("Please enter the beneficiary name.");
        return;
      }
      if (!user?.bankDetails && (!bankAccountNumber || !bankIfsc)) {
        toast.error("Please enter bank account number and IFSC code.");
        return;
      }
      payload.accountHolderName = bankHolderName.trim();
      payload.bankName = bankName.trim();
      if (bankAccountNumber) {
        payload.accountNumber = bankAccountNumber.trim();
      }
      if (bankIfsc) {
        payload.ifsc = bankIfsc.trim();
      }
    }

    setSubmittingPayout(true);
    try {
      const res = await authApi.onboardHostPayment(payload);

      if (res.status === "success") {
        toast.success("Payout details updated successfully!");
        setShowPayoutForm(false);
        await refreshUser();
      } else {
        toast.error(res.message || "Failed to update payout details.");
      }
    } catch (err) {
      toast.error("An error occurred while updating payout details.");
    } finally {
      setSubmittingPayout(false);
    }
  };

  const handleSyncPayout = async () => {
    setSyncingPayout(true);
    try {
      const res = await authApi.syncHostPaymentStatus();
      if (res.status === "success") {
        toast.success(`Payout Status: ${res.data?.paymentProfile?.status || "PENDING"}`);
        await refreshUser();
      } else {
        toast.error(res.message || "Failed to sync status.");
      }
    } catch (err) {
      toast.error("An error occurred during synchronization.");
    } finally {
      setSyncingPayout(false);
    }
  };

  const handleAmenityChange = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities((prev) => prev.filter((a) => a !== amenity));
    } else {
      setSelectedAmenities((prev) => [...prev, amenity]);
    }
  };

  const handlePhotosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newFiles = Array.from(e.target.files);
    
    setUploadingPhotos(true);
    const toastId = toast.loading("Uploading photos to server...");

    try {
      const uploadedResults: IExistingImage[] = [];
      
      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        const formData = new FormData();
        formData.append("image", file);
        
        const res = await listingsApi.uploadImage(formData);
        if (res.status === "success" && res.data?.url) {
          uploadedResults.push({
            url: res.data.url,
            category: "Other",
            isCover: existingImages.length === 0 && i === 0,
            order: existingImages.length + i,
          });
        }
      }

      if (uploadedResults.length > 0) {
        toast.success(`Successfully uploaded ${uploadedResults.length} photos!`, { id: toastId });
        setExistingImages((prev) => [...prev, ...uploadedResults]);
      } else {
        toast.error("Failed to upload photos.", { id: toastId });
      }
    } catch (err: any) {
      toast.error("Error uploading photos.", { id: toastId });
    } finally {
      setUploadingPhotos(false);
    }
  };

  const movePhoto = (index: number, direction: "up" | "down") => {
    const next = [...existingImages];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= next.length) return;
    
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    
    next.forEach((img, idx) => {
      img.order = idx;
    });

    setExistingImages(next);
  };

  const deletePhoto = (index: number) => {
    const next = existingImages.filter((_, i) => i !== index);
    if (existingImages[index].isCover && next.length > 0) {
      next[0].isCover = true;
    }
    next.forEach((img, idx) => {
      img.order = idx;
    });
    setExistingImages(next);
  };

  const changePhotoCategory = (index: number, category: any) => {
    const next = [...existingImages];
    next[index].category = category;
    setExistingImages(next);
  };

  const setPhotoCover = (index: number) => {
    const next = existingImages.map((p, i) => ({
      ...p,
      isCover: i === index,
    }));
    setExistingImages(next);
  };

  const handleEditListingStart = (listing: any) => {
    setEditingListingId(listing._id);
    setTitle(listing.title);
    setDescription(listing.description);
    setPrice(String(listing.price));
    setAddress(listing.address);
    setCity(listing.city);
    setCountry(listing.country);
    setLatitude(String(listing.location.coordinates[1]));
    setLongitude(String(listing.location.coordinates[0]));
    setPropertyType(listing.propertyType || "Entire home");
    setBedrooms(String(listing.bedrooms || 1));
    setBathrooms(String(listing.bathrooms || 1));
    setGuests(String(listing.guests || 2));
    setSelectedAmenities(listing.amenities || []);
    
    setExistingImages(listing.imageDetails || listing.images.map((imgUrl: string, idx: number) => ({
      url: imgUrl,
      category: "Other",
      isCover: idx === 0,
      order: idx,
    })));
    
    setTourEnabled(!!listing.virtualTour?.enabled);
    setTourRooms(listing.virtualTour?.rooms || []);

    const rules = listing.houseRules || {};
    setSmokingAllowed(!!rules.smokingAllowed);
    setPetsAllowed(!!rules.petsAllowed);
    setPartiesAllowed(!!rules.partiesAllowed);
    setChildrenAllowed(rules.childrenAllowed !== false);
    setQuietHoursStart(rules.quietHoursStart || "");
    setQuietHoursEnd(rules.quietHoursEnd || "");
    setCheckInFrom(rules.checkInFrom || "14:00");
    setCheckInUntil(rules.checkInUntil || "22:00");
    setCheckOutBy(rules.checkOutBy || "11:00");
    setCustomRules(rules.customRules || []);
    setNewCustomRule("");
    setCancellationPolicy(listing.cancellationPolicy || "Moderate");
    setCancellationPolicyDetails(listing.cancellationPolicyDetails || "");
    
    setShowForm(true);
    setFormStep(1);
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);

    try {
      const virtualTourData = {
        enabled: tourEnabled,
        rooms: tourRooms.map((r) => ({
          id: r.id,
          name: r.name,
          panorama: r.panorama,
          hotspots: r.hotspots || [],
        })),
      };

      const payload = {
        title,
        description,
        price: Number(price),
        address,
        city,
        country,
        propertyType,
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        guests: Number(guests),
        latitude: Number(latitude),
        longitude: Number(longitude),
        amenities: selectedAmenities,
        virtualTour: virtualTourData,
        existingImages: existingImages,
        houseRules: {
          smokingAllowed,
          petsAllowed,
          partiesAllowed,
          childrenAllowed,
          quietHoursStart,
          quietHoursEnd,
          checkInFrom,
          checkInUntil,
          checkOutBy,
          customRules,
        },
        cancellationPolicy,
        cancellationPolicyDetails,
      };

      let res;
      if (editingListingId) {
        res = await listingsApi.update(editingListingId, payload);
      } else {
        res = await listingsApi.create(payload);
      }

      if (res.status === "success") {
        toast.success(editingListingId ? "Property updated successfully!" : "Property published successfully!");
        setShowForm(false);
        setFormStep(1);
        
        // Reset states
        setEditingListingId(null);
        setTitle("");
        setDescription("");
        setPrice("");
        setAddress("");
        setCity("");
        setCountry("");
        setLatitude("15.5414");
        setLongitude("73.7486");
        setTourEnabled(false);
        setTourRooms([]);
        setSelectedAmenities([]);
        setExistingImages([]);
        setSmokingAllowed(false);
        setPetsAllowed(false);
        setPartiesAllowed(false);
        setChildrenAllowed(true);
        setQuietHoursStart("");
        setQuietHoursEnd("");
        setCheckInFrom("14:00");
        setCheckInUntil("22:00");
        setCheckOutBy("11:00");
        setCustomRules([]);
        setNewCustomRule("");
        setCancellationPolicy("Moderate");
        setCancellationPolicyDetails("");

        loadHostData();
      } else {
        toast.error(res.message || "Failed to save listing");
      }
    } catch (err) {
      toast.error("An error occurred during submission");
    } finally {
      setFormSubmitting(false);
    }
  };

  const runNominatimSearch = async (queryString: string) => {
    const query = encodeURIComponent(queryString);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
      {
        headers: {
          "User-Agent": "StaySmart-Vacation-Rentals",
        },
      }
    );
    return response.json();
  };

  const handleGeocode = async () => {
    if (!address.trim() && !city.trim()) {
      toast.error("Please fill in Street Address and City first.");
      return;
    }

    setGeocoding(true);
    try {
      const fullQuery = `${address}, ${city}, ${country}`;
      let data = await runNominatimSearch(fullQuery);

      if ((!data || data.length === 0) && address.includes(",")) {
        const parts = address.split(",");
        if (parts.length > 1) {
          const simplifiedAddress = parts.slice(1).join(",").trim();
          if (simplifiedAddress) {
            data = await runNominatimSearch(`${simplifiedAddress}, ${city}, ${country}`);
          }
        }
      }

      if (!data || data.length === 0) {
        const cleanedAddress = address
          .replace(/^(?:apt|apartment|flat|room|house|no|villa|pg|plot)\s*\d+[\s\w]*?,/i, "")
          .trim();
        if (cleanedAddress && cleanedAddress !== address) {
          data = await runNominatimSearch(`${cleanedAddress}, ${city}, ${country}`);
        }
      }

      if (!data || data.length === 0) {
        data = await runNominatimSearch(`${city}, ${country}`);
      }

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setLatitude(parseFloat(lat).toFixed(6));
        setLongitude(parseFloat(lon).toFixed(6));
        toast.success("Coordinates resolved successfully!");
      } else {
        toast.error("Could not resolve address. Try adjusting spelling or enter manually.");
      }
    } catch (err) {
      toast.error("Geocoding failed. Enter coordinates manually below.");
    } finally {
      setGeocoding(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLatitude(latitude.toFixed(6));
        setLongitude(longitude.toFixed(6));
        toast.success("Location retrieved from browser ✓");
      },
      (error) => {
        let msg = "Failed to retrieve location.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Location permission was denied. You can select the location manually on the map.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = "Location details are unavailable.";
        } else if (error.code === error.TIMEOUT) {
          msg = "Location request timed out.";
        }
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleDeleteListing = async (id: string) => {
    if (!confirm("Are you sure you want to delete this listing?")) return;

    try {
      const res = await listingsApi.delete(id);
      if (res.status === "success") {
        toast.success("Property removed successfully");
        loadHostData();
      }
    } catch (err) {
      toast.error("Failed to delete property");
    }
  };

  const handleVerifyUpiPayment = async (bookingId: string, action: "approve" | "reject") => {
    const confirmation = window.confirm(
      `Are you sure you want to ${action === "approve" ? "APPROVE & CONFIRM" : "REJECT & CANCEL"} this payment transaction? This action is permanent.`
    );
    if (!confirmation) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api"}/payments/upi/confirm/${bookingId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
        },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        toast.success(action === "approve" ? "Booking confirmed successfully!" : "Booking verification rejected.");
        loadHostData();
      } else {
        toast.error(data.message || "Failed to process request.");
      }
    } catch (err) {
      toast.error("Network error verifying payment.");
    }
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim()) return;
    if (!selectedListingId) {
      toast.error("Please select a property listing first.");
      return;
    }

    const percent = Number(newCouponDiscount);
    if (isNaN(percent) || percent < 5 || percent > 100) {
      toast.error("Discount percentage must be between 5% and 100%");
      return;
    }

    try {
      const res = await couponsApi.create({
        code: newCouponCode.trim().toUpperCase(),
        discountPercent: percent,
        listingId: selectedListingId,
      });
      if (res.status === "success") {
        toast.success(`Coupon ${newCouponCode.toUpperCase()} configured!`);
        setNewCouponCode("");
        setSelectedListingId("");
        loadHostData();
      } else {
        toast.error(res.message || "Failed to create coupon");
      }
    } catch (err) {
      toast.error("Failed to create coupon");
    }
  };

  const handleToggleCoupon = async (id: string) => {
    try {
      const res = await couponsApi.toggle(id);
      if (res.status === "success") {
        toast.success("Coupon status updated");
        loadHostData();
      }
    } catch (err) {
      toast.error("Failed to update coupon status");
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this coupon?")) return;
    try {
      const res = await couponsApi.delete(id);
      if (res.status === "success") {
        toast.success("Coupon deleted");
        loadHostData();
      }
    } catch (err) {
      toast.error("Failed to delete coupon");
    }
  };

  // Host AI Advisor chat submit
  const handleAiChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiChatInput.trim()) return;

    const userMsg = aiChatInput.trim();
    setAiChatInput("");
    setAiChatHistory((prev) => [...prev, { role: "user", parts: userMsg }]);
    setAiLoading(true);

    try {
      const res = await aiApi.chat(userMsg, aiChatHistory, "host");
      if (res.status === "success") {
        setAiChatHistory((prev) => [...prev, { role: "model", parts: res.data.response }]);
      }
    } catch (err) {
      toast.error("AI connection failed");
    } finally {
      setAiLoading(false);
    }
  };

  // Metrics summary
  const totalEarnings = analytics?.totalEarnings ?? 0;
  const occupancyRate = analytics?.occupancyRate ?? 0;
  const cancellationRate = analytics?.cancellationRate ?? 0;

  if (!user || (user.role !== "Host" && user.role !== "Admin")) {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Navbar />
        <main className="flex-1 max-w-md mx-auto px-4 py-32 text-center space-y-4">
          <Landmark className="h-16 w-16 text-rose-500 mx-auto" />
          <h2 className="font-outfit text-2xl font-bold">Host Access Required</h2>
          <p className="text-zinc-500 text-xs">
            To view this dashboard, please toggle to Host profile mode inside the navigation profile bar dropdown.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* Dashboard Title Header */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-outfit text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Host Management Dashboard
            </h1>
            <p className="text-xs text-zinc-500">
              Manage listings, configure discount campaigns, and optimize earnings via AI insights.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/messages")}
              className="px-4 py-2.5 bg-zinc-55 dark:bg-zinc-800 hover:bg-zinc-100/50 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Inbox / Messages</span>
            </button>
            <button
              onClick={() => setShowAiAdvisor(true)}
              className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100/50 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition"
            >
              <Sparkles className="h-4 w-4" />
              <span>Consult AI Advisor</span>
            </button>
            <button
              onClick={() => {
                if (!showForm) {
                  setEditingListingId(null);
                  setTitle("");
                  setDescription("");
                  setPrice("");
                  setAddress("");
                  setCity("");
                  setCountry("");
                  setLatitude("15.5414");
                  setLongitude("73.7486");
                  setTourEnabled(false);
                  setTourRooms([]);
                  setSelectedAmenities([]);
                  setExistingImages([]);
                  setSmokingAllowed(false);
                  setPetsAllowed(false);
                  setPartiesAllowed(false);
                  setChildrenAllowed(true);
                  setQuietHoursStart("");
                  setQuietHoursEnd("");
                  setCheckInFrom("14:00");
                  setCheckInUntil("22:00");
                  setCheckOutBy("11:00");
                  setCustomRules([]);
                  setNewCustomRule("");
                  setFormStep(1);
                }
                setShowForm(!showForm);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5 transition"
            >
              <Plus className="h-4 w-4" />
              <span>{showForm ? "View Dashboard" : "List New Property"}</span>
            </button>
          </div>
        </div>

        {showForm ? (
          /* Multi-Step Onboarding Form Wizard */
          <div className="max-w-3xl border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl bg-white dark:bg-zinc-900 shadow-xl mb-12">
            {/* Steps indicator bar */}
            <div className="flex items-center justify-between mb-8">
              {[1, 2, 3, 4, 5].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      formStep >= step ? "bg-indigo-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {step}
                  </div>
                  {step < 5 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 transition-colors ${
                        formStep > step ? "bg-indigo-600" : "bg-zinc-100 dark:bg-zinc-800"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleCreateListing} className="space-y-6">
              {formStep === 1 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <h3 className="font-bold text-lg font-outfit">Step 1: Listing Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">Listing Title</label>
                      <input
                        type="text"
                        required
                        placeholder="Cozy beachfront paradise"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">Price per Night (INR - ₹)</label>
                      <input
                        type="number"
                        required
                        placeholder="3500"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Property Description</label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Detail layout, neighborhood vibes..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </motion.div>
              )}

              {formStep === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <h3 className="font-bold text-lg font-outfit">Step 2: Property Location</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">Street Address</label>
                      <input
                        type="text"
                        required
                        placeholder="456 Ocean view Rd"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">City</label>
                      <input
                        type="text"
                        required
                        placeholder="Malibu"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">Country</label>
                      <input
                        type="text"
                        required
                        placeholder="United States"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <span>📍 Use my current location</span>
                    </button>
                    <button
                      type="button"
                      disabled={geocoding}
                      onClick={handleGeocode}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>{geocoding ? "Resolving..." : "Geocode Address"}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">Latitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        required
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">Longitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        required
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-zinc-500">Drag Pin to Adjust Location</label>
                    <div className="h-64 w-full rounded-2xl overflow-hidden relative border border-zinc-200 dark:border-zinc-800">
                      <PropertyMap
                        latitude={parseFloat(latitude) || 15.5414}
                        longitude={parseFloat(longitude) || 73.7486}
                        draggable={true}
                        onPositionChange={async (lat, lng) => {
                          setLatitude(lat.toFixed(6));
                          setLongitude(lng.toFixed(6));
                          try {
                            const response = await fetch(
                              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
                              {
                                headers: {
                                  "User-Agent": "StaySmart-Vacation-Rentals",
                                },
                              }
                            );
                            const data = await response.json();
                            if (data && data.address) {
                              const road = data.address.road || data.address.suburb || data.address.neighbourhood || data.address.amenity || "";
                              const resolvedCity = data.address.city || data.address.town || data.address.village || data.address.county || "";
                              const resolvedCountry = data.address.country || "";
                              
                              if (road) setAddress(road);
                              if (resolvedCity) setCity(resolvedCity);
                              if (resolvedCountry) setCountry(resolvedCountry);
                            } else {
                              toast.error("Could not resolve coordinates to an address. Please type address manually.");
                            }
                          } catch (err) {
                            console.error("Reverse geocoding failed:", err);
                            toast.error("Failed to decode address from map pin. Please type address manually.");
                          }
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {formStep === 3 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <h3 className="font-bold text-lg font-outfit">Step 3: Space Setup</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">Property Type</label>
                      <select
                        value={propertyType}
                        onChange={(e) => setPropertyType(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none"
                      >
                        {PROPERTY_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">Bedrooms</label>
                      <input
                        type="number"
                        min="1"
                        value={bedrooms}
                        onChange={(e) => setBedrooms(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">Bathrooms</label>
                      <input
                        type="number"
                        min="1"
                        value={bathrooms}
                        onChange={(e) => setBathrooms(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">Guests Allowed</label>
                      <input
                        type="number"
                        min="1"
                        value={guests}
                        onChange={(e) => setGuests(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {formStep === 4 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <h3 className="font-bold text-lg font-outfit">Step 4: Amenities & Galleries</h3>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-2">Amenities Available</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {AMENITIES_OPTIONS.map((a) => (
                        <label key={a} className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedAmenities.includes(a)}
                            onChange={() => handleAmenityChange(a)}
                            className="rounded border-zinc-300 text-indigo-600 h-4 w-4"
                          />
                          <span>{a}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-2">Upload stay photos</label>
                    <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-950 text-center relative hover:border-indigo-500 transition cursor-pointer">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handlePhotosChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Upload className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
                      <span className="text-xs text-zinc-500 font-medium">
                        {uploadingPhotos ? "Uploading to Cloudinary..." : existingImages.length > 0 ? `${existingImages.length} photos uploaded` : "Drag/drop files here to upload (max 5)"}
                      </span>
                    </div>

                    {existingImages.length > 0 && (
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {existingImages.map((photo, idx) => (
                          <div key={idx} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 rounded-2xl relative shadow space-y-3">
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-950">
                              <img src={photo.url} alt="Preview" className="w-full h-full object-cover" />
                              
                              {photo.isCover && (
                                <span className="absolute top-2 left-2 px-2 py-0.5 bg-rose-500 text-white text-[9px] font-bold uppercase rounded-lg shadow">
                                  Cover Image
                                </span>
                              )}
                            </div>

                            <div className="space-y-2 text-left">
                              <div>
                                <label className="block text-[9px] text-zinc-500 dark:text-zinc-400 font-bold uppercase mb-1">
                                  Room Category
                                </label>
                                <select
                                  value={photo.category}
                                  onChange={(e) => changePhotoCategory(idx, e.target.value as any)}
                                  className="w-full px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none"
                                >
                                  <option value="Living Room">Living Room</option>
                                  <option value="Bedroom">Bedroom</option>
                                  <option value="Kitchen">Kitchen</option>
                                  <option value="Bathroom">Bathroom</option>
                                  <option value="Exterior">Exterior</option>
                                  <option value="Other">Other</option>
                                </select>
                              </div>

                              <div className="flex justify-between items-center pt-1">
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => movePhoto(idx, "up")}
                                    disabled={idx === 0}
                                    className="p-1.5 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-400 disabled:opacity-30 cursor-pointer"
                                    title="Move Up"
                                  >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => movePhoto(idx, "down")}
                                    disabled={idx === existingImages.length - 1}
                                    className="p-1.5 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-600 dark:text-zinc-400 disabled:opacity-30 cursor-pointer"
                                    title="Move Down"
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <div className="flex gap-1.5 items-center">
                                  <button
                                    type="button"
                                    onClick={() => setPhotoCover(idx)}
                                    className={`px-2 py-1 text-[9px] font-bold rounded-lg transition cursor-pointer border ${
                                      photo.isCover
                                        ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-400"
                                        : "bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700"
                                    }`}
                                  >
                                    Make Cover
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deletePhoto(idx)}
                                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-red-500 cursor-pointer"
                                    title="Delete photo"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Virtual Tour Creator */}
                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Virtual 3D Home Tour</h4>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Provide 360° panorama images to create an interactive virtual tour.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={tourEnabled}
                          onChange={(e) => setTourEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    {tourEnabled && (
                      <div className="space-y-4 bg-zinc-50 dark:bg-zinc-950/40 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                        <div className="space-y-4">
                          {tourRooms.map((room, idx) => (
                            <div key={idx} className="border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl bg-white dark:bg-zinc-900 space-y-3 relative">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                <div>
                                  <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">Room ID (e.g. living)</label>
                                  <input
                                    type="text"
                                    required
                                    value={room.id}
                                    onChange={(e) => {
                                      const next = [...tourRooms];
                                      next[idx].id = e.target.value;
                                      setTourRooms(next);
                                    }}
                                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">Room Name (e.g. Living Room)</label>
                                  <input
                                    type="text"
                                    required
                                    value={room.name}
                                    onChange={(e) => {
                                      const next = [...tourRooms];
                                      next[idx].name = e.target.value;
                                      setTourRooms(next);
                                    }}
                                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs focus:outline-none"
                                  />
                                </div>
                                <div className="flex gap-2 items-center">
                                  <div className="flex-1">
                                    <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">Panorama Image URL</label>
                                    <input
                                      type="url"
                                      required
                                      value={room.panorama}
                                      onChange={(e) => {
                                        const next = [...tourRooms];
                                        next[idx].panorama = e.target.value;
                                        setTourRooms(next);
                                      }}
                                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs focus:outline-none"
                                    />
                                  </div>
                                  {tourRooms.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTourRooms(tourRooms.filter((_, i) => i !== idx));
                                      }}
                                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer shrink-0"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Hotspots Section */}
                              <div className="mt-2 bg-zinc-50 dark:bg-zinc-950/55 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2 text-left">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Hotspots / Scene Connections</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = [...tourRooms];
                                      if (!next[idx].hotspots) next[idx].hotspots = [];
                                      next[idx].hotspots!.push({
                                        pitch: 0,
                                        yaw: 0,
                                        type: "scene",
                                        text: "",
                                        targetRoomId: "",
                                      });
                                      setTourRooms(next);
                                    }}
                                    className="text-[10px] text-indigo-500 font-bold hover:underline"
                                  >
                                    + Add Hotspot
                                  </button>
                                </div>

                                {(!room.hotspots || room.hotspots.length === 0) ? (
                                  <p className="text-[10px] text-zinc-400 italic">No hotspots created for this room.</p>
                                ) : (
                                  <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar pr-1">
                                    {room.hotspots.map((hotspot, hIdx) => (
                                      <div key={hIdx} className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 items-center pb-2 border-b border-zinc-100 dark:border-zinc-850 last:border-b-0 last:pb-0">
                                        <div className="sm:col-span-2">
                                          <input
                                            type="text"
                                            placeholder="Label (e.g. Go to Bedroom)"
                                            required
                                            value={hotspot.text}
                                            onChange={(e) => {
                                              const next = [...tourRooms];
                                              next[idx].hotspots![hIdx].text = e.target.value;
                                              setTourRooms(next);
                                            }}
                                            className="w-full px-2 py-1 border border-zinc-250 dark:border-zinc-700 bg-white dark:bg-zinc-950 rounded text-[10px]"
                                          />
                                        </div>
                                        <div>
                                          <select
                                            value={hotspot.targetRoomId || ""}
                                            required
                                            onChange={(e) => {
                                              const next = [...tourRooms];
                                              next[idx].hotspots![hIdx].targetRoomId = e.target.value;
                                              setTourRooms(next);
                                            }}
                                            className="w-full px-2 py-1 border border-zinc-250 dark:border-zinc-700 bg-white dark:bg-zinc-950 rounded text-[10px]"
                                          >
                                            <option value="">Select Room</option>
                                            {tourRooms.filter((r) => r.id !== room.id).map((r) => (
                                              <option key={r.id} value={r.id}>{r.name} ({r.id})</option>
                                            ))}
                                          </select>
                                        </div>
                                        <div className="flex gap-1">
                                          <input
                                            type="number"
                                            placeholder="Pitch"
                                            required
                                            value={hotspot.pitch}
                                            onChange={(e) => {
                                              const next = [...tourRooms];
                                              next[idx].hotspots![hIdx].pitch = Number(e.target.value);
                                              setTourRooms(next);
                                            }}
                                            className="w-1/2 px-1 py-1 border border-zinc-250 dark:border-zinc-700 bg-white dark:bg-zinc-950 rounded text-[10px]"
                                          />
                                          <input
                                            type="number"
                                            placeholder="Yaw"
                                            required
                                            value={hotspot.yaw}
                                            onChange={(e) => {
                                              const next = [...tourRooms];
                                              next[idx].hotspots![hIdx].yaw = Number(e.target.value);
                                              setTourRooms(next);
                                            }}
                                            className="w-1/2 px-1 py-1 border border-zinc-250 dark:border-zinc-700 bg-white dark:bg-zinc-950 rounded text-[10px]"
                                          />
                                        </div>
                                        <div className="flex justify-end">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const next = [...tourRooms];
                                              next[idx].hotspots = next[idx].hotspots!.filter((_, i) => i !== hIdx);
                                              setTourRooms(next);
                                            }}
                                            className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-rose-500 rounded"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setTourRooms([...tourRooms, { id: `room-${tourRooms.length + 1}`, name: `Room ${tourRooms.length + 1}`, panorama: "", hotspots: [] }]);
                          }}
                          className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100/50 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add another room</span>
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {formStep === 5 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <h3 className="font-bold text-lg font-outfit">Step 5: House Rules</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Smoking allowed */}
                      <label className="flex items-center gap-2 p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-950/20">
                        <input
                          type="checkbox"
                          checked={smokingAllowed}
                          onChange={(e) => setSmokingAllowed(e.target.checked)}
                          className="rounded border-zinc-350 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-xs text-zinc-700 dark:text-zinc-300">Smoking Allowed</span>
                      </label>

                      {/* Pets allowed */}
                      <label className="flex items-center gap-2 p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-950/20">
                        <input
                          type="checkbox"
                          checked={petsAllowed}
                          onChange={(e) => setPetsAllowed(e.target.checked)}
                          className="rounded border-zinc-350 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-xs text-zinc-700 dark:text-zinc-300">Pets Allowed</span>
                      </label>

                      {/* Parties allowed */}
                      <label className="flex items-center gap-2 p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-950/20">
                        <input
                          type="checkbox"
                          checked={partiesAllowed}
                          onChange={(e) => setPartiesAllowed(e.target.checked)}
                          className="rounded border-zinc-350 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-xs text-zinc-700 dark:text-zinc-300">Parties / Events Allowed</span>
                      </label>

                      {/* Children allowed */}
                      <label className="flex items-center gap-2 p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-950/20">
                        <input
                          type="checkbox"
                          checked={childrenAllowed}
                          onChange={(e) => setChildrenAllowed(e.target.checked)}
                          className="rounded border-zinc-350 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-xs text-zinc-700 dark:text-zinc-300">Children Allowed</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Quiet hours start */}
                      <div>
                        <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">Quiet Hours Start</label>
                        <input
                          type="text"
                          placeholder="e.g. 22:00"
                          value={quietHoursStart}
                          onChange={(e) => setQuietHoursStart(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs focus:outline-none"
                        />
                      </div>
                      
                      {/* Quiet hours end */}
                      <div>
                        <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">Quiet Hours End</label>
                        <input
                          type="text"
                          placeholder="e.g. 07:00"
                          value={quietHoursEnd}
                          onChange={(e) => setQuietHoursEnd(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {/* Check-in From */}
                      <div>
                        <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">Check-in From</label>
                        <input
                          type="text"
                          placeholder="e.g. 14:00"
                          value={checkInFrom}
                          onChange={(e) => setCheckInFrom(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs focus:outline-none"
                        />
                      </div>
                      
                      {/* Check-in Until */}
                      <div>
                        <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">Check-in Until</label>
                        <input
                          type="text"
                          placeholder="e.g. 22:00"
                          value={checkInUntil}
                          onChange={(e) => setCheckInUntil(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs focus:outline-none"
                        />
                      </div>
                      
                      {/* Check-out By */}
                      <div>
                        <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">Check-out By</label>
                        <input
                          type="text"
                          placeholder="e.g. 11:00"
                          value={checkOutBy}
                          onChange={(e) => setCheckOutBy(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Custom Rules list */}
                    <div className="space-y-2">
                      <label className="block text-[10px] text-zinc-500 font-bold uppercase">Custom House Rules</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. No shoes inside the property."
                          value={newCustomRule}
                          onChange={(e) => setNewCustomRule(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-zinc-350 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newCustomRule.trim() === "") return;
                            setCustomRules([...customRules, newCustomRule.trim()]);
                            setNewCustomRule("");
                          }}
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
                        >
                          Add Rule
                        </button>
                      </div>

                      <div className="space-y-1">
                        {customRules.map((rule, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-950/20 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs">
                            <span>{rule}</span>
                            <button
                              type="button"
                              onClick={() => setCustomRules(customRules.filter((_, i) => i !== idx))}
                              className="text-rose-500 font-semibold hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Cancellation Policy settings */}
                    <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                      <label className="block text-[10px] text-zinc-500 font-bold uppercase">Cancellation Policy</label>
                      <select
                        value={cancellationPolicy}
                        onChange={(e) => setCancellationPolicy(e.target.value as any)}
                        className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs focus:outline-none"
                      >
                        <option value="Flexible">Flexible (Full refund 1 day prior to check-in)</option>
                        <option value="Moderate">Moderate (Full refund 5 days prior, 50% refund 2 days prior)</option>
                        <option value="Strict">Strict (Full refund 14 days prior, 50% refund 7 days prior)</option>
                        <option value="Custom">Custom (Specify custom rules below)</option>
                      </select>
                      {cancellationPolicy === "Custom" && (
                        <div>
                          <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">Custom Cancellation Description</label>
                          <textarea
                            placeholder="Detail cancellation terms..."
                            value={cancellationPolicyDetails}
                            onChange={(e) => setCancellationPolicyDetails(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-zinc-350 dark:border-zinc-750 bg-white dark:bg-zinc-900 text-xs focus:outline-none h-16"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Form Navigation buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-zinc-100 dark:border-zinc-800">
                {formStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setFormStep((prev) => prev - 1)}
                    className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-1 hover:bg-zinc-50"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Prev
                  </button>
                )}
                <div className="flex-1" />
                {formStep < 5 ? (
                  <button
                    type="button"
                    onClick={() => setFormStep((prev) => prev + 1)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1 hover:bg-indigo-700"
                  >
                    Next <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                  >
                    {formSubmitting ? "Publishing..." : "Submit Listing"}
                  </button>
                )}
              </div>
            </form>
          </div>
        ) : (
          <>
            {/* Payout Onboarding Card */}
            <div className="border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl bg-white dark:bg-zinc-900 mb-8 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-100 dark:border-zinc-800/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                    <Landmark className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold font-outfit text-base text-zinc-900 dark:text-zinc-50">Host Settlement & Payout Setup</h3>
                    <p className="text-xs text-zinc-500">Configure your bank details to automatically receive guest payouts via Razorpay Route.</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    user?.paymentProfile?.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                      : user?.paymentProfile?.status === "VERIFICATION_PENDING"
                      ? "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}>
                    Payout Route: {
                      user?.paymentProfile?.status === "ACTIVE"
                        ? "Active"
                        : user?.paymentProfile?.status === "VERIFICATION_PENDING"
                        ? "Verification Required"
                        : "Pending"
                    }
                  </span>
                  
                  {user?.paymentProfile?.linkedAccountId && user?.paymentProfile?.status !== "ACTIVE" && (
                    <button
                      onClick={handleSyncPayout}
                      disabled={syncingPayout}
                      className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                    >
                      {syncingPayout ? "Syncing..." : "Sync Status"}
                    </button>
                  )}
                  
                  <button
                    onClick={() => setShowPayoutForm(!showPayoutForm)}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                  >
                    {user?.paymentProfile?.status === "ACTIVE" ? "Update Details" : "Setup Payouts"}
                  </button>
                </div>
              </div>

              {/* Masked Payout Details if active */}
              {user?.paymentProfile?.status === "ACTIVE" && user?.bankDetails && !showPayoutForm && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-zinc-50 dark:bg-zinc-950/30 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-800/40 text-xs">
                  {user.bankDetails.upiId ? (
                    <>
                      <div>
                        <span className="text-[10px] text-zinc-400 uppercase font-bold block">UPI ID / VPA</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{user.bankDetails.upiId}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 uppercase font-bold block">Settlement Type</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">Direct UPI Payments</span>
                      </div>
                      {user.bankDetails.upiQrCodeUrl && (
                        <div>
                          <span className="text-[10px] text-zinc-400 uppercase font-bold block">QR Code Status</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">Uploaded & Active</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-[10px] text-zinc-400 uppercase font-bold block">Account Holder</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{user.bankDetails.accountHolderName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 uppercase font-bold block">Account Number</span>
                        <span className="font-mono text-zinc-800 dark:text-zinc-200">{user.bankDetails.accountNumberMasked}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 uppercase font-bold block">Provider</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">Razorpay Route (Linked)</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Inline Form */}
              {showPayoutForm && (
                <form onSubmit={handleOnboardPayout} className="space-y-4 max-w-2xl bg-zinc-50/50 dark:bg-zinc-950/10 p-5 rounded-2xl border border-zinc-200/60 dark:border-zinc-850">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-bold font-outfit text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">Select Settlement Payout Channel</h4>
                    {/* Tabs */}
                    <div className="flex gap-1 p-1 bg-zinc-150 dark:bg-zinc-800 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setPayoutMethod("bank")}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition ${
                          payoutMethod === "bank"
                            ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-sm"
                            : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                        }`}
                      >
                        Bank Transfer
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayoutMethod("upi")}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition ${
                          payoutMethod === "upi"
                            ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-sm"
                            : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                        }`}
                      >
                        Direct UPI
                      </button>
                    </div>
                  </div>

                  {payoutMethod === "upi" ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">UPI Address (VPA)</label>
                          <input
                            type="text"
                            placeholder="e.g. name@upi"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">UPI QR Code Image</label>
                          <div className="flex items-center gap-3">
                            <label className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-semibold cursor-pointer border border-dashed border-indigo-200 dark:border-indigo-900/40 transition">
                              <span>{upiQrCodeUrl ? "Change QR Code" : "Select Image"}</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleQrUpload}
                                className="hidden"
                                disabled={uploadingQr}
                              />
                            </label>
                            {uploadingQr && <span className="text-[10px] text-indigo-500 animate-pulse">Uploading...</span>}
                          </div>
                        </div>
                      </div>

                      {upiQrCodeUrl && (
                        <div>
                          <span className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">QR Code Preview</span>
                          <img src={upiQrCodeUrl} alt="UPI QR" className="h-24 w-24 object-contain border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white p-1" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Beneficiary Name (Holder)</label>
                          <input
                            type="text"
                            placeholder="Name exactly as in Bank statement"
                            value={bankHolderName}
                            onChange={(e) => setBankHolderName(e.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Account Number</label>
                          <input
                            type="text"
                            placeholder="Enter full bank account number"
                            value={bankAccountNumber}
                            onChange={(e) => setBankAccountNumber(e.target.value)}
                            required={!user?.bankDetails}
                            className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                          />
                          {user?.bankDetails && <p className="text-[9px] text-zinc-400 mt-1">Leave empty to keep existing encrypted account number.</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Bank Name</label>
                          <input
                            type="text"
                            placeholder="e.g. State Bank of India"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">IFSC Code</label>
                          <input
                            type="text"
                            placeholder="e.g. SBIN0001234"
                            value={bankIfsc}
                            onChange={(e) => setBankIfsc(e.target.value)}
                            required={!user?.bankDetails}
                            className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono uppercase"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Business/Legal Name (Optional)</label>
                          <input
                            type="text"
                            placeholder="Individual Legal Name"
                            value={bankBusinessName}
                            onChange={(e) => setBankBusinessName(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Street Address</label>
                      <input
                        type="text"
                        placeholder="Street details"
                        value={bankStreet}
                        onChange={(e) => setBankStreet(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">City</label>
                      <input
                        type="text"
                        placeholder="e.g. Panaji"
                        value={bankCity}
                        onChange={(e) => setBankCity(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Postal Code</label>
                      <input
                        type="text"
                        placeholder="e.g. 403001"
                        value={bankPostalCode}
                        onChange={(e) => setBankPostalCode(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPayoutForm(false)}
                      className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingPayout}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                    >
                      {submittingPayout ? "Registering..." : "Submit Bank Details"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Extended Analytics grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl bg-white dark:bg-zinc-900 flex items-center justify-between shadow-sm">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Net Host Earned</span>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">₹{analytics?.netHostEarnings?.toLocaleString() ?? 0}</p>
                  <p className="text-[9px] text-zinc-400">₹{analytics?.settledEarnings?.toLocaleString() ?? 0} settled • ₹{analytics?.pendingEarnings?.toLocaleString() ?? 0} pending</p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-2xl">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>

              <div className="border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl bg-white dark:bg-zinc-900 flex items-center justify-between shadow-sm">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Gross Booking Value</span>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">₹{analytics?.grossBookingValue?.toLocaleString() ?? 0}</p>
                  <p className="text-[9px] text-zinc-400">Fees: ₹{analytics?.platformFees?.toLocaleString() ?? 0}</p>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-2xl">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>

              <div className="border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl bg-white dark:bg-zinc-900 flex items-center justify-between shadow-sm">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Average Booking Value</span>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">₹{Math.round(analytics?.averageBookingValue ?? 0).toLocaleString()}</p>
                  <p className="text-[9px] text-zinc-400 font-semibold">Average value per stay booking</p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-500 rounded-2xl">
                  <Percent className="h-6 w-6" />
                </div>
              </div>

              <div className="border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl bg-white dark:bg-zinc-900 flex items-center justify-between shadow-sm">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Occupancy Rate</span>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{occupancyRate}%</p>
                  <p className="text-[9px] text-zinc-400">Based on active stay days</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800 text-rose-500 rounded-2xl">
                  <Home className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* Row 2: Secondary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="border border-zinc-150 dark:border-zinc-850 p-4 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/20 space-y-1 text-center shadow-xs">
                <span className="text-[9px] uppercase font-bold text-zinc-450">Pending Verification</span>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-500">{analytics?.pendingVerificationCount ?? 0}</p>
                <p className="text-[8px] text-zinc-400">Manual UPI claims</p>
              </div>
              <div className="border border-zinc-150 dark:border-zinc-850 p-4 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/20 space-y-1 text-center shadow-xs">
                <span className="text-[9px] uppercase font-bold text-zinc-450">Upcoming Bookings</span>
                <p className="text-lg font-bold text-indigo-600 dark:text-indigo-500">{analytics?.upcomingBookingsCount ?? 0}</p>
                <p className="text-[8px] text-zinc-400">Future confirmed trips</p>
              </div>
              <div className="border border-zinc-150 dark:border-zinc-850 p-4 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/20 space-y-1 text-center shadow-xs">
                <span className="text-[9px] uppercase font-bold text-zinc-450">Completed Stays</span>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-500">{analytics?.completedBookingsCount ?? 0}</p>
                <p className="text-[8px] text-zinc-400">Past stay history</p>
              </div>
              <div className="border border-zinc-150 dark:border-zinc-850 p-4 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/20 space-y-1 text-center shadow-xs">
                <span className="text-[9px] uppercase font-bold text-zinc-450">Cancelled Stays</span>
                <p className="text-lg font-bold text-rose-600 dark:text-rose-500">{analytics?.cancelledBookingsCount ?? 0}</p>
                <p className="text-[8px] text-zinc-400">Cancellation rate: {analytics?.cancellationRate ?? 0}%</p>
              </div>
            </div>

            {/* Monthly Earnings Chart */}
            <div className="border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl bg-white dark:bg-zinc-900 mb-8 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-bold font-outfit text-base text-zinc-900 dark:text-zinc-50">Earnings Trend</h3>
                  <p className="text-[10px] text-zinc-550 dark:text-zinc-450">Monthly host payout tracking (INR)</p>
                </div>
                {/* Period badge */}
                <span className="text-[9px] bg-indigo-50 text-indigo-650 dark:bg-indigo-950/25 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Last 1 Year
                </span>
              </div>

              {!analytics?.monthlyEarnings || analytics.monthlyEarnings.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-850 rounded-2xl bg-zinc-50/40 dark:bg-zinc-950/10">
                  <TrendingUp className="h-8 w-8 text-zinc-300 dark:text-zinc-700 mb-2" />
                  <span className="text-xs">No monthly transactions recorded yet.</span>
                </div>
              ) : (
                <div className="h-48 flex items-end gap-3 pt-6 border-b border-l border-zinc-150 dark:border-zinc-850 px-4">
                  {analytics.monthlyEarnings.map((m: any, i: number) => {
                    const maxEarnings = Math.max(...analytics.monthlyEarnings.map((x: any) => x.earnings)) || 1;
                    const heightPercent = Math.max(8, (m.earnings / maxEarnings) * 100);
                    return (
                      <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-1.5 group relative">
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 dark:bg-zinc-800 text-white text-[9px] font-bold px-2 py-1 rounded-lg shadow-md pointer-events-none whitespace-nowrap z-10">
                          ₹{m.earnings.toLocaleString()}
                        </div>
                        {/* Bar Container */}
                        <div className="w-full h-32 flex items-end">
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className="w-full bg-gradient-to-t from-indigo-500 to-indigo-655 dark:from-indigo-650 dark:to-indigo-500 rounded-t-lg group-hover:opacity-85 transition-all shadow-xs cursor-pointer"
                          />
                        </div>
                        {/* Label */}
                        <span className="text-[9px] font-bold text-zinc-450 dark:text-zinc-400 truncate max-w-full">
                          {m.month}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Real Payout Transactions History List */}
            {analytics?.transactionHistory && analytics.transactionHistory.length > 0 && (
              <div className="border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl bg-white dark:bg-zinc-900 mb-8 shadow-sm">
                <h3 className="font-bold font-outfit text-base mb-4 text-zinc-900 dark:text-zinc-50">Settlement Ledger & Transactions</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-150 dark:border-zinc-805 text-zinc-400 font-bold uppercase">
                        <th className="py-3 px-2">Payment ID</th>
                        <th className="py-3 px-2">Listing</th>
                        <th className="py-3 px-2">Guest</th>
                        <th className="py-3 px-2">Gross Amount</th>
                        <th className="py-3 px-2">Platform Fee</th>
                        <th className="py-3 px-2">Host Net Share</th>
                        <th className="py-3 px-2">Settlement Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/40">
                      {analytics.transactionHistory.map((tx: any, idx: number) => (
                        <tr key={idx} className="hover:bg-zinc-50/55 dark:hover:bg-zinc-950/10">
                          <td className="py-3 px-2 font-mono text-[10px] text-zinc-500">{tx.paymentId}</td>
                          <td className="py-3 px-2 font-semibold text-zinc-800 dark:text-zinc-200">{tx.listingTitle}</td>
                          <td className="py-3 px-2 text-zinc-600 dark:text-zinc-400">{tx.guestName}</td>
                          <td className="py-3 px-2 font-semibold text-emerald-600">₹{tx.amount}</td>
                          <td className="py-3 px-2 text-rose-500">-₹{tx.platformFee}</td>
                          <td className="py-3 px-2 font-bold text-indigo-600">₹{tx.hostAmount}</td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                              tx.transferStatus === "Settled"
                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                                : tx.transferStatus === "Failed"
                                ? "bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400"
                                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                            }`}>
                              {tx.transferStatus || "Pending"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Properties column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Pending UPI Payment Verifications */}
                {reservations.filter((r) => r.status === "PendingVerification").length > 0 && (
                  <div className="space-y-4">
                    <h2 className="font-outfit text-xl font-bold text-amber-600 dark:text-amber-500">
                      ⚠️ Action Required: Verify Payments
                    </h2>
                    <p className="text-xs text-zinc-500">
                      The following guests have submitted direct UPI payments. Please verify the amount in your UPI account and approve the booking.
                    </p>
                    <div className="space-y-3">
                      {reservations
                        .filter((r) => r.status === "PendingVerification")
                        .map((resv) => (
                          <div
                            key={resv._id}
                            className="border border-amber-200 dark:border-amber-950/30 p-5 rounded-3xl bg-amber-50/50 dark:bg-amber-950/10 space-y-4 shadow-sm"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-50 font-outfit">
                                  {resv.listing?.title || "Property Listing"}
                                </h4>
                                <p className="text-xs text-zinc-500 mt-1">
                                  Guest: <span className="font-semibold">{resv.user?.name || "Guest User"}</span> ({resv.user?.email})
                                </p>
                              </div>
                              <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2.5 py-1 rounded-full font-bold">
                                Pending Verification
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs bg-white dark:bg-zinc-900/40 p-3 rounded-2xl border border-amber-100/50 dark:border-amber-900/20">
                              <div>
                                <span className="text-zinc-500">Stay Dates:</span>
                                <p className="font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">
                                  {new Date(resv.startDate).toLocaleDateString()} - {new Date(resv.endDate).toLocaleDateString()}
                                </p>
                              </div>
                              <div>
                                <span className="text-zinc-500">Total Price to Verify:</span>
                                <p className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                                  ₹{resv.totalPrice.toLocaleString()}
                                </p>
                              </div>
                              <div className="col-span-2 border-t border-zinc-100 dark:border-zinc-800/50 pt-2 flex items-center justify-between">
                                <div>
                                  <span className="text-zinc-500">UPI Txn Reference ID:</span>
                                  <p className="font-mono font-bold text-zinc-900 dark:text-zinc-50 select-all cursor-pointer" title="Double click to copy">
                                    {resv.upiTxnId || "N/A"}
                                  </p>
                                </div>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(resv.upiTxnId || "");
                                    toast.success("Transaction ID copied to clipboard!");
                                  }}
                                  className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                                >
                                  Copy ID
                                </button>
                              </div>
                            </div>

                            <div className="flex gap-3">
                              <button
                                onClick={() => handleVerifyUpiPayment(resv._id, "approve")}
                                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Check className="w-4 h-4" />
                                <span>Approve Booking</span>
                              </button>
                              <button
                                onClick={() => handleVerifyUpiPayment(resv._id, "reject")}
                                className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/30 text-rose-600 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                                <span>Reject Payment</span>
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {reservations.filter((r) => r.status === "Confirmed" && new Date(r.endDate) >= new Date()).length > 0 && (
                  <div className="space-y-4 my-6">
                    <h2 className="font-outfit text-xl font-bold text-indigo-600 dark:text-indigo-500">
                      Upcoming Guest Reservations
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Confirmed upcoming stays booked by guests for your properties.
                    </p>
                    <div className="space-y-3">
                      {reservations
                        .filter((r) => r.status === "Confirmed" && new Date(r.endDate) >= new Date())
                        .map((resv) => (
                          <div
                            key={resv._id}
                            className="border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl bg-white dark:bg-zinc-900 space-y-3 shadow-xs"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-50 font-outfit">
                                  {resv.listing?.title || "Property Listing"}
                                </h4>
                                <p className="text-xs text-zinc-500 mt-1">
                                  Guest: <span className="font-semibold">{resv.user?.name || "Guest User"}</span> ({resv.user?.email})
                                </p>
                              </div>
                              <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-1 rounded-full font-bold">
                                Confirmed
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/40">
                              <div>
                                <span className="text-zinc-500">Stay Dates:</span>
                                <p className="font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">
                                  {new Date(resv.startDate).toLocaleDateString()} - {new Date(resv.endDate).toLocaleDateString()}
                                </p>
                              </div>
                              <div>
                                <span className="text-zinc-500">Earnings:</span>
                                <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                  ₹{resv.totalPrice.toLocaleString()}
                                </p>
                              </div>
                              <div className="col-span-2 border-t border-zinc-100 dark:border-zinc-800/50 pt-2 flex items-center justify-between">
                                <div>
                                  <span className="text-zinc-500">Payment Method:</span>
                                  <p className="font-semibold text-zinc-700 dark:text-zinc-300 capitalize mt-0.5">
                                    {resv.paymentMethod || "gateway"}
                                  </p>
                                </div>
                                <button
                                  onClick={() => window.location.href = `/messages?listingId=${resv.listing?._id}&otherUserId=${resv.user?._id}`}
                                  className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer flex items-center gap-1 bg-transparent border-0"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>Chat with Guest</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <h2 className="font-outfit text-xl font-bold">Your Stays Inventory</h2>
                {loading ? (
                  <div className="h-48 bg-zinc-200 dark:bg-zinc-800 rounded-3xl animate-pulse" />
                ) : listings.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No stays listed yet. Click 'List New Property' to start.</p>
                ) : (
                  <div className="space-y-4">
                    {listings.map((l) => (
                      <div
                        key={l._id}
                        className="border border-zinc-200 dark:border-zinc-800 p-4 rounded-3xl bg-white dark:bg-zinc-900 flex justify-between items-center hover:shadow-sm transition"
                      >
                        <div className="flex gap-4 items-center">
                          {l.images && l.images.length > 0 ? (
                            <img
                              src={l.images[0]}
                              alt={l.title}
                              className="h-16 w-16 rounded-2xl object-cover shrink-0"
                            />
                          ) : (
                            <div className="h-16 w-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex flex-col items-center justify-center font-bold text-[8px] uppercase tracking-wider shrink-0 border border-zinc-200 dark:border-zinc-800">
                              📸 No photos
                            </div>
                          )}
                          <div>
                            <h3
                              onClick={() => window.location.href = `/listings/${l._id}`}
                              className="font-bold text-sm text-zinc-900 dark:text-zinc-50 hover:underline cursor-pointer"
                            >
                              {l.title}
                            </h3>
                            <p className="text-xs text-zinc-500">{l.city}, {l.country}</p>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400">₹{l.price}/night</span>
                              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                                <Sparkles className="w-3 h-3" /> AI pricing configured
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          <button
                            onClick={() => handleOpenCalendarModal(l)}
                            className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-500 hover:text-indigo-500 transition cursor-pointer"
                            title="Calendar & Block Dates"
                          >
                            <Calendar className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenRulesModal(l)}
                            className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-500 hover:text-indigo-500 transition cursor-pointer"
                            title="House Rules"
                          >
                            <BookOpen className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => window.location.href = `/messages?listingId=${l._id}`}
                            className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-500 hover:text-indigo-500 transition cursor-pointer"
                            title="Messages"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditListingStart(l)}
                            className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-500 hover:text-indigo-500 transition cursor-pointer"
                            title="Edit Listing"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteListing(l._id)}
                            className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 text-zinc-400 hover:text-red-500 transition cursor-pointer"
                            title="Delete Listing"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sidebar Coupons & Campaigns panel */}
              <div className="space-y-6">
                <div className="border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl bg-white dark:bg-zinc-900 space-y-4 shadow-sm">
                  <h3 className="font-outfit text-base font-bold flex items-center gap-2">
                    <Percent className="w-4 h-4 text-indigo-500" />
                    <span>Discounts Campaign manager</span>
                  </h3>

                  <form onSubmit={handleAddCoupon} className="space-y-2.5">
                    <div>
                      <select
                        required
                        value={selectedListingId}
                        onChange={(e) => setSelectedListingId(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[11px] px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-zinc-650"
                      >
                        <option value="">Select Property for Coupon ▼</option>
                        {listings.map((l) => (
                          <option key={l._id} value={l._id}>
                            {l.title} ({l.city})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        placeholder="SMART50"
                        value={newCouponCode}
                        onChange={(e) => setNewCouponCode(e.target.value)}
                        className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs px-3 py-2 rounded-xl focus:ring-1 focus:ring-indigo-500 font-mono font-semibold"
                      />
                      <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-2 py-2 rounded-xl focus-within:ring-1 focus-within:ring-indigo-500">
                        <input
                          type="number"
                          min="5"
                          max="100"
                          required
                          placeholder="25"
                          value={newCouponDiscount}
                          onChange={(e) => setNewCouponDiscount(e.target.value)}
                          className="w-10 bg-transparent text-xs text-right border-none focus:outline-none p-0 focus:ring-0 font-semibold"
                        />
                        <span className="text-[10px] text-zinc-400 font-bold">%</span>
                      </div>
                      <button
                        type="submit"
                        className="bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-semibold hover:bg-indigo-700 cursor-pointer"
                      >
                        Create
                      </button>
                    </div>
                  </form>
                  <p className="text-[9px] text-zinc-400 italic">Allowed range: 5% – 100%</p>

                  <div className="space-y-2 pt-2">
                    {coupons.length === 0 ? (
                      <p className="text-[10px] text-zinc-500 italic text-center py-2">No active campaigns.</p>
                    ) : (
                      coupons.map((coupon) => (
                        <div
                          key={coupon._id}
                          className={`flex justify-between items-center p-2.5 rounded-xl border transition ${
                            coupon.active
                              ? "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900"
                              : "bg-zinc-100/50 dark:bg-zinc-900/20 border-zinc-200 dark:border-zinc-800 opacity-60"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleCoupon(coupon._id)}
                              className="focus:outline-none cursor-pointer"
                              title={coupon.active ? "Deactivate Coupon" : "Activate Coupon"}
                            >
                              <Check className={`w-3.5 h-3.5 ${coupon.active ? "text-emerald-500" : "text-zinc-400"}`} />
                            </button>
                            <div>
                              <span className="font-mono text-xs font-bold block">{coupon.code}</span>
                              <span className="text-[9px] text-zinc-400 block">{coupon.active ? "Active" : "Inactive"}</span>
                              {listings.find((l) => l._id === coupon.eligibleListings?.[0])?.title && (
                                <span className="text-[8px] text-zinc-500 font-semibold block truncate max-w-[120px]" title={listings.find((l) => l._id === coupon.eligibleListings?.[0])?.title}>
                                  {listings.find((l) => l._id === coupon.eligibleListings?.[0])?.title}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-indigo-500 font-bold">{coupon.discountPercent}% off</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteCoupon(coupon._id)}
                              className="p-1 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg cursor-pointer"
                              title="Revoke Coupon"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* AI Host Advisor Sidebar Panel */}
        <AnimatePresence>
          {showAiAdvisor && (
            <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 z-50 flex flex-col shadow-2xl">
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                  <h3 className="font-bold font-outfit text-sm">AI Host Consultant</h3>
                </div>
                <button
                  onClick={() => setShowAiAdvisor(false)}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat history logs */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-zinc-50/20 dark:bg-zinc-900/30">
                {aiChatHistory.length === 0 ? (
                  <div className="text-center p-6 text-zinc-400 space-y-2 mt-8">
                    <MessageSquare className="w-12 h-12 mx-auto text-zinc-300" />
                    <p className="text-xs">Ask me questions about optimizing pricing, attracting reviews, or adjusting occupancy rates.</p>
                  </div>
                ) : (
                  aiChatHistory.map((h, i) => (
                    <div key={i} className={`flex ${h.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`p-3 rounded-2xl text-xs max-w-[80%] ${
                          h.role === "user"
                            ? "bg-indigo-600 text-white rounded-tr-none"
                            : "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-100 dark:border-zinc-800 rounded-tl-none"
                        }`}
                      >
                        {h.parts}
                      </div>
                    </div>
                  ))
                )}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-100 dark:bg-zinc-800 text-zinc-400 px-3 py-2 rounded-2xl text-xs animate-pulse">
                      Analyzing listing performance...
                    </div>
                  </div>
                )}
              </div>

              {/* Input Footer */}
              <form onSubmit={handleAiChatSubmit} className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex gap-2">
                <input
                  type="text"
                  placeholder="Ask advisor..."
                  value={aiChatInput}
                  onChange={(e) => setAiChatInput(e.target.value)}
                  className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3.5 py-2.5 rounded-full text-xs"
                />
                <button
                  type="submit"
                  disabled={!aiChatInput.trim() || aiLoading}
                  className="bg-indigo-600 hover:bg-indigo-755 text-white p-2.5 rounded-full shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Calendar & Block Dates Modal */}
      {showCalendarModal && calendarListing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
            <button
              onClick={() => setShowCalendarModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-full text-zinc-400 hover:text-zinc-600 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="font-outfit text-xl font-bold mb-1">Calendar & Availability</h2>
            <p className="text-xs text-zinc-500 mb-6">Manage blackout dates, maintenance blocks, and view bookings for <span className="font-semibold text-zinc-700 dark:text-zinc-300">"{calendarListing.title}"</span></p>

            {calendarLoading ? (
              <div className="py-20 text-center text-xs text-zinc-400 animate-pulse">Loading calendar records...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Side: Calendar Display */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-950 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                      className="p-1 hover:bg-white dark:hover:bg-zinc-900 rounded-lg text-zinc-500 transition"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <span className="font-outfit font-bold text-xs">
                      {currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}
                    </span>
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                      className="p-1 hover:bg-white dark:hover:bg-zinc-900 rounded-lg text-zinc-500 transition"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Calendar Grid */}
                  <div>
                    <div className="grid grid-cols-7 gap-1 text-center mb-1">
                      {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                        <span key={day} className="text-[10px] font-bold text-zinc-400 py-1">{day}</span>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {getDaysInMonth(currentMonth).map((day, idx) => {
                        if (!day) return <div key={`empty-${idx}`} className="aspect-square bg-zinc-50/30 dark:bg-zinc-950/10 rounded-lg"></div>;
                        const statusObj = getDayStatus(day);
                        return (
                          <div
                            key={day.toISOString()}
                            className={`aspect-square rounded-lg flex flex-col items-center justify-center relative cursor-default transition ${statusObj.color}`}
                            title={statusObj.data?.reason || statusObj.status}
                          >
                            <span className={`text-xs font-bold ${statusObj.text}`}>{day.getDate()}</span>
                            {/* Tiny dot indicators for context */}
                            {statusObj.status !== "available" && (
                              <span className="absolute bottom-1 w-1 h-1 bg-white rounded-full"></span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Status Legend */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-500">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 bg-emerald-500 rounded-md"></span>
                      <span>Available</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 bg-rose-500 rounded-md"></span>
                      <span>Booked</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 bg-amber-500 rounded-md"></span>
                      <span>Pending/Locked</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 bg-zinc-900 dark:bg-zinc-800 rounded-md"></span>
                      <span>Blocked</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 bg-blue-500 rounded-md"></span>
                      <span>Maintenance</span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Manage & Actions */}
                <div className="space-y-6">
                  {/* Block Dates Form */}
                  <form onSubmit={handleBlockDatesSubmit} className="bg-zinc-50 dark:bg-zinc-950/30 border border-zinc-150 dark:border-zinc-800 p-4 rounded-2xl space-y-4">
                    <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Set Dates Blackout</h3>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Start Date</label>
                        <input
                          type="date"
                          value={blockStart}
                          onChange={(e) => setBlockStart(e.target.value)}
                          required
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 rounded-xl text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">End Date</label>
                        <input
                          type="date"
                          value={blockEnd}
                          onChange={(e) => setBlockEnd(e.target.value)}
                          required
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 rounded-xl text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Block Type</label>
                        <select
                          value={blockType}
                          onChange={(e) => setBlockType(e.target.value as any)}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 rounded-xl text-xs"
                        >
                          <option value="host-blocked">Host Blocked</option>
                          <option value="maintenance">Maintenance</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">Reason/Note</label>
                        <input
                          type="text"
                          value={blockReason}
                          onChange={(e) => setBlockReason(e.target.value)}
                          placeholder="e.g. Renovation work"
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 rounded-xl text-xs"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={blockingSubmit}
                      className="w-full py-2.5 bg-zinc-900 dark:bg-zinc-850 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl transition disabled:opacity-50 cursor-pointer"
                    >
                      {blockingSubmit ? "Saving..." : "Apply Blackout Block"}
                    </button>
                  </form>

                  {/* Active Blackouts List */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Active Blackout Blocks</h3>
                    {(!calendarData?.blackoutDates || calendarData.blackoutDates.length === 0) ? (
                      <p className="text-[10px] text-zinc-400 italic">No custom dates blocked for this listing.</p>
                    ) : (
                      <div className="max-h-[160px] overflow-y-auto space-y-2 border border-zinc-100 dark:border-zinc-800 p-2 rounded-xl">
                        {calendarData.blackoutDates.map((b: any, bIdx: number) => (
                          <div key={bIdx} className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-xl text-[10px] border border-zinc-100 dark:border-zinc-800">
                            <div>
                              <p className="font-bold">
                                {new Date(b.startDate).toLocaleDateString()} - {new Date(b.endDate).toLocaleDateString()}
                              </p>
                              <p className="text-zinc-400 mt-0.5">
                                Type: <span className="font-medium text-zinc-600 dark:text-zinc-400">{b.type || "host-blocked"}</span>
                                {b.reason && ` | Reason: "${b.reason}"`}
                              </p>
                            </div>
                            <button
                              onClick={() => handleUnblockDates(b.startDate, b.endDate)}
                              className="text-red-500 hover:text-red-750 font-bold hover:bg-red-50 dark:hover:bg-red-950/20 px-2 py-1 rounded-lg transition cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* House Rules Modal */}
      {showRulesModal && rulesListing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl p-6 relative">
            <button
              onClick={() => setShowRulesModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-full text-zinc-400 hover:text-zinc-600 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="font-outfit text-xl font-bold mb-1">House Rules</h2>
            <p className="text-xs text-zinc-500 mb-6">Configure access permissions for <span className="font-semibold text-zinc-700 dark:text-zinc-300">"{rulesListing.title}"</span></p>

            <form onSubmit={handleRulesSubmit} className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850">
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Smoking Allowed</span>
                  <input
                    type="checkbox"
                    checked={rulesForm.smokingAllowed}
                    onChange={(e) => setRulesForm({ ...rulesForm, smokingAllowed: e.target.checked })}
                    className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                <div className="flex justify-between items-center p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850">
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Pets Allowed</span>
                  <input
                    type="checkbox"
                    checked={rulesForm.petsAllowed}
                    onChange={(e) => setRulesForm({ ...rulesForm, petsAllowed: e.target.checked })}
                    className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                <div className="flex justify-between items-center p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850">
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Parties Allowed</span>
                  <input
                    type="checkbox"
                    checked={rulesForm.partiesAllowed}
                    onChange={(e) => setRulesForm({ ...rulesForm, partiesAllowed: e.target.checked })}
                    className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                <div className="flex justify-between items-center p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-850">
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Children Allowed</span>
                  <input
                    type="checkbox"
                    checked={rulesForm.childrenAllowed}
                    onChange={(e) => setRulesForm({ ...rulesForm, childrenAllowed: e.target.checked })}
                    className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Check-in From</label>
                    <input
                      type="text"
                      value={rulesForm.checkInFrom}
                      onChange={(e) => setRulesForm({ ...rulesForm, checkInFrom: e.target.value })}
                      placeholder="14:00"
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold uppercase mb-1">Check-out By</label>
                    <input
                      type="text"
                      value={rulesForm.checkOutBy}
                      onChange={(e) => setRulesForm({ ...rulesForm, checkOutBy: e.target.value })}
                      placeholder="11:00"
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-3 py-2 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={rulesSubmit}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-705 text-white font-bold text-xs rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {rulesSubmit ? "Saving..." : "Save House Rules"}
              </button>
            </form>
          </div>
        </div>
      )}

      <AiAssistant />
      <Footer />
    </div>
  );
}
