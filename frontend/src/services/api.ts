const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

const getHeaders = (isMultipart = false) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : "";
  const headers: HeadersInit = {};
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }
  
  return headers;
};

// -------------------------------------------------------------
// AUTH & SESSIONS
// -------------------------------------------------------------
export const authApi = {
  forgotPassword: async (email: string) => {
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ email }),
    });
    return res.json();
  },

  resetPassword: async (token: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/reset-password/${token}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ password }),
    });
    return res.json();
  },

  updatePassword: async (passwords: Record<string, string>) => {
    const res = await fetch(`${API_URL}/auth/update-password`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(passwords),
    });
    return res.json();
  },

  verifyEmail: async (token: string) => {
    const res = await fetch(`${API_URL}/auth/verify-email/${token}`);
    return res.json();
  },

  getSessions: async () => {
    const res = await fetch(`${API_URL}/auth/sessions`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  revokeSession: async (sessionId: string) => {
    const res = await fetch(`${API_URL}/auth/sessions/${sessionId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return res.json();
  },

  revokeOtherSessions: async () => {
    const res = await fetch(`${API_URL}/auth/sessions/other`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return res.json();
  },

  sendOtp: async (email: string) => {
    const res = await fetch(`${API_URL}/auth/send-otp`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ email }),
    });
    return res.json();
  },

  verifyOtp: async (email: string, otp: string) => {
    const res = await fetch(`${API_URL}/auth/verify-otp`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ email, otp }),
    });
    return res.json();
  },

  updateProfile: async (profileData: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/auth/profile`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(profileData),
    });
    return res.json();
  },

  onboardHostPayment: async (onboardingData: Record<string, unknown>) => {
    const res = await fetch(`${API_URL}/auth/host/onboarding`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(onboardingData),
    });
    return res.json();
  },

  syncHostPaymentStatus: async () => {
    const res = await fetch(`${API_URL}/auth/host/onboarding/sync`, {
      method: "POST",
      headers: getHeaders(),
    });
    return res.json();
  },

  uploadAvatar: async (formData: FormData) => {
    const res = await fetch(`${API_URL}/auth/profile/upload-avatar`, {
      method: "POST",
      headers: getHeaders(true),
      body: formData,
    });
    return res.json();
  },

  removeAvatar: async () => {
    const res = await fetch(`${API_URL}/auth/profile/avatar`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return res.json();
  },
};

