export interface IOrderResponse {
  id: string;
  amount: number;
  currency: string;
}

export interface IRefundResponse {
  id: string;
  status: string;
}

export interface IPaymentProvider {
  createOrder(
    amount: number,
    currency: string,
    receipt: string,
    notes?: Record<string, string>
  ): Promise<IOrderResponse>;

  verifySignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): boolean;

  fetchPayment(paymentId: string): Promise<any>;

  refund(
    paymentId: string,
    amount?: number,
    notes?: Record<string, string>,
    reverseAllTransfers?: boolean
  ): Promise<IRefundResponse>;
}
