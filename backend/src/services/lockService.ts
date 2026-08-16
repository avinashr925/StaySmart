import Booking from "../models/booking";
import CheckoutLock from "../models/checkoutLock";
import Listing from "../models/listing";

export const acquireLock = async (
  listingId: string,
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<boolean> => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // 1) Verify no overlapping confirmed bookings exist
  const overlappingBooking = await Booking.findOne({
    listing: listingId,
    status: { $ne: "Cancelled" },
    $or: [
      { startDate: { $lt: end }, endDate: { $gt: start } },
    ],
  });

  if (overlappingBooking) {
    return false;
  }

  // 2) Verify no active checkout locks exist from other users
  const overlappingLock = await CheckoutLock.findOne({
    listing: listingId,
    user: { $ne: userId },
    $or: [
      { startDate: { $lt: end }, endDate: { $gt: start } },
    ],
  });

  if (overlappingLock) {
    return false;
  }

  // 3) Verify no overlap with listing blackout dates or maintenance mode
  const listing = await Listing.findById(listingId);
  if (!listing || listing.maintenanceMode) {
    return false;
  }

  if (listing.blackoutDates && listing.blackoutDates.length > 0) {
    const overlappingBlackout = listing.blackoutDates.some((slot: any) => {
      const bStart = new Date(slot.startDate);
      const bEnd = new Date(slot.endDate);
      return bStart < end && bEnd > start;
    });

    if (overlappingBlackout) {
      return false;
    }
  }

  // 3) Create lock (update if user already holds a lock for these dates)
  await CheckoutLock.findOneAndUpdate(
    { listing: listingId, user: userId, startDate: start, endDate: end },
    { createdAt: new Date() }, // Reset expiration timer
    { upsert: true, new: true }
  );

  return true;
};

export const releaseLock = async (
  listingId: string,
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<void> => {
  await CheckoutLock.deleteOne({
    listing: listingId,
    user: userId,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  });
};