// -------------------------------------------------------------
// LISTINGS
// -------------------------------------------------------------
export const listingsApi = {
  getAll: async (params?: Record<string, unknown>) => {
    const query = params ? "?" + new URLSearchParams(params as unknown as Record<string, string>).toString() : "";
    const res = await fetch(`${API_URL}/listings${query}`);
    return res.json();
  },

  getOne: async (id: string) => {
    const res = await fetch(`${API_URL}/listings/${id}`);
    return res.json();
  },

  create: async (data: FormData | Record<string, unknown>) => {
    const isFormData = data instanceof FormData;
    const res = await fetch(`${API_URL}/listings`, {
      method: "POST",
      headers: getHeaders(isFormData),
      body: isFormData ? data : JSON.stringify(data),
    });
    return res.json();
  },

  update: async (id: string, data: FormData | Record<string, unknown>) => {
    const isFormData = data instanceof FormData;
    const res = await fetch(`${API_URL}/listings/${id}`, {
      method: "PUT",
      headers: getHeaders(isFormData),
      body: isFormData ? data : JSON.stringify(data),
    });
    return res.json();
  },

  uploadImage: async (formData: FormData) => {
    const res = await fetch(`${API_URL}/listings/upload`, {
      method: "POST",
      headers: getHeaders(true),
      body: formData,
    });
    return res.json();
  },

  delete: async (id: string) => {
    const res = await fetch(`${API_URL}/listings/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return res.json();
  },

  getHostListings: async () => {
    const res = await fetch(`${API_URL}/listings/host`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  getHostAnalytics: async () => {
    const res = await fetch(`${API_URL}/listings/host/analytics`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  getWeather: async (id: string) => {
    const res = await fetch(`${API_URL}/listings/${id}/weather`);
    return res.json();
  },

  getNearbyAttractions: async (id: string) => {
    const res = await fetch(`${API_URL}/listings/${id}/nearby`);
    return res.json();
  },

  getCalendar: async (id: string) => {
    const res = await fetch(`${API_URL}/listings/${id}/calendar`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  blockDates: async (id: string, payload: { startDate: string; endDate: string; type?: string; reason?: string }) => {
    const res = await fetch(`${API_URL}/listings/${id}/block-dates`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  unblockDates: async (id: string, payload: { startDate: string; endDate: string }) => {
    const res = await fetch(`${API_URL}/listings/${id}/unblock-dates`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  },
};

// -------------------------------------------------------------
// BOOKINGS
// -------------------------------------------------------------
export const bookingsApi = {

  getGuestBookings: async () => {
    const res = await fetch(`${API_URL}/bookings/guest`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  getHostBookings: async () => {
    const res = await fetch(`${API_URL}/bookings/host`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  cancel: async (id: string) => {
    const res = await fetch(`${API_URL}/bookings/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return res.json();
  },

  getRefundPreview: async (id: string) => {
    const res = await fetch(`${API_URL}/bookings/${id}/refund-preview`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  getListingBookedDates: async (listingId: string) => {
    const res = await fetch(`${API_URL}/bookings/listing/${listingId}`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  joinWaitlist: async (payload: { listingId: string; startDate: string; endDate: string }) => {
    const res = await fetch(`${API_URL}/bookings/waitlist`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  getChatContext: async (listingId: string, otherUserId: string) => {
    const res = await fetch(`${API_URL}/bookings/chat-context?listingId=${listingId}&otherUserId=${otherUserId}`, {
      headers: getHeaders(),
    });
    return res.json();
  },
};

// -------------------------------------------------------------
// REVIEWS
// -------------------------------------------------------------
export const reviewsApi = {
  getListingReviews: async (listingId: string) => {
    const res = await fetch(`${API_URL}/reviews/listing/${listingId}`);
    return res.json();
  },

  create: async (listingId: string, formData: FormData) => {
    const res = await fetch(`${API_URL}/reviews/listing/${listingId}`, {
      method: "POST",
      headers: getHeaders(true),
      body: formData,
    });
    return res.json();
  },

  delete: async (id: string) => {
    const res = await fetch(`${API_URL}/reviews/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return res.json();
  },
};

// -------------------------------------------------------------
// WISHLIST
// -------------------------------------------------------------
export const wishlistApi = {
  get: async () => {
    const res = await fetch(`${API_URL}/wishlist`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  toggle: async (listingId: string) => {
    const res = await fetch(`${API_URL}/wishlist/toggle`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ listingId }),
    });
    return res.json();
  },
};

// -------------------------------------------------------------
// REAL-TIME MESSAGING
// -------------------------------------------------------------
export const messagesApi = {
  getConversations: async () => {
    const res = await fetch(`${API_URL}/messages/conversations`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  getHistory: async (otherUserId: string, listingId?: string) => {
    const query = listingId ? `?listingId=${listingId}` : "";
    const res = await fetch(`${API_URL}/messages/history/${otherUserId}${query}`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  sendMessage: async (payload: { receiverId: string; message: string; listingId?: string; attachments?: string[] }) => {
    const res = await fetch(`${API_URL}/messages`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  markAsRead: async (otherUserId: string) => {
    const res = await fetch(`${API_URL}/messages/read/${otherUserId}`, {
      method: "POST",
      headers: getHeaders(),
    });
    return res.json();
  },

  uploadAttachment: async (formData: FormData) => {
    const res = await fetch(`${API_URL}/messages/upload`, {
      method: "POST",
      headers: getHeaders(true),
      body: formData,
    });
    return res.json();
  },
};

// -------------------------------------------------------------
// PAYMENTS & BILLING
// -------------------------------------------------------------
export const paymentsApi = {
  checkout: async (payload: { listingId: string; startDate: string; endDate: string; couponCode?: string }) => {
    const res = await fetch(`${API_URL}/payments/checkout`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  confirm: async (payload: { paymentId: string; bookingId: string; orderId: string; signature: string }) => {
    const body = payload;
    const res = await fetch(`${API_URL}/payments/confirm`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return res.json();
  },

  getInvoice: async (bookingId: string) => {
    const res = await fetch(`${API_URL}/payments/invoice/${bookingId}`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  confirmMock: async (payload: { bookingId: string; status: "SUCCESS" | "FAILURE"; paymentMethod?: string }) => {
    const res = await fetch(`${API_URL}/payments/mock/confirm`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  },
};

// -------------------------------------------------------------
// ADMIN ACTIONS
// -------------------------------------------------------------
export const adminApi = {
  approveHost: async (hostId: string) => {
    const res = await fetch(`${API_URL}/admin/approve-host/${hostId}`, {
      method: "POST",
      headers: getHeaders(),
    });
    return res.json();
  },

  suspendUser: async (userId: string, isSuspended: boolean) => {
    const res = await fetch(`${API_URL}/admin/suspend-user/${userId}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ isSuspended }),
    });
    return res.json();
  },

  deleteListing: async (listingId: string) => {
    const res = await fetch(`${API_URL}/admin/listings/${listingId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return res.json();
  },

  getSystemAnalytics: async () => {
    const res = await fetch(`${API_URL}/admin/analytics`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  getAuditLogs: async () => {
    const res = await fetch(`${API_URL}/admin/audit-logs`, {
      headers: getHeaders(),
    });
    return res.json();
  },
};

// -------------------------------------------------------------
// AI FEATURES
// -------------------------------------------------------------
export const aiApi = {
  semanticSearch: async (query: string) => {
    const res = await fetch(`${API_URL}/ai/search`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ query }),
    });
    return res.json();
  },

  generateItinerary: async (payload: { destination: string; days: number; budget: number; interests?: string }) => {
    const res = await fetch(`${API_URL}/ai/itinerary`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  chat: async (message: string, history: { role: "user" | "model"; parts: string }[], type: "host" | "guest" = "guest") => {
    const res = await fetch(`${API_URL}/ai/chat`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ message, history, type }),
    });
    return res.json();
  },

  predictPrice: async (params: {
    city: string;
    propertyType: string;
    bedrooms: number;
    bathrooms: number;
    guests: number;
    amenitiesCount: number;
  }) => {
    const query = "?" + new URLSearchParams(params as unknown as Record<string, string>).toString();
    const res = await fetch(`${API_URL}/ai/predict${query}`);
    return res.json();
  },

  getPricingDetails: async (listingId: string) => {
    const res = await fetch(`${API_URL}/ai/pricing/${listingId}`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  getForecast: async (listingId: string) => {
    const res = await fetch(`${API_URL}/ai/forecast/${listingId}`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  getOptimization: async (listingId: string) => {
    const res = await fetch(`${API_URL}/ai/optimize/${listingId}`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  getReviewInsights: async (listingId: string) => {
    const res = await fetch(`${API_URL}/ai/reviews/${listingId}`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  getRecommendations: async () => {
    const res = await fetch(`${API_URL}/ai/recommendations`, {
      headers: getHeaders(),
    });
    return res.json();
  },
};

// -------------------------------------------------------------
// COUPONS
// -------------------------------------------------------------
export const couponsApi = {
  getHostCoupons: async () => {
    const res = await fetch(`${API_URL}/coupons/host`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  create: async (couponData: { code: string; discountPercent: number; listingId?: string }) => {
    const res = await fetch(`${API_URL}/coupons/host`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(couponData),
    });
    return res.json();
  },

  toggle: async (id: string) => {
    const res = await fetch(`${API_URL}/coupons/host/${id}/toggle`, {
      method: "PATCH",
      headers: getHeaders(),
    });
    return res.json();
  },

  delete: async (id: string) => {
    const res = await fetch(`${API_URL}/coupons/host/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (res.status === 204) return { status: "success" };
    return res.json();
  },

  validate: async (code: string) => {
    const res = await fetch(`${API_URL}/coupons/validate/${code}`);
    return res.json();
  },

  getAvailable: async (listingId: string, bookingAmount?: number) => {
    const query = new URLSearchParams();
    if (listingId) query.append("listingId", listingId);
    if (bookingAmount) query.append("bookingAmount", bookingAmount.toString());
    const res = await fetch(`${API_URL}/coupons/available?${query.toString()}`, {
      headers: getHeaders(),
    });
    return res.json();
  },
};

