export interface Message {
  role: "user" | "bot";
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  conversationId?: string;
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
}

export interface ChatHistory {
  sessions: ChatSession[];
  currentSessionId: string | null;
}