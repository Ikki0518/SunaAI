import { ChatSession, ChatMessage } from '@/app/types/chat';
import {
  saveSupabaseChatSession,
  getSupabaseChatSessions,
  saveSupabaseChatMessage,
  getSupabaseChatMessages
} from '@/app/lib/supabase';

export class ChatHistoryManager {
  // Supabaseにチャットセッションを保存
  static async saveSessionToSupabase(session: ChatSession, user_id: string) {
    await saveSupabaseChatSession({
      ...session,
      user_id,
      created_at: new Date(session.createdAt).toISOString()
    });
  }

  // Supabaseからユーザーのチャットセッション一覧を取得
  static async loadSessionsFromSupabase(user_id: string): Promise<ChatSession[]> {
    return await getSupabaseChatSessions(user_id);
  }

  // Supabaseにチャットメッセージを保存
  static async saveMessageToSupabase(message: ChatMessage, session_id: string, user_id: string) {
    await saveSupabaseChatMessage({
      ...message,
      session_id,
      user_id,
      created_at: new Date(message.timestamp).toISOString()
    });
  }

  // Supabaseからチャットセッションのメッセージ一覧を取得
  static async loadMessagesFromSupabase(session_id: string): Promise<ChatMessage[]> {
    return await getSupabaseChatMessages(session_id);
  }

  // 既存のlocalStorageベースのメソッドは今後使わない
}