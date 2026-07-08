"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AiAssistant from "@/components/AiAssistant";
import { listingsApi, bookingsApi, reviewsApi, aiApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { Star, MapPin, Calendar, Users, Sparkles, ChevronRight, MessageSquare, Plus, Trash2, ShieldCheck, DollarSign } from "lucide-react";
import toast from "react-hot-toast";

interface IListing {
  _id: string;
  title: string;
  description: string;
  images: string[];
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
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const router = useRouter();

  const [listing, setListing] = useState<IListing | null>(null);
  const [reviews, setReviews] = useState<IReview[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking Form State
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  // AI Price Prediction State
  const [predicting, setPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<{ predictedPrice: number; reasoning: string } | null>(null);

  // Add Review State
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [reviewPhotos, setReviewPhotos] = useState<FileList | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

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
    if (id) loadData();
  }, [id]);

  // Handle Bookings Submit
  const handleBooking = async (e: React.FormEvent) => {
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
      const oneDayMs = 24 * 60 * 60 * 1000;
      const nights = Math.ceil((end.getTime() - start.getTime()) / oneDayMs);
      const totalPrice = nights * (listing?.price || 0);

      const res = await bookingsApi.create({
        listingId: id,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        totalPrice,
      });

      if (res.status === "success") {
        toast.success("Stay reserved successfully! Notification sent to Host.");
        router.push("/dashboard/guest");
      } else {
        toast.error(res.message || "Overlapping booking detected.");
      }
    } catch (err) {
      toast.error("Booking transaction failed.");
    } finally {
      setBookingLoading(false);
    }
  };

  // Handle AI Price check
  const handleAiPriceCheck = async () => {
    if (!listing) return;
    setPredicting(true);
    setPredictionResult(null);

    try {
      const res = await aiApi.predictPrice({
        city: listing.city,
        propertyType: listing.propertyType,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        guests: listing.guests,
        amenitiesCount: 5, // mock weight
      });

      if (res.status === "success") {
        setPredictionResult(res.data);
        toast.success("AI Price valuation complete!");
      }
    } catch (err) {
      toast.error("Could not complete price prediction");
    } finally {
      setPredicting(false);
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
        loadData(); // reload stats
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
      <div className="flex flex-col min-h-screen">
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
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
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
          </div>
        </div>

        {/* Gallery grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-3xl overflow-hidden mb-8 shadow-sm aspect-[16/9] max-h-[500px]">
          <div className="h-full w-full relative">
            <img
              src={listing.images[0]}
              alt={listing.title}
              className="h-full w-full object-cover hover:opacity-95 transition"
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
            {/* Fallback image slots if array length is small */}
            {listing.images.length < 5 &&
              Array.from({ length: 4 - (listing.images.length - 1) }).map((_, i) => (
                <img
                  key={i}
                  src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=60"
                  alt={listing.title}
                  className="h-full w-full object-cover hover:opacity-95 transition"
                />
              ))}
          </div>
        </div>

        {/* Details column grids */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Property specs & Owner Info */}
            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6 flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="font-outfit text-xl font-bold text-zinc-900 dark:text-zinc-50">
                  {listing.propertyType} hosted by {listing.owner.name}
                </h2>
                <p className="text-xs text-zinc-500">
                  {listing.guests} guests • {listing.bedrooms} bedrooms • {listing.bathrooms} bathrooms
                </p>
              </div>
              <img
                src={listing.owner.avatar}
                alt={listing.owner.name}
                className="h-12 w-12 rounded-full object-cover"
              />
            </div>

            {/* Description */}
            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
              <h3 className="font-outfit text-lg font-bold mb-3">About this space</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {listing.description}
              </p>
            </div>

            {/* AI Price check evaluation panel */}
            <div className="border border-indigo-200 dark:border-indigo-950 p-6 rounded-3xl bg-indigo-50/40 dark:bg-indigo-950/10 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />
                <h3 className="font-outfit font-bold text-sm text-indigo-900 dark:text-indigo-300">
                  StaySmart AI Pricing Evaluator
                </h3>
              </div>
              <p className="text-xs text-zinc-500">
                Compare listing values against local parameters using predictive models.
              </p>
              
              {predictionResult ? (
                <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-indigo-100 dark:border-indigo-900 space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-zinc-500">AI Estimated Fair Price:</span>
                    <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                      ₹{predictionResult.predictedPrice} / night
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed italic">
                    "{predictionResult.reasoning}"
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleAiPriceCheck}
                  disabled={predicting}
                  className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-xs shadow-sm transition disabled:opacity-50"
                >
                  {predicting ? "Evaluating specs..." : "Verify fair price"}
                </button>
              )}
            </div>

            {/* Leaflet Static Maps Coordinate Placeholder */}
            <div>
              <h3 className="font-outfit text-lg font-bold mb-4">Where you'll be</h3>
              <div className="h-64 w-full bg-zinc-100 dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center p-6 text-center">
                <div className="space-y-1">
                  <MapPin className="h-8 w-8 text-rose-500 mx-auto animate-bounce" />
                  <p className="font-bold text-sm mt-2">{listing.city}, {listing.country}</p>
                  <p className="text-xs text-zinc-400">
                    Map View at [{listing.location.coordinates[1].toFixed(4)}, {listing.location.coordinates[0].toFixed(4)}]
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Side Widget panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl bg-white dark:bg-zinc-900 shadow-xl space-y-6">
              
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">₹{listing.price}</span>
                  <span className="text-xs text-zinc-500"> / night</span>
                </div>
              </div>

              <form onSubmit={handleBooking} className="space-y-4">
                <div className="grid grid-cols-2 gap-2 border border-zinc-300 dark:border-zinc-700 rounded-2xl p-2 bg-zinc-50 dark:bg-zinc-950">
                  <div className="px-2">
                    <label className="block text-[10px] uppercase font-bold text-zinc-400">Check-in</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-transparent text-xs py-1 focus:outline-none focus:ring-0"
                    />
                  </div>
                  <div className="px-2 border-l border-zinc-300 dark:border-zinc-700">
                    <label className="block text-[10px] uppercase font-bold text-zinc-400">Check-out</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-transparent text-xs py-1 focus:outline-none focus:ring-0"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="w-full py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm shadow transition disabled:opacity-50"
                >
                  {bookingLoading ? "Reserving stay..." : "Reserve Stay"}
                </button>
              </form>

              <div className="text-center text-[10px] text-zinc-500">
                You won't be charged yet. Confirms instantly.
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-8 mb-8 space-y-8">
          
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-rose-500" />
            <h2 className="font-outfit text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Reviews ({reviews.length})
            </h2>
          </div>

          {/* List reviews */}
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
                      <img
                        src={rev.author.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150"}
                        alt={rev.author.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
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

                  {/* Review photos */}
                  {rev.images?.length > 0 && (
                    <div className="flex gap-2">
                      {rev.images.map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt="Review attachment"
                          className="h-14 w-14 rounded-lg object-cover border border-zinc-200 dark:border-zinc-800"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Review Form */}
          {user ? (
            <div className="w-full max-w-xl border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-900/40 space-y-4">
              <h3 className="font-outfit text-base font-bold flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                <span>Write a critique review</span>
              </h3>

              <form onSubmit={handleReviewSubmit} className="space-y-4">
                
                {/* Rating selection */}
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

                {/* Comment */}
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Comment</label>
                  <textarea
                    required
                    rows={4}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Provide details about your stay experience..."
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                {/* File photo upload */}
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Attach review photos (Optional)</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setReviewPhotos(e.target.files)}
                    className="text-xs text-zinc-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-200 dark:file:bg-zinc-800 file:text-zinc-700 dark:file:text-zinc-300 hover:file:opacity-90"
                  />
                </div>

                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold text-xs transition disabled:opacity-50"
                >
                  {reviewSubmitting ? "Posting..." : "Submit critique"}
                </button>
              </form>
            </div>
          ) : (
            <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50 dark:bg-zinc-900/20 text-xs text-zinc-500 italic">
              Please login or create an account to write reviews for this property.
            </div>
          )}
        </div>
      </main>

      <AiAssistant />
      <Footer />
    </div>
  );
}
