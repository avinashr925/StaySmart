"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AiAssistant from "@/components/AiAssistant";
import { listingsApi, bookingsApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { ShieldCheck, Plus, Trash2, Home, Landmark, Users, DollarSign, Calendar, Upload, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

interface IListing {
  _id: string;
  title: string;
  images: string[];
  price: number;
  city: string;
  country: string;
  bedrooms: number;
  propertyType: string;
}

interface IReservation {
  _id: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: string;
  listing: {
    title: string;
  } | null;
  user: {
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
  "TV"
];

const PROPERTY_TYPES = ["Entire home", "Villa", "Apartment", "Cabin", "Private room"];

export default function HostDashboard() {
  const { user } = useAuth();
  const [listings, setListings] = useState<IListing[]>([]);
  const [reservations, setReservations] = useState<IReservation[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [propertyType, setPropertyType] = useState("Entire home");
  const [bedrooms, setBedrooms] = useState("1");
  const [bathrooms, setBathrooms] = useState("1");
  const [guests, setGuests] = useState("2");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [images, setImages] = useState<FileList | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const loadHostData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const listingsRes = await listingsApi.getHostListings();
      if (listingsRes.status === "success") {
        setListings(listingsRes.data.listings || []);
      }

      const bookingsRes = await bookingsApi.getHostBookings();
      if (bookingsRes.status === "success") {
        setReservations(bookingsRes.data.bookings || []);
      }
    } catch (err) {
      toast.error("Failed to load host metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHostData();
  }, [user]);

  const handleAmenityChange = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities((prev) => prev.filter((a) => a !== amenity));
    } else {
      setSelectedAmenities((prev) => [...prev, amenity]);
    }
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("price", price);
      formData.append("address", address);
      formData.append("city", city);
      formData.append("country", country);
      formData.append("propertyType", propertyType);
      formData.append("bedrooms", bedrooms);
      formData.append("bathrooms", bathrooms);
      formData.append("guests", guests);
      formData.append("amenities", selectedAmenities.join(","));

      if (images) {
        for (let i = 0; i < images.length; i++) {
          formData.append("images", images[i]);
        }
      }

      const res = await listingsApi.create(formData);
      if (res.status === "success") {
        toast.success("Property listed successfully!");
        setShowForm(false);
        // Reset form
        setTitle("");
        setDescription("");
        setPrice("");
        setAddress("");
        setCity("");
        setCountry("");
        setSelectedAmenities([]);
        setImages(null);
        
        loadHostData();
      } else {
        toast.error(res.message || "Failed to create listing");
      }
    } catch (err) {
      toast.error("An error occurred listing property");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteListing = async (id: string) => {
    if (!confirm("Are you sure you want to delete this listing? All associated reservations and critiques will be removed.")) return;

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

  // Metrics calculations
  const totalEarnings = reservations
    .filter((r) => r.status === "Confirmed")
    .reduce((sum, r) => sum + r.totalPrice, 0);

  if (!user || (user.role !== "Host" && user.role !== "Admin")) {
    return (
      <div className="flex flex-col min-h-screen">
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
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Dashboard Title Header */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-outfit text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Host Management Dashboard</h1>
            <p className="text-xs text-zinc-500">Track and manage your vacation rentals, check bookings, and monitor earnings.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5 transition"
          >
            <Plus className="h-4 w-4" />
            <span>{showForm ? "View Stats" : "List New Property"}</span>
          </button>
        </div>

        {showForm ? (
          /* Create Listing Form */
          <div className="max-w-3xl border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl bg-white dark:bg-zinc-900 shadow-xl mb-12">
            <h2 className="font-outfit text-xl font-bold mb-6">List Your Property</h2>
            <form onSubmit={handleCreateListing} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Listing Title</label>
                  <input
                    type="text"
                    required
                    placeholder="Cozy beachfront paradise"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
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
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide details about the home layout, neighborhood, beach views..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Street Address</label>
                  <input
                    type="text"
                    required
                    placeholder="123 Ocean Drive"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">City / Location</label>
                  <input
                    type="text"
                    required
                    placeholder="Malibu"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
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
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Property Type</label>
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
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
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Bathrooms</label>
                  <input
                    type="number"
                    min="1"
                    value={bathrooms}
                    onChange={(e) => setBathrooms(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Max Guests</label>
                  <input
                    type="number"
                    min="1"
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Amenities Choice */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-2">Amenities</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AMENITIES_OPTIONS.map((a) => (
                    <label key={a} className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAmenities.includes(a)}
                        onChange={() => handleAmenityChange(a)}
                        className="rounded border-zinc-300 text-rose-500 focus:ring-rose-500 h-4 w-4"
                      />
                      <span>{a}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Multiple photo upload */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-2">Upload property photos</label>
                <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-750 p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-950 text-center relative hover:border-rose-500 transition cursor-pointer">
                  <input
                    type="file"
                    required
                    multiple
                    accept="image/*"
                    onChange={(e) => setImages(e.target.files)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
                  <span className="text-xs text-zinc-500 font-medium">
                    {images ? `${images.length} files selected` : "Drag and drop or click to upload photos (up to 5)"}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={formSubmitting}
                className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-semibold shadow transition disabled:opacity-50"
              >
                {formSubmitting ? "Creating property listing..." : "Publish Listing"}
              </button>
            </form>
          </div>
        ) : (
          /* Metrics Dashboard Cards Grid */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/40 flex items-center justify-between shadow-sm">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Properties</span>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{listings.length}</p>
                </div>
                <Home className="h-8 w-8 text-rose-500 opacity-80" />
              </div>

              <div className="border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/40 flex items-center justify-between shadow-sm">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Reservations</span>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{reservations.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-indigo-500 opacity-80" />
              </div>

              <div className="border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/40 flex items-center justify-between shadow-sm">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Total Earnings</span>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">₹{totalEarnings}</p>
                </div>
                <DollarSign className="h-8 w-8 text-emerald-500 opacity-80" />
              </div>

              <div className="border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-900/40 flex items-center justify-between shadow-sm">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Host Profile status</span>
                  <p className="text-sm font-bold text-zinc-850 dark:text-zinc-200 flex items-center gap-1 mt-2">
                    <ShieldCheck className="h-4.5 w-4.5 text-rose-500" />
                    <span>Verified Host</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Listings table managed by Host */}
              <div className="lg:col-span-2 space-y-6">
                <h2 className="font-outfit text-xl font-bold">Your Managed Properties</h2>
                {loading ? (
                  <div className="h-48 bg-zinc-200 dark:bg-zinc-800 rounded-3xl animate-pulse" />
                ) : listings.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">You don't have any properties listed. Click 'List New Property' to start.</p>
                ) : (
                  <div className="space-y-4">
                    {listings.map((l) => (
                      <div
                        key={l._id}
                        className="border border-zinc-200 dark:border-zinc-800 p-4 rounded-3xl bg-white dark:bg-zinc-900 flex justify-between items-center hover:shadow-md transition"
                      >
                        <div className="flex gap-4 items-center">
                          <img
                            src={l.images[0]}
                            alt={l.title}
                            className="h-16 w-16 rounded-2xl object-cover shrink-0"
                          />
                          <div>
                            <h3
                              onClick={() => window.location.href = `/listings/${l._id}`}
                              className="font-bold text-sm text-zinc-900 dark:text-zinc-50 hover:underline cursor-pointer"
                            >
                              {l.title}
                            </h3>
                            <p className="text-xs text-zinc-500">{l.city}, {l.country}</p>
                            <span className="text-xs font-bold text-rose-500">₹{l.price}/night</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteListing(l._id)}
                          className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-zinc-400 hover:text-red-500 transition"
                          title="Delete Listing"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reservations tracker sidebar */}
              <div className="space-y-6">
                <h2 className="font-outfit text-xl font-bold">Reservations Received</h2>
                {loading ? (
                  <div className="h-48 bg-zinc-200 dark:bg-zinc-800 rounded-3xl animate-pulse" />
                ) : reservations.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No reservations received on your properties yet.</p>
                ) : (
                  <div className="space-y-3">
                    {reservations.map((res) => (
                      <div
                        key={res._id}
                        className="border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl bg-white dark:bg-zinc-900 space-y-3 shadow-sm"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-xs text-zinc-850 dark:text-zinc-200">
                              {res.listing ? res.listing.title : "Deleted stay"}
                            </h4>
                            <div className="text-[10px] text-zinc-500 mt-1">
                              {new Date(res.startDate).toLocaleDateString()} - {new Date(res.endDate).toLocaleDateString()}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              res.status === "Cancelled"
                                ? "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                                : "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {res.status}
                          </span>
                        </div>

                        {res.user && (
                          <div className="flex gap-2 items-center bg-zinc-50 dark:bg-zinc-950 p-2 rounded-xl border border-zinc-100 dark:border-zinc-905">
                            <img
                              src={res.user.avatar}
                              alt={res.user.name}
                              className="h-8 w-8 rounded-full object-cover shrink-0"
                            />
                            <div className="overflow-hidden">
                              <p className="font-bold text-[10px] text-zinc-900 dark:text-zinc-50 truncate">{res.user.name}</p>
                              <p className="text-[9px] text-zinc-400 truncate">{res.user.email}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-baseline pt-1">
                          <span className="text-[10px] text-zinc-400 font-medium">Guest Payout:</span>
                          <span className="text-xs font-bold text-rose-500">₹{res.totalPrice}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      <AiAssistant />
      <Footer />
    </div>
  );
}
