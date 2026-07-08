import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/user";
import Listing from "../models/listing";
import Review from "../models/review";
import Booking from "../models/booking";
import Wishlist from "../models/wishlist";

// Require the existing sample listings array to avoid duplicating code
const initData = require("../../init/data.js");

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/staysmart";

const amenitiesList = [
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
  "Washer",
  "Dryer"
];

const propertyTypes = ["Entire home", "Villa", "Apartment", "Cabin", "Private room"];

// Generate mock coordinates based on location
const getMockCoordinates = (city: string): [number, number] => {
  const cityLower = city.toLowerCase();
  if (cityLower.includes("malibu")) return [-118.8058, 34.0259];
  if (cityLower.includes("new york")) return [-74.006, 40.7128];
  if (cityLower.includes("tahoe")) return [-120.0324, 39.0968];
  if (cityLower.includes("cancun")) return [-86.8515, 21.1619];
  if (cityLower.includes("aspen")) return [-106.8175, 39.1911];
  if (cityLower.includes("portland")) return [-122.6784, 45.5152];
  if (cityLower.includes("florence") || cityLower.includes("tuscany")) return [11.2558, 43.7696];
  if (cityLower.includes("goa")) return [73.7486, 15.5414];
  if (cityLower.includes("mumbai")) return [72.8777, 19.076];
  if (cityLower.includes("london")) return [-0.1278, 51.5074];
  if (cityLower.includes("paris")) return [2.3522, 48.8566];
  return [73.7486 + (Math.random() - 0.5) * 2, 15.5414 + (Math.random() - 0.5) * 2]; // Default randomized Goa
};

const seedDB = async () => {
  try {
    console.log("Connecting to database for seeding...");
    await mongoose.connect(MONGO_URL);
    console.log("Connected. Clearing old database records...");

    await User.deleteMany({});
    await Listing.deleteMany({});
    await Review.deleteMany({});
    await Booking.deleteMany({});
    await Wishlist.deleteMany({});

    console.log("Creating default seed users...");

    // Create Host
    const hashedHostPassword = await bcrypt.hash("host123", 12);
    const hostUser = await User.create({
      name: "StaySmart Host",
      email: "host@staysmart.com",
      password: hashedHostPassword,
      role: "Host",
      avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=150&auto=format&fit=crop",
    });

    // Create Guest
    const hashedGuestPassword = await bcrypt.hash("guest123", 12);
    const guestUser = await User.create({
      name: "StaySmart Guest",
      email: "guest@staysmart.com",
      password: hashedGuestPassword,
      role: "Guest",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop",
    });

    console.log("Formatting and seeding listings...");

    const formattedListings = initData.data.map((item: any) => {
      // Map old image object structure to new string array
      let imageUrl = "https://images.unsplash.com/photo-1625505826533-5c80aca7d157?auto=format&fit=crop&w=800&q=60";
      if (item.image) {
        if (typeof item.image === "string") {
          imageUrl = item.image;
        } else if (item.image.url) {
          imageUrl = item.image.url;
        }
      }

      const coordinates = getMockCoordinates(item.location || item.city || "");
      const numAmenities = Math.floor(Math.random() * 5) + 3; // 3 to 7 amenities
      const listingAmenities = [...amenitiesList]
        .sort(() => 0.5 - Math.random())
        .slice(0, numAmenities);

      const propType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
      const bedrooms = Math.floor(Math.random() * 3) + 1; // 1-4 bedrooms
      const bathrooms = Math.max(1, Math.floor(bedrooms * 0.8 + Math.random()));
      const guests = bedrooms * 2;

      return {
        title: item.title,
        description: item.description,
        images: [imageUrl, "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=60"],
        price: item.price,
        city: item.location || "Goa",
        country: item.country || "India",
        address: `${Math.floor(Math.random() * 900) + 100} Cozy Retreat Lane, ${item.location || "Goa"}`,
        location: {
          type: "Point",
          coordinates,
        },
        amenities: listingAmenities,
        propertyType: propType,
        bedrooms,
        bathrooms,
        guests,
        owner: hostUser._id,
        rating: 0,
        reviewCount: 0,
      };
    });

    const seededListings = await Listing.insertMany(formattedListings);
    console.log(`Seeded ${seededListings.length} listings.`);

    console.log("Generating initial reviews and bookings...");

    // Seed some mock reviews for the first 5 listings
    for (let i = 0; i < 5; i++) {
      const listing = seededListings[i];
      
      const review = await Review.create({
        listing: listing._id,
        author: guestUser._id,
        rating: Math.floor(Math.random() * 2) + 4, // 4 or 5 star rating
        comment: `Absolutely loved our stay here! The location was perfect and the host was extremely helpful and responsive. Clean, comfortable, and beautiful space.`,
        images: ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=500&q=60"],
      });

      // Update listings ratings
      listing.rating = review.rating;
      listing.reviewCount = 1;
      await listing.save();

      // Create a booking in the past for this review
      await Booking.create({
        listing: listing._id,
        user: guestUser._id,
        startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        totalPrice: listing.price * 3,
        status: "Confirmed",
      });

      // Create a future booking
      await Booking.create({
        listing: listing._id,
        user: guestUser._id,
        startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // 8 days from now
        totalPrice: listing.price * 3,
        status: "Confirmed",
      });
    }

    console.log("Database seeding completed successfully! 🎉");
    process.exit(0);
  } catch (err) {
    console.error("Error during database seed execution:", err);
    process.exit(1);
  }
};

seedDB();
