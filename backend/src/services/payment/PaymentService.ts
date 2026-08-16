import { IPaymentProvider } from "./types";
import { RazorpayProvider } from "./RazorpayProvider";
import { MockPaymentProvider } from "./MockPaymentProvider";
import { isRazorpayConfigured } from "../razorpay";

class PaymentService {
  private provider: IPaymentProvider;
  private providerName: "MOCK" | "RAZORPAY" | "STRIPE" | "UPI";

  constructor() {
    const envProvider = process.env.PAYMENT_PROVIDER?.toUpperCase();
    if (envProvider === "RAZORPAY" && isRazorpayConfigured) {
      this.provider = new RazorpayProvider();
      this.providerName = "RAZORPAY";
    } else if (envProvider === "RAZORPAY") {
      // eslint-disable-next-line no-console
      console.warn("[PaymentService] Razorpay is requested but not configured. Falling back to MOCK.");
      this.provider = new MockPaymentProvider();
      this.providerName = "MOCK";
    } else {
      // Default to MOCK if not specified or not configured
      this.provider = new MockPaymentProvider();
      this.providerName = "MOCK";
    }
  }

  getProvider(): IPaymentProvider {
    return this.provider;
  }

  getProviderName(): "MOCK" | "RAZORPAY" | "STRIPE" | "UPI" {
    return this.providerName;
  }
}

export const paymentService = new PaymentService();
