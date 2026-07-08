export interface WhatsAppTemplate {
  id: string;
  name: string;
  body: string;
  variables: string[];
  category: 'APPOINTMENT' | 'REMINDER' | 'PROMOTION' | 'NOTIFICATION';
  isActive: boolean;
}

export interface WhatsAppSettings {
  id: string;
  phoneNumber: string;
  businessAccountId: string;
  apiToken: string;
  isEnabled: boolean;
  templates: WhatsAppTemplate[];
}
