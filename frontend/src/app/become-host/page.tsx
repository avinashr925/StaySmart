"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { authApi, listingsApi } from "@/services/api";
import {
  User as UserIcon,
  Phone,
  Mail,
  Landmark,
  QrCode,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Check,
  Upload,
  Plus,
  Trash2,
  FileText,
  MapPin,
  HelpCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

export default function BecomeHost() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();

  // Redirect if not logged in, or already onboarded
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        toast.error("Please log in to become a host.");
        router.push("/login");
      } else if (user.role === "Host" && user.isOnboarded) {
        toast.success("You are already onboarded as a host.");
        router.push("/dashboard/host");
      }
    }
  }, [user, authLoading, router]);

  // Step state
  const [step, setStep] = useState(1);

  // Step 1: Basic Info
  const [fullName, setFullName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || user?.phoneNumber || "");
  const [email, setEmail] = useState(user?.email || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [address, setAddress] = useState(user?.address || "");
  const [city, setCity] = useState(user?.city || "");
  const [state, setState] = useState(user?.state || "");
  const [country, setCountry] = useState(user?.country || "India");

  // Step 2: Hosting Rules
  const [smokingAllowed, setSmokingAllowed] = useState(false);
  const [petsAllowed, setPetsAllowed] = useState(false);
  const [partiesAllowed, setPartiesAllowed] = useState(false);
  const [childrenAllowed, setChildrenAllowed] = useState(true);
  const [quietHoursStart, setQuietHoursStart] = useState("22:00");
  const [quietHoursEnd, setQuietHoursEnd] = useState("08:00");
  const [checkInFrom, setCheckInFrom] = useState("14:00");
  const [checkInUntil, setCheckInUntil] = useState("22:00");
  const [checkOutBy, setCheckOutBy] = useState("11:00");
  const [customRules, setCustomRules] = useState<string[]>([]);
  const [newRule, setNewRule] = useState("");

  // Step 3: Payout Method & Details
  const [payoutMethod, setPayoutMethod] = useState<"bank" | "upi">("bank");
  // Bank fields
  const [accountHolderName, setAccountHolderName] = useState(user?.bankDetails?.accountHolderName || "");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState(user?.bankDetails?.bankName || "");
  const [ifsc, setIfsc] = useState("");
  // UPI fields
  const [upiId, setUpiId] = useState(user?.bankDetails?.upiId || "");
  const [upiQrCodeUrl, setUpiQrCodeUrl] = useState(user?.bankDetails?.upiQrCodeUrl || "");
  const [uploadingQr, setUploadingQr] = useState(false);

  // GST Details fields
  const [gstRegistered, setGstRegistered] = useState<"No" | "Yes">("No");
  const [gstin, setGstin] = useState("");
  const [gstLegalName, setGstLegalName] = useState("");
  const [gstAddress, setGstAddress] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const addCustomRule = () => {
    if (newRule.trim() && !customRules.includes(newRule.trim())) {
      setCustomRules([...customRules, newRule.trim()]);
      setNewRule("");
    }
  };

  const removeCustomRule = (rule: string) => {
    setCustomRules(customRules.filter((r) => r !== rule));
  };

  // Image uploads using shared upload endpoint
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await listingsApi.uploadImage(formData);
      if (res.status === "success") {
        setAvatar(res.data.url);
        toast.success("Profile photo uploaded!");
      } else {
        toast.error(res.message || "Failed to upload profile photo.");
      }
    } catch (err) {
      toast.error("Upload error. Please try again.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingQr(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await listingsApi.uploadImage(formData);
      if (res.status === "success") {
        setUpiQrCodeUrl(res.data.url);
        toast.success("UPI QR Code uploaded!");
      } else {
        toast.error(res.message || "Failed to upload QR code.");
      }
    } catch (err) {
      toast.error("Upload error. Please try again.");
    } finally {
      setUploadingQr(false);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!fullName.trim()) return toast.error("Full name is required.");
      const cleanPhone = String(phone).replace(/\D/g, "");
      if (cleanPhone.length !== 10) return toast.error("A valid 10-digit phone number is required.");
      if (!email.trim() || !email.includes("@")) return toast.error("A valid email address is required.");
    } else if (step === 3) {
      if (payoutMethod === "bank") {
        if (!accountHolderName.trim()) return toast.error("Account holder name is required.");
        if (!/^\d{9,18}$/.test(accountNumber.trim())) return toast.error("Account number must be between 9 and 18 digits.");
        if (!bankName.trim()) return toast.error("Bank name is required.");
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        if (!ifscRegex.test(ifsc.trim().toUpperCase())) {
          return toast.error("Invalid IFSC code format.");
        }
      } else {
        const upiRegex = /^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/;
        if (!upiRegex.test(upiId.trim())) return toast.error("Invalid UPI ID format.");
      }

      // GST Registration validation
      if (gstRegistered === "Yes") {
        if (!gstin.trim()) return toast.error("GSTIN is required if GST registered.");
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstRegex.test(gstin.trim().toUpperCase())) {
          return toast.error("Invalid GSTIN format. Standard Indian GSTIN is 15 alphanumeric characters.");
        }
        if (!gstLegalName.trim()) return toast.error("GST Legal/Business Name is required.");
      }
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload: any = {
      fullName,
      phone,
      email,
      avatar,
      address,
      city,
      state,
      country,
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
    };

    if (payoutMethod === "bank") {
      payload.accountHolderName = accountHolderName.trim();
      payload.accountNumber = accountNumber.trim();
      payload.ifsc = ifsc.trim().toUpperCase();
      payload.bankName = bankName.trim();
    } else {
      payload.upiId = upiId.trim();
      payload.upiQrCodeUrl = upiQrCodeUrl.trim();
    }

    if (gstRegistered === "Yes") {
      payload.gstRegistered = true;
      payload.gstin = gstin.trim().toUpperCase();
      payload.gstLegalName = gstLegalName.trim();
      payload.gstAddress = gstAddress.trim();
    } else {
      payload.gstRegistered = false;
    }

    try {
      const res = await authApi.onboardHostPayment(payload);
      if (res.status === "success") {
        toast.success("Host onboarding completed successfully!");
        await refreshUser();
        router.push("/dashboard/host");
      } else {
        toast.error(res.message || "Failed to submit onboarding.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred during onboarding.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      <Navbar />

      <main className="flex-grow max-w-4xl w-full mx-auto px-4 py-12">
        {/* Banner */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold font-outfit text-zinc-950 dark:text-zinc-50">Become a Host on StaySmart</h1>
          <p className="text-sm text-zinc-500 mt-2 max-w-lg mx-auto">
            Complete your host onboarding in a few quick steps and start receiving property bookings.
          </p>
        </div>

        {/* Progress Tracker bar */}
        <div className="flex items-center justify-between mb-8 max-w-2xl mx-auto">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  step >= s
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400"
                }`}
              >
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 5 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-colors duration-300 ${
                    step > s ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-800"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl shadow-xl">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <h3 className="text-lg font-bold font-outfit text-zinc-900 dark:text-zinc-50">Step 1 — About You</h3>
                  <p className="text-xs text-zinc-500">Provide your basic profile and contact details.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                      {avatar ? (
                        <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-10 h-10 text-zinc-400" />
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-md cursor-pointer transition">
                      <Upload className="w-3.5 h-3.5" />
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    </label>
                  </div>
                  <div className="flex-1 w-full text-center md:text-left">
                    <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Host Profile Picture</h4>
                    <p className="text-xs text-zinc-500 mt-1">
                      A clear face photo helps build trust with prospective guests.
                    </p>
                    {uploadingAvatar && <p className="text-xs text-indigo-500 animate-pulse mt-1">Uploading...</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Phone Number (10 digits)</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="rahul@example.com"
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Street Address</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Flat 101, Sea Breeze Apartments"
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Panaji"
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">State / Province</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="Goa"
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleNext}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition"
                  >
                    <span>Hosting Policies</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <h3 className="text-lg font-bold font-outfit text-zinc-900 dark:text-zinc-50">Step 2 — Hosting Rules</h3>
                  <p className="text-xs text-zinc-500">Define standard guest guidelines for your listings.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    <div>
                      <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Smoking Allowed</span>
                      <p className="text-[10px] text-zinc-500">Inside the living area</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={smokingAllowed}
                      onChange={(e) => setSmokingAllowed(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    <div>
                      <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Pets Allowed</span>
                      <p className="text-[10px] text-zinc-500">Dogs, cats, or small animals</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={petsAllowed}
                      onChange={(e) => setPetsAllowed(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    <div>
                      <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Parties/Events Allowed</span>
                      <p className="text-[10px] text-zinc-500">Social events, gatherings</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={partiesAllowed}
                      onChange={(e) => setPartiesAllowed(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    <div>
                      <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Children Allowed</span>
                      <p className="text-[10px] text-zinc-500">Families with kids</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={childrenAllowed}
                      onChange={(e) => setChildrenAllowed(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Check-in From</label>
                    <input
                      type="text"
                      value={checkInFrom}
                      onChange={(e) => setCheckInFrom(e.target.value)}
                      placeholder="14:00"
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Check-in Until</label>
                    <input
                      type="text"
                      value={checkInUntil}
                      onChange={(e) => setCheckInUntil(e.target.value)}
                      placeholder="22:00"
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Check-out By</label>
                    <input
                      type="text"
                      value={checkOutBy}
                      onChange={(e) => setCheckOutBy(e.target.value)}
                      placeholder="11:00"
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Quiet Hours Start</label>
                    <input
                      type="text"
                      value={quietHoursStart}
                      onChange={(e) => setQuietHoursStart(e.target.value)}
                      placeholder="22:00"
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Quiet Hours End</label>
                    <input
                      type="text"
                      value={quietHoursEnd}
                      onChange={(e) => setQuietHoursEnd(e.target.value)}
                      placeholder="08:00"
                      className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                {/* Custom rules */}
                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-3">
                  <label className="block text-xs font-semibold text-zinc-500">Custom House Rules</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newRule}
                      onChange={(e) => setNewRule(e.target.value)}
                      placeholder="Add custom rule, e.g. No footwear inside the villa"
                      className="flex-grow px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={addCustomRule}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {customRules.map((rule) => (
                      <div
                        key={rule}
                        className="flex items-center justify-between px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-950"
                      >
                        <span className="text-zinc-700 dark:text-zinc-300 font-medium">{rule}</span>
                        <button
                          type="button"
                          onClick={() => removeCustomRule(rule)}
                          className="text-rose-500 hover:text-rose-600 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    onClick={handleBack}
                    className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    onClick={handleNext}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition"
                  >
                    <span>Payout Setup</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <h3 className="text-lg font-bold font-outfit text-zinc-900 dark:text-zinc-50">Step 3 — Settlement Setup</h3>
                  <p className="text-xs text-zinc-500">Provide bank or UPI information for guest payouts.</p>
                </div>

                {/* payout method toggle pill */}
                <div className="flex border border-zinc-200 dark:border-zinc-800 p-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-950 w-full max-w-sm">
                  <button
                    type="button"
                    onClick={() => setPayoutMethod("bank")}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                      payoutMethod === "bank" ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-sm" : "text-zinc-500"
                    }`}
                  >
                    Bank Payout (Razorpay)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayoutMethod("upi")}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                      payoutMethod === "upi" ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-sm" : "text-zinc-500"
                    }`}
                  >
                    Direct UPI Payments
                  </button>
                </div>

                {payoutMethod === "bank" ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 mb-1">Account Holder Name</label>
                        <input
                          type="text"
                          value={accountHolderName}
                          onChange={(e) => setAccountHolderName(e.target.value)}
                          placeholder="Beneficiary Legal Name"
                          className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 mb-1">Bank Name</label>
                        <input
                          type="text"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          placeholder="e.g. HDFC Bank"
                          className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 mb-1">Bank Account Number</label>
                        <input
                          type="password"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          placeholder="••••••••••••••"
                          className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                        {accountNumber && (
                          <p className="text-[10px] text-zinc-500 mt-1">
                            Masked Value: XXXX XXXX {accountNumber.substring(accountNumber.length - 4)}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 mb-1">IFSC Code</label>
                        <input
                          type="text"
                          value={ifsc}
                          onChange={(e) => setIfsc(e.target.value)}
                          placeholder="e.g. HDFC0000240"
                          className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">UPI Address (VPA)</label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="e.g. rahul@okaxis"
                        className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                  </div>
                )}

                {/* GST Registration Details */}
                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-6 space-y-4">
                  <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">GST Compliance Setup</h4>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-zinc-500">Are you registered for GST in India?</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setGstRegistered("No")}
                        className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
                          gstRegistered === "No"
                            ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900"
                            : "border-zinc-200 text-zinc-500"
                        }`}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() => setGstRegistered("Yes")}
                        className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
                          gstRegistered === "Yes"
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "border-zinc-200 text-zinc-500"
                        }`}
                      >
                        Yes
                      </button>
                    </div>
                  </div>

                  {gstRegistered === "Yes" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 mb-1">GSTIN (15 Characters)</label>
                        <input
                          type="text"
                          value={gstin}
                          onChange={(e) => setGstin(e.target.value)}
                          placeholder="e.g. 22AAAAA0000A1Z5"
                          className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 mb-1">Legal / Business Name</label>
                        <input
                          type="text"
                          value={gstLegalName}
                          onChange={(e) => setGstLegalName(e.target.value)}
                          placeholder="e.g. StaySmart Accommodations LLP"
                          className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-zinc-500 mb-1">Registered Business Address</label>
                        <input
                          type="text"
                          value={gstAddress}
                          onChange={(e) => setGstAddress(e.target.value)}
                          placeholder="e.g. 1st Floor, Tech Park, Goa"
                          className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    onClick={handleBack}
                    className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    onClick={handleNext}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition"
                  >
                    <span>{payoutMethod === "upi" ? "Upload QR Code" : "Review Info"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <h3 className="text-lg font-bold font-outfit text-zinc-900 dark:text-zinc-50">
                    {payoutMethod === "upi" ? "Step 4 — UPI QR Code Upload" : "Step 4 — Review Details"}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {payoutMethod === "upi"
                      ? "Upload your UPI QR code image so guests can scan it."
                      : "Confirm your host profile information before saving."}
                  </p>
                </div>

                {payoutMethod === "upi" ? (
                  <div className="space-y-6 flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl bg-zinc-50 dark:bg-zinc-950">
                    <div className="relative group">
                      <div className="w-48 h-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center overflow-hidden shadow-md">
                        {upiQrCodeUrl ? (
                          <img src={upiQrCodeUrl} alt="UPI QR Code" className="w-full h-full object-contain" />
                        ) : (
                          <QrCode className="w-16 h-16 text-zinc-300 dark:text-zinc-700" />
                        )}
                      </div>

                      <label className="absolute bottom-2 right-2 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg cursor-pointer transition">
                        <Upload className="w-4 h-4" />
                        <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
                      </label>
                    </div>

                    <div className="text-center max-w-sm space-y-1">
                      <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Upload QR Code Image</h4>
                      <p className="text-[10px] text-zinc-500">
                        Scan your BHIM, PhonePe, GPay, or Paytm QR code and save it as an image.
                      </p>
                      {uploadingQr && <p className="text-xs text-indigo-600 animate-pulse mt-2">Uploading QR Code...</p>}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center gap-3">
                      <ShieldCheck className="w-6 h-6 text-indigo-500" />
                      <div>
                        <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Compliance & Encryption</h4>
                        <p className="text-[10px] text-zinc-500 leading-relaxed">
                          Your bank account details are encrypted at rest on our secure database. StaySmart never logs
                          your full credentials or prints them in output logs.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <button
                    onClick={handleBack}
                    className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    onClick={handleNext}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition"
                  >
                    <span>Review Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <h3 className="text-lg font-bold font-outfit text-zinc-900 dark:text-zinc-50">Step 5 — Review & Submit</h3>
                  <p className="text-xs text-zinc-500">Confirm all information is correct before submitting.</p>
                </div>

                <div className="space-y-4">
                  {/* Basic Info Summary */}
                  <div className="p-5 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-2">
                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Host Information</h4>
                    <div className="grid grid-cols-2 gap-y-2 text-xs">
                      <div>
                        <span className="text-zinc-500">Name:</span> <span className="font-semibold text-zinc-800 dark:text-zinc-200">{fullName}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Phone:</span> <span className="font-semibold text-zinc-800 dark:text-zinc-200">{phone}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-zinc-500">Email:</span> <span className="font-semibold text-zinc-800 dark:text-zinc-200">{email}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-zinc-500">Address:</span> <span className="font-semibold text-zinc-800 dark:text-zinc-200">{address}, {city}, {state}, {country}</span>
                      </div>
                    </div>
                  </div>

                  {/* Policies Summary */}
                  <div className="p-5 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-2">
                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Hosting Policies</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>Smoking: <span className="font-bold">{smokingAllowed ? "Allowed" : "Not Allowed"}</span></div>
                      <div>Pets: <span className="font-bold">{petsAllowed ? "Allowed" : "Not Allowed"}</span></div>
                      <div>Parties: <span className="font-bold">{partiesAllowed ? "Allowed" : "Not Allowed"}</span></div>
                      <div>Children: <span className="font-bold">{childrenAllowed ? "Allowed" : "Not Allowed"}</span></div>
                      <div className="col-span-2">
                        Quiet Hours: <span className="font-bold">{quietHoursStart} to {quietHoursEnd}</span>
                      </div>
                      <div className="col-span-2">
                        Check-in: <span className="font-bold">{checkInFrom} - {checkInUntil}</span> | Check-out: <span className="font-bold">{checkOutBy}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Summary */}
                  <div className="p-5 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-2">
                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Payout Details</h4>
                    <div className="text-xs">
                      {payoutMethod === "bank" ? (
                        <div className="space-y-1">
                          <p>Payout Option: <span className="font-bold">Bank Transfer</span></p>
                          <p>Holder Name: <span className="font-bold">{accountHolderName}</span></p>
                          <p>Bank Name: <span className="font-bold">{bankName}</span></p>
                          <p>Account Number: <span className="font-bold">XXXX XXXX {accountNumber.substring(accountNumber.length - 4)}</span></p>
                          <p>IFSC Code: <span className="font-bold">{ifsc.toUpperCase()}</span></p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p>Payout Option: <span className="font-bold">Direct UPI</span></p>
                          <p>UPI ID: <span className="font-bold">{upiId}</span></p>
                          {upiQrCodeUrl && (
                            <div className="mt-2">
                              <span className="text-zinc-500">QR Code Image:</span>
                              <img src={upiQrCodeUrl} alt="UPI QR preview" className="w-16 h-16 object-contain border border-zinc-200 rounded mt-1" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    disabled={submitting}
                    onClick={handleBack}
                    className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{submitting ? "Submitting..." : "Submit Onboarding"}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </div>
  );
}
