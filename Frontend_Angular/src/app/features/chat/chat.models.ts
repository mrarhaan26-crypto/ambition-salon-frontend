export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string | null;
  conversationId: string;
  message: string;
  createdAt: string;
  readAt: string | null;
}

export interface ChatConversation {
  id: string;
  participants: { id: string; name: string }[];
  lastMessage: string;
  lastMessageAt: string;
  lastSenderName: string;
  unreadCount: number;
  type: 'DIRECT' | 'GROUP';
  name: string | null;
}
