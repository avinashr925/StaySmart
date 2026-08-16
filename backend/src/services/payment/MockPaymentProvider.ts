import { IPaymentProvider, IOrderResponse, IRefundResponse } from "./types";

export class MockPaymentProvider implements IPaymentProvider {
  async createOrder(
    amount: number,
    currency = "INR",
    receipt: string,
    notes: Record<string, string> = {}
  ): Promise<IOrderResponse> {
    const orderId = `mock_order_${Math.random().toString(36).substring(2, 12)}`;
    return {
      id: orderId,
      amount: Math.round(amount * 100), // in paise
      currency,
    };
  }

  verifySignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): boolean {
    return !!(signature && signature.startsWith("mock_sig_"));
  }

  async fetchPayment(paymentId: string): Promise<any> {
    return {
      id: paymentId,
      amount: 1000,
      currency: "INR",
      status: "captured",
      order_id: "mock_order_123",
    };
  }

  async refund(
    paymentId: string,
    amount?: number,
    notes: Record<string, string> = {},
    reverseAllTransfers = false
  ): Promise<IRefundResponse> {
    return {
      id: `mock_ref_${Math.random().toString(36).substring(2, 12)}`,
      status: "processed",
    };
  }
}
