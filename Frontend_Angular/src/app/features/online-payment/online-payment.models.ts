export interface PaymentTransaction {
  id: string;
  bookingId: string;
  clientName: string;
  amount: number;
  gateway: 'STRIPE' | 'PAYPAL' | 'RAZORPAY' | 'CASH' | 'CARD';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  transactionId: string;
  createdAt: string;
}

export interface PaymentGatewayConfig {
  id: string;
  gateway: string;
  isEnabled: boolean;
  apiKey: string;
  apiSecret: string;
  webhookSecret: string;
  environment: 'TEST' | 'LIVE';
}
