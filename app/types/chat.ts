export interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  conversationId?: string;
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
}