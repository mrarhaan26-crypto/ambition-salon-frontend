export interface SmsProvider {
  id: string;
  name: string;
  provider: 'TWILIO' | 'VONAGE' | 'PLIVO' | 'AWS';
  apiKey: string;
  apiSecret: string;
  fromNumber: string;
  isEnabled: boolean;
  isDefault: boolean;
}
