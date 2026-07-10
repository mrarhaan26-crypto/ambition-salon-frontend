export interface CommandPaletteItem {
  id: string;
  label: string;
  description: string;
  icon: string;
  action: string;
  category: 'navigation' | 'actions' | 'ai';
}

export const COMMAND_PALETTE_ITEMS: CommandPaletteItem[] = [
  { id: 'go-dashboard', label: 'Go to Dashboard', description: 'Navigate to the home dashboard', icon: '&#127968;', action: '/app/home', category: 'navigation' },
  { id: 'go-calendar', label: 'Go to Calendar', description: 'Open the calendar view', icon: '&#128197;', action: '/app/calendar', category: 'navigation' },
  { id: 'go-bookings', label: 'Open Bookings', description: 'View all bookings', icon: '&#128197;', action: '/app/bookings', category: 'navigation' },
  { id: 'open-staff', label: 'Open Staff', description: 'Manage staff members', icon: '&#129485;', action: '/app/staff', category: 'navigation' },
  { id: 'open-pos', label: 'Open POS', description: 'Point of sale', icon: '&#128179;', action: '/app/pos', category: 'navigation' },
  { id: 'new-booking', label: 'New Booking', description: 'Create a new booking', icon: '&#128221;', action: 'new-booking', category: 'actions' },
  { id: 'search-client', label: 'Search Client', description: 'Find a client', icon: '&#128269;', action: 'search-client', category: 'actions' },
  { id: 'open-reports', label: 'Open Reports', description: 'View reports and analytics', icon: '&#128200;', action: '/app/reports', category: 'navigation' },
  { id: 'ask-ai', label: 'Ask AI Assistant', description: 'Open the AI assistant', icon: '&#129302;', action: 'open-ai-assistant', category: 'ai' },
  { id: 'open-settings', label: 'Open Settings', description: 'Configure system settings', icon: '&#9881;', action: '/app/settings', category: 'navigation' },
];