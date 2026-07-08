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
// LISTINGS
// -------------------------------------------------------------
export const listingsApi = {
  getAll: async (params?: Record<string, any>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    const res = await fetch(`${API_URL}/listings${query}`);
    return res.json();
  },

  getOne: async (id: string) => {
    const res = await fetch(`${API_URL}/listings/${id}`);
    return res.json();
  },

  create: async (formData: FormData) => {
    const res = await fetch(`${API_URL}/listings`, {
      method: "POST",
      headers: getHeaders(true),
      body: formData,
    });
    return res.json();
  },

  update: async (id: string, formData: FormData) => {
    const res = await fetch(`${API_URL}/listings/${id}`, {
      method: "PUT",
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
};

// -------------------------------------------------------------
// BOOKINGS
// -------------------------------------------------------------
export const bookingsApi = {
  create: async (bookingData: { listingId: string; startDate: string; endDate: string; totalPrice: number }) => {
    const res = await fetch(`${API_URL}/bookings`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(bookingData),
    });
    return res.json();
  },

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

  getListingBookedDates: async (listingId: string) => {
    const res = await fetch(`${API_URL}/bookings/listing/${listingId}`, {
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

  chat: async (message: string, history: { role: "user" | "model"; parts: string }[]) => {
    const res = await fetch(`${API_URL}/ai/chat`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ message, history }),
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
    const query = "?" + new URLSearchParams(params as any).toString();
    const res = await fetch(`${API_URL}/ai/predict${query}`);
    return res.json();
  },
};
