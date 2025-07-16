import { ChatSession, ChatMessage } from '@/app/types/chat';
import { SupabaseBatchManager } from '@/app/lib/supabase-batch';

export class ImprovedChatHistoryManager {
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1秒
  
  /**
   * リトライ機能付きでSupabaseにセッションを保存
   */
  static async saveSessionToSupabaseWithRetry(
    session: ChatSession, 
    user_id: string,
    retryCount = 0
  ): Promise<void> {
    try {
      const response = await fetch('/api/chat-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chatSession: session }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      console.log('✅ [SYNC] Session saved to Supabase');
      
      // メッセージをバッチで保存
      if (session.messages && session.messages.length > 0) {
        await SupabaseBatchManager.saveMessagesBatch(
          session.messages,
          session.id,
          user_id
        );
      }
    } catch (error) {
      console.error(`❌ [SYNC] Save attempt ${retryCount + 1} failed:`, error);
      
      // リトライ処理
      if (retryCount < this.MAX_RETRIES) {
        console.log(`🔄 [SYNC] Retrying in ${this.RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        return this.saveSessionToSupabaseWithRetry(session, user_id, retryCount + 1);
      }
      
      // 最大リトライ回数に達した場合
      console.error('❌ [SYNC] Max retries reached. Falling back to local storage.');
      throw error;
    }
  }
  
  /**
   * 改善されたセッション同期
   */
  static async syncChatSessionImproved(
    session: ChatSession,
    user_id?: string
  ): Promise<{ success: boolean; syncType: 'cloud' | 'local' }> {
    // ユーザーIDがない場合はローカルのみ
    if (!user_id) {
      this.saveChatSessionLocal(session);
      return { success: true, syncType: 'local' };
    }
    
    try {
      // Supabaseに保存を試みる
      await this.saveSessionToSupabaseWithRetry(session, user_id);
      
      // 成功したらローカルキャッシュも更新
      this.updateLocalCache(session);
      
      return { success: true, syncType: 'cloud' };
    } catch (error) {
      // Supabase保存に失敗した場合、ローカルに保存
      console.warn('⚠️ [SYNC] Cloud sync failed, saving locally');
      this.saveChatSessionLocal(session);
      
      // 後で同期するためのフラグを設定
      this.markForLaterSync(session.id);
      
      return { success: true, syncType: 'local' };
    }
  }
  
  /**
   * ローカルストレージに保存
   */
  private static saveChatSessionLocal(session: ChatSession) {
    try {
      const key = `chat_sessions_${session.id}`;
      localStorage.setItem(key, JSON.stringify(session));
      
      // セッションリストも更新
      const listKey = 'chat_sessions_list';
      const existingList = localStorage.getItem(listKey);
      const sessionsList = existingList ? JSON.parse(existingList) : [];
      
      const index = sessionsList.findIndex((s: any) => s.id === session.id);
      if (index >= 0) {
        sessionsList[index] = {
          id: session.id,
          title: session.title,
          updatedAt: session.updatedAt,
          isPinned: session.isPinned
        };
      } else {
        sessionsList.push({
          id: session.id,
          title: session.title,
          updatedAt: session.updatedAt,
          isPinned: session.isPinned
        });
      }
      
      localStorage.setItem(listKey, JSON.stringify(sessionsList));
      console.log('✅ [LOCAL] Session saved to localStorage');
    } catch (error) {
      console.error('❌ [LOCAL] Failed to save to localStorage:', error);
    }
  }
  
  /**
   * ローカルキャッシュを更新
   */
  private static updateLocalCache(session: ChatSession) {
    try {
      const cacheKey = 'chat_sessions_cache';
      const cache = localStorage.getItem(cacheKey);
      const sessions = cache ? JSON.parse(cache) : [];
      
      const index = sessions.findIndex((s: ChatSession) => s.id === session.id);
      if (index >= 0) {
        sessions[index] = session;
      } else {
        sessions.push(session);
      }
      
      localStorage.setItem(cacheKey, JSON.stringify(sessions));
    } catch (error) {
      console.error('❌ [CACHE] Failed to update cache:', error);
    }
  }
  
  /**
   * 後で同期するためのマーク
   */
  private static markForLaterSync(sessionId: string) {
    try {
      const pendingSyncKey = 'pending_sync_sessions';
      const pending = localStorage.getItem(pendingSyncKey);
      const pendingList = pending ? JSON.parse(pending) : [];
      
      if (!pendingList.includes(sessionId)) {
        pendingList.push(sessionId);
        localStorage.setItem(pendingSyncKey, JSON.stringify(pendingList));
      }
    } catch (error) {
      console.error('❌ [SYNC] Failed to mark for later sync:', error);
    }
  }
  
  /**
   * ペンディング中のセッションを同期
   */
  static async syncPendingSessions(user_id: string): Promise<void> {
    try {
      const pendingSyncKey = 'pending_sync_sessions';
      const pending = localStorage.getItem(pendingSyncKey);
      if (!pending) return;
      
      const pendingList: string[] = JSON.parse(pending);
      const successfulSyncs: string[] = [];
      
      for (const sessionId of pendingList) {
        try {
          const sessionKey = `chat_sessions_${sessionId}`;
          const sessionData = localStorage.getItem(sessionKey);
          if (!sessionData) continue;
          
          const session = JSON.parse(sessionData);
          await this.saveSessionToSupabaseWithRetry(session, user_id);
          successfulSyncs.push(sessionId);
          
          console.log(`✅ [SYNC] Pending session ${sessionId} synced successfully`);
        } catch (error) {
          console.error(`❌ [SYNC] Failed to sync pending session ${sessionId}:`, error);
        }
      }
      
      // 成功したセッションをペンディングリストから削除
      const remainingPending = pendingList.filter(id => !successfulSyncs.includes(id));
      if (remainingPending.length === 0) {
        localStorage.removeItem(pendingSyncKey);
      } else {
        localStorage.setItem(pendingSyncKey, JSON.stringify(remainingPending));
      }
    } catch (error) {
      console.error('❌ [SYNC] Failed to sync pending sessions:', error);
    }
  }
}