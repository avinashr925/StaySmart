import Razorpay from "razorpay";
import crypto from "crypto";
import axios from "axios";
import { logger } from "../utils/logger";

const isProd = process.env.NODE_ENV === "production";

const keyId = process.env.RAZORPAY_KEY_ID?.trim();
const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();

const hasRazorpay = !!(keyId && keySecret && webhookSecret);

if (isProd && !hasRazorpay) {
  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET before starting StaySmart."
    );
  }
  if (!webhookSecret) {
    throw new Error(
      "RAZORPAY_WEBHOOK_SECRET is required. Configure it before starting StaySmart so webhook signatures can be verified."
    );
  }
}

export let razorpayClient: Razorpay | null = null;
export const isRazorpayConfigured = hasRazorpay;

if (hasRazorpay) {
  razorpayClient = new Razorpay({
    key_id: keyId!,
    key_secret: keySecret!,
  });
  logger.info("Razorpay payment gateway configured");
} else {
  // eslint-disable-next-line no-console
  console.warn(
    "[WARN] Razorpay is not configured in development. Payment-related endpoints will fail if invoked."
  );
}

const ensureRazorpay = () => {
  if (!hasRazorpay || !razorpayClient) {
    throw new Error(
      "Razorpay is not configured. Please set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET in your .env file."
    );
  }
};

export const getRazorpayKeyId = (): string => {
  ensureRazorpay();
  return keyId!;
};

export const createRazorpayOrder = async (
  amount: number,
  currency = "INR",
  receipt: string,
  notes: Record<string, string> = {}
): Promise<{ id: string; amount: number; currency: string }> => {
  ensureRazorpay();
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  const order: any = await razorpayClient!.orders.create({
    amount: Math.round(amount * 100),
    currency,
    receipt,
    notes,
    payment_capture: true,
  });

  return {
    id: order.id,
    amount: order.amount,
    currency: order.currency,
  };
};

export const fetchRazorpayPayment = async (paymentId: string): Promise<any> => {
  ensureRazorpay();
  return razorpayClient!.payments.fetch(paymentId);
};

export const refundRazorpayPayment = async (
  paymentId: string,
  amount?: number,
  notes: Record<string, string> = {},
  reverseAllTransfers = false
): Promise<{ id: string; status: string }> => {
  ensureRazorpay();
  const refund = (await (razorpayClient!.payments as any).refund(paymentId, {
    ...(amount !== undefined ? { amount: Math.round(amount * 100) } : {}),
    notes,
    reverse_all_transfers: reverseAllTransfers ? 1 : 0,
  })) as any;

  return {
    id: refund.id,
    status: refund.status || "processed",
  };
};

export const verifyRazorpayPaymentSignature = (
  orderId: string,
  paymentId: string,
  signature: string
): boolean => {
  ensureRazorpay();
  if (!orderId || !paymentId || !signature) return false;

  const generated = crypto
    .createHmac("sha256", keySecret!)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const expected = Buffer.from(generated, "utf8");
  const received = Buffer.from(signature, "utf8");

  return expected.length === received.length &&
    crypto.timingSafeEqual(expected, received);
};

export const verifyRazorpayWebhook = (
  rawBody: Buffer,
  signatureHeader: string | string[] | undefined
): boolean => {
  ensureRazorpay();
  if (!signatureHeader || typeof signatureHeader !== "string") return false;

  const generated = crypto
    .createHmac("sha256", webhookSecret!)
    .update(rawBody)
    .digest("hex");

  const expected = Buffer.from(generated, "utf8");
  const received = Buffer.from(signatureHeader, "utf8");

  return expected.length === received.length &&
    crypto.timingSafeEqual(expected, received);
};

export const createLinkedAccount = async (payload: any): Promise<any> => {
  ensureRazorpay();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await axios.post("https://api.razorpay.com/v1/accounts", payload, {
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
  });
  return response.data;
};

export const fetchLinkedAccount = async (accountId: string): Promise<any> => {
  ensureRazorpay();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await axios.get(`https://api.razorpay.com/v1/accounts/${accountId}`, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });
  return response.data;
};

export const createPostPaymentTransfer = async (
  paymentId: string,
  linkedAccountId: string,
  amount: number,
  currency = "INR",
  notes: Record<string, string> = {}
): Promise<{ id: string; status: string; amount: number }> => {
  ensureRazorpay();
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Transfer amount must be greater than zero.");
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  
  const payload = {
    transfers: [
      {
        account: linkedAccountId,
        amount: Math.round(amount * 100), // paise
        currency,
        notes,
      },
    ],
  };

  const response = await axios.post(
    `https://api.razorpay.com/v1/payments/${paymentId}/transfers`,
    payload,
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    }
  );

  const transfer = response.data?.items?.[0];
  if (!transfer) {
    throw new Error("Razorpay post-payment transfer creation returned empty items.");
  }

  return {
    id: transfer.id,
    status: transfer.status || "processed",
    amount: transfer.amount,
  };
};
