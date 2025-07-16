import { ChatSession } from '@/app/types/chat';

export class PinFixedChatHistoryManager {
  /**
   * ピン留めの切り替え（改善版）
   * - ローカルストレージを即座に更新（楽観的更新）
   * - Supabaseと同期（認証ユーザーの場合）
   */
  static async togglePinSession(sessionId: string, userId?: string): Promise<boolean> {
    try {
      if (typeof window === 'undefined') return false;
      
      // 1. ローカルストレージを即座に更新（楽観的更新）
      const sessions = this.getSortedSessions();
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      
      if (sessionIndex === -1) {
        console.error('❌ [PIN] Session not found:', sessionId);
        return false;
      }
      
      // 新しいピン留め状態
      const newPinnedState = !sessions[sessionIndex].isPinned;
      sessions[sessionIndex].isPinned = newPinnedState;
      
      // ローカルストレージに保存
      localStorage.setItem(this.getLocalStorageKey(), JSON.stringify(sessions));
      
      // UIを即座に更新するためのイベント発行
      window.dispatchEvent(new CustomEvent('chatHistoryUpdated', {
        detail: { 
          action: 'pin', 
          sessionId, 
          isPinned: newPinnedState, 
          timestamp: Date.now() 
        }
      }));
      
      console.log('📌 [PIN] Local update completed:', {
        sessionId,
        isPinned: newPinnedState
      });
      
      // 2. 認証ユーザーの場合はSupabaseと同期
      if (userId) {
        try {
          const response = await fetch('/api/chat-sessions/pin', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId,
              isPinned: newPinnedState
            }),
          });
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to sync pin status');
          }
          
          const result = await response.json();
          console.log('✅ [PIN] Supabase sync completed:', result);
          
          // キャッシュも更新
          this.updateCachedSession(sessionId, { isPinned: newPinnedState });
          
        } catch (syncError) {
          console.error('❌ [PIN] Supabase sync failed:', syncError);
          // Supabase同期に失敗しても、ローカルの変更は維持
          // 後で再同期を試みるためのフラグを設定
          this.markForLaterSync(sessionId, 'pin', newPinnedState);
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ [PIN] Failed to toggle pin session:', error);
      throw error;
    }
  }
  
  /**
   * ローカルストレージキーを取得（既存の実装を使用）
   */
  private static getLocalStorageKey(): string {
    return 'chat_sessions';
  }
  
  /**
   * ソート済みセッションを取得（既存の実装を使用）
   */
  private static getSortedSessions(): ChatSession[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(this.getLocalStorageKey());
      if (!stored) return [];
      
      const sessions: ChatSession[] = JSON.parse(stored);
      
      // ピン留めされたセッションを上に、その後は更新日時でソート
      return sessions.sort((a, b) => {
        // まずピン留め状態でソート
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        
        // 同じピン留め状態なら更新日時でソート（新しい順）
        return b.updatedAt - a.updatedAt;
      });
    } catch (error) {
      console.error('❌ [PIN] Failed to get sorted sessions:', error);
      return [];
    }
  }
  
  /**
   * キャッシュされたセッションを更新
   */
  private static updateCachedSession(sessionId: string, updates: Partial<ChatSession>): void {
    try {
      const cacheKey = 'chat_sessions_cache';
      const cache = localStorage.getItem(cacheKey);
      if (!cache) return;
      
      const sessions: ChatSession[] = JSON.parse(cache);
      const index = sessions.findIndex(s => s.id === sessionId);
      
      if (index !== -1) {
        sessions[index] = { ...sessions[index], ...updates };
        localStorage.setItem(cacheKey, JSON.stringify(sessions));
      }
    } catch (error) {
      console.error('❌ [PIN] Failed to update cache:', error);
    }
  }
  
  /**
   * 後で同期するためのマーク
   */
  private static markForLaterSync(sessionId: string, action: string, value: any): void {
    try {
      const pendingSyncKey = 'pending_sync_actions';
      const pending = localStorage.getItem(pendingSyncKey);
      const pendingActions = pending ? JSON.parse(pending) : [];
      
      pendingActions.push({
        sessionId,
        action,
        value,
        timestamp: Date.now()
      });
      
      localStorage.setItem(pendingSyncKey, JSON.stringify(pendingActions));
    } catch (error) {
      console.error('❌ [PIN] Failed to mark for later sync:', error);
    }
  }
  
  /**
   * ペンディング中の同期アクションを実行
   */
  static async syncPendingActions(userId: string): Promise<void> {
    try {
      const pendingSyncKey = 'pending_sync_actions';
      const pending = localStorage.getItem(pendingSyncKey);
      if (!pending) return;
      
      const pendingActions = JSON.parse(pending);
      const successfulActions: any[] = [];
      
      for (const action of pendingActions) {
        try {
          if (action.action === 'pin') {
            await fetch('/api/chat-sessions/pin', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                sessionId: action.sessionId,
                isPinned: action.value
              }),
            });
            successfulActions.push(action);
          }
        } catch (error) {
          console.error(`❌ [PIN] Failed to sync pending action:`, error);
        }
      }
      
      // 成功したアクションを削除
      const remainingActions = pendingActions.filter(
        (action: any) => !successfulActions.includes(action)
      );
      
      if (remainingActions.length === 0) {
        localStorage.removeItem(pendingSyncKey);
      } else {
        localStorage.setItem(pendingSyncKey, JSON.stringify(remainingActions));
      }
    } catch (error) {
      console.error('❌ [PIN] Failed to sync pending actions:', error);
    }
  }
}