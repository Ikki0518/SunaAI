export interface ChatMessage {
  role: 'user' | 'bot';
  content: string;
  timestamp: number;
  isFavorite?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  conversationId?: string;
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
  isManuallyRenamed?: boolean;  // 手動でタイトルが変更されたかのフラグ
}