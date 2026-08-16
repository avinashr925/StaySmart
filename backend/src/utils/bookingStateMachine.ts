import { AppError } from "./AppError";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  Pending: ["Confirmed", "PaymentFailed", "Expired", "Cancelled", "PendingVerification"],
  PendingVerification: ["Confirmed", "Cancelled"],
  Confirmed: ["Cancelled", "Completed", "Refunded"],
  Cancelled: [],
  PaymentFailed: ["Pending", "Expired"], // Allow retry from failed status
  Expired: [],
  Completed: [],
  Refunded: [],
};

export const validateBookingTransition = (
  currentStatus: string,
  newStatus: string
): void => {
  if (currentStatus === newStatus) return;
  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new AppError(
      `Illegal booking status transition from '${currentStatus}' to '${newStatus}'.`,
      400
    );
  }
};
