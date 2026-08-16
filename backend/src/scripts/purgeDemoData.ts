import mongoose from "mongoose";
import User from "../models/user";
import Listing from "../models/listing";
import Review from "../models/review";
import Booking from "../models/booking";
import Wishlist from "../models/wishlist";
import CheckoutLock from "../models/checkoutLock";
import Payment from "../models/payment";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/staysmart";

async function purgeDemoData() {
  console.log(`Connecting to MongoDB at: ${MONGO_URL}`);
  await mongoose.connect(MONGO_URL);

  try {
    // 1. Find demo users
    const demoEmails = ["host@staysmart.com", "guest@staysmart.com"];
    const demoUsers = await User.find({ email: { $in: demoEmails } });
    const demoUserIds = demoUsers.map(u => u._id);

    console.log(`Found ${demoUsers.length} demo users:`, demoEmails);

    // 2. Find listings owned by demo hosts
    const demoListings = await Listing.find({ owner: { $in: demoUserIds } });
    const demoListingIds = demoListings.map(l => l._id);

    console.log(`Found ${demoListings.length} demo listings.`);

    // Remove payments before removing the referenced bookings.
    const paymentRes = await Payment.deleteMany({
      $or: [
        { user: { $in: demoUserIds } },
        { booking: { $in: (await Booking.find({
          $or: [
            { user: { $in: demoUserIds } },
            { listing: { $in: demoListingIds } }
          ]
        }).select("_id")).map(b => b._id) } }
      ]
    });
    console.log(`Deleted ${paymentRes.deletedCount} demo payments.`);

    if (mongoose.connection.db) {
      const legacyWallets = await mongoose.connection.db.collection("wallets")
        .find({ user: { $in: demoUserIds } }, { projection: { _id: 1 } })
        .toArray();
      const legacyWalletIds = legacyWallets.map((wallet) => wallet._id);
      if (legacyWalletIds.length) {
        await mongoose.connection.db.collection("wallettransactions").deleteMany({
          wallet: { $in: legacyWalletIds },
        }).catch(() => undefined);
      }
      await mongoose.connection.db.collection("wallets").deleteMany({
        user: { $in: demoUserIds },
      }).catch(() => undefined);
    }

    // 3. Delete associated bookings, reviews, wishlists, and checkout locks
    const bookingRes = await Booking.deleteMany({
      $or: [
        { user: { $in: demoUserIds } },
        { listing: { $in: demoListingIds } }
      ]
    });
    console.log(`Deleted ${bookingRes.deletedCount} demo bookings.`);

    const reviewRes = await Review.deleteMany({
      $or: [
        { author: { $in: demoUserIds } },
        { listing: { $in: demoListingIds } }
      ]
    });
    console.log(`Deleted ${reviewRes.deletedCount} demo reviews.`);

    const lockRes = await CheckoutLock.deleteMany({
      $or: [
        { user: { $in: demoUserIds } },
        { listing: { $in: demoListingIds } }
      ]
    });
    console.log(`Deleted ${lockRes.deletedCount} demo checkout locks.`);

    // Update wishlists to pull demo listings
    await Wishlist.updateMany(
      {},
      { $pull: { listings: { $in: demoListingIds } } }
    );
    console.log(`Cleaned up wishlists containing demo listings.`);

    // 4. Delete demo listings and demo users
    const listingDelRes = await Listing.deleteMany({ _id: { $in: demoListingIds } });
    console.log(`Deleted ${listingDelRes.deletedCount} demo listings.`);

    const userDelRes = await User.deleteMany({ _id: { $in: demoUserIds } });
    console.log(`Deleted ${userDelRes.deletedCount} demo users.`);

    console.log("Demo data purge completed successfully! 🎉");
  } catch (err: any) {
    console.error("Error during demo data purge:", err);
  } finally {
    await mongoose.disconnect();
  }
}

purgeDemoData();
