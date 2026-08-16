import Listing from "../models/listing";
import Coupon from "../models/coupon";
import User from "../models/user";
import { AppError } from "../utils/AppError";

interface IGstRule {
  effectiveFrom: Date;
  effectiveTo?: Date;
  rates: {
    threshold: number;
    lowRate: number;
    highRate: number;
  };
}

// Configurable CBIC GST registry
const GST_RULES_REGISTRY: IGstRule[] = [
  {
    effectiveFrom: new Date("2022-07-18"),
    rates: {
      threshold: 7500,
      lowRate: 0.05, // 5% GST for rooms <= ₹7,500
      highRate: 0.18, // 18% GST for rooms > ₹7,500
    },
  },
];

export const calculateNights = (startDate: Date | string, endDate: Date | string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new AppError("Invalid check-in or check-out date format.", 400);
  }

  // Use UTC to prevent local DST transitions timezone discrepancies
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());

  const differenceMs = endUtc - startUtc;
  const nights = Math.ceil(differenceMs / (1000 * 60 * 60 * 24));

  return nights <= 0 ? 0 : nights;
};

export const getGstRate = (nightlyPrice: number, bookingDate: Date = new Date()): number => {
  const rule =
    GST_RULES_REGISTRY.find(
      (r) =>
        bookingDate >= r.effectiveFrom &&
        (!r.effectiveTo || bookingDate <= r.effectiveTo)
    ) || GST_RULES_REGISTRY[0];

  return nightlyPrice <= rule.rates.threshold
    ? rule.rates.lowRate
    : rule.rates.highRate;
};

export const validateAndCalculateCoupon = async (
  couponCode: string | undefined,
  accommodationAmount: number,
  listingId: string,
  userId: string
): Promise<number> => {
  if (!couponCode) return 0;

  const coupon = await Coupon.findOne({
    code: couponCode.trim().toUpperCase(),
    active: true,
  });

  if (!coupon) {
    throw new AppError("Invalid or inactive coupon code", 400);
  }

  // 1. Expiration check
  if (coupon.expirationDate && new Date() > new Date(coupon.expirationDate)) {
    throw new AppError("This coupon code has expired", 400);
  }

  // 2. Minimum booking subtotal
  if (coupon.minBookingAmount && accommodationAmount < coupon.minBookingAmount) {
    throw new AppError(
      `Minimum booking amount of ₹${coupon.minBookingAmount} is required to apply this coupon`,
      400
    );
  }

  // 3. Target listing eligibility
  if (!coupon.eligibleListings || coupon.eligibleListings.length === 0) {
    throw new AppError("This coupon is not valid for this property listing", 400);
  }
  const isEligible = coupon.eligibleListings.some(
    (id) => id.toString() === listingId.toString()
  );
  if (!isEligible) {
    throw new AppError("This coupon is not valid for this property listing", 400);
  }

  // 4. Target user eligibility
  if (coupon.eligibleUsers && coupon.eligibleUsers.length > 0) {
    const isEligible = coupon.eligibleUsers.some(
      (id) => id.toString() === userId.toString()
    );
    if (!isEligible) {
      throw new AppError("You are not eligible to use this coupon code", 400);
    }
  }

  // 5. Total usage limits
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw new AppError("This coupon code has reached its maximum usage limit", 400);
  }

  let discount = Math.round(accommodationAmount * (coupon.discountPercent / 100));

  // 6. Max discount amount cap
  if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
    discount = coupon.maxDiscountAmount;
  }

  return discount;
};

export interface IPricingBreakdown {
  nightlyPrice: number;
  nights: number;
  accommodationAmount: number;
  discount: number;
  cleaningFee: number;
  platformFee: number;
  gstRate: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalPrice: number;
  currency: string;
  hostPayout: number;
}

export const calculateBookingPrice = async (
  listingId: string,
  startDate: string,
  endDate: string,
  guestId: string,
  couponCode?: string
): Promise<IPricingBreakdown> => {
  const listing = await Listing.findById(listingId);
  if (!listing) {
    throw new AppError("Listing not found", 404);
  }

  const host = await User.findById(listing.owner);
  const guest = await User.findById(guestId);

  const nights = calculateNights(startDate, endDate);
  if (nights <= 0) {
    throw new AppError("Checkout date must be at least 1 night after check-in", 400);
  }

  const nightlyPrice = listing.price;
  const accommodationAmount = nightlyPrice * nights;

  // Server-side coupon verification
  const discount = await validateAndCalculateCoupon(
    couponCode,
    accommodationAmount,
    listingId,
    guestId
  );

  // standard cleaning and guest platform fees
  const cleaningFee = Math.round(accommodationAmount * 0.05 + 200);
  const platformFee = Math.round(accommodationAmount * 0.05);

  const taxableSubtotal = accommodationAmount - discount + cleaningFee + platformFee;

  // CBIC daily room rate threshold calculation
  const gstRate = getGstRate(nightlyPrice, new Date());
  const gstAmount = Math.round(taxableSubtotal * gstRate);

  // Intra-state vs Inter-state tax splitting (CGST + SGST vs IGST)
  const listingState = ((listing as any).state || host?.state || "Goa").trim().toLowerCase();
  const guestState = (guest?.state || "").trim().toLowerCase();

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (!guestState || guestState === listingState) {
    cgst = Math.round(gstAmount / 2);
    sgst = gstAmount - cgst;
  } else {
    igst = gstAmount;
  }

  const totalPrice = taxableSubtotal + gstAmount;

  // StaySmart platform splits: 10% platform fee from total price
  const platformCommission = Math.round(totalPrice * 0.10);
  const hostPayout = totalPrice - platformCommission;

  return {
    nightlyPrice,
    nights,
    accommodationAmount,
    discount,
    cleaningFee,
    platformFee,
    gstRate,
    gstAmount,
    cgst,
    sgst,
    igst,
    totalPrice,
    currency: "INR",
    hostPayout,
  };
};
