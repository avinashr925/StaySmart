import { IPaymentProvider, IOrderResponse, IRefundResponse } from "./types";
import {
  createRazorpayOrder,
  verifyRazorpayPaymentSignature,
  fetchRazorpayPayment,
  refundRazorpayPayment,
} from "../razorpay";

export class RazorpayProvider implements IPaymentProvider {
  async createOrder(
    amount: number,
    currency = "INR",
    receipt: string,
    notes: Record<string, string> = {}
  ): Promise<IOrderResponse> {
    return createRazorpayOrder(amount, currency, receipt, notes);
  }

  verifySignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): boolean {
    return verifyRazorpayPaymentSignature(orderId, paymentId, signature);
  }

  async fetchPayment(paymentId: string): Promise<any> {
    return fetchRazorpayPayment(paymentId);
  }

  async refund(
    paymentId: string,
    amount?: number,
    notes: Record<string, string> = {},
    reverseAllTransfers = false
  ): Promise<IRefundResponse> {
    return refundRazorpayPayment(paymentId, amount, notes, reverseAllTransfers);
  }
}
