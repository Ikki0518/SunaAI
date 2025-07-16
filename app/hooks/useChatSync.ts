import { useState, useCallback, useRef } from 'react';
import { ChatSession, ChatMessage } from '@/app/types/chat';
import { ChatHistoryManager } from '@/app/utils/chatHistory';

interface UseChatSyncOptions {
  userId?: string;
  onSyncStatusChange?: (status: 'connected' | 'disconnected' | 'syncing') => void;
}

export function useChatSync({ userId, onSyncStatusChange }: UseChatSyncOptions) {
  const [isSaving, setIsSaving] = useState(false);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const lastSaveTimeRef = useRef<number>(0);
  
  // デバウンス付き保存関数
  const saveSession = useCallback(async (
    session: ChatSession,
    messages: ChatMessage[],
    conversationId?: string | null
  ) => {
    // 保存キューに追加（前の保存が完了してから実行）
    saveQueueRef.current = saveQueueRef.current.then(async () => {
      const now = Date.now();
      const timeSinceLastSave = now - lastSaveTimeRef.current;
      
      // 最後の保存から1秒未満の場合はスキップ（デバウンス）
      if (timeSinceLastSave < 1000 && messages.length > 0) {
        console.log('⏸️ [SYNC] Debouncing save request');
        return;
      }
      
      setIsSaving(true);
      onSyncStatusChange?.('syncing');
      
      try {
        const updatedSession: ChatSession = {
          ...session,
          messages,
          conversationId: conversationId || undefined,
          updatedAt: Date.now(),
        };
        
        if (userId) {
          // 認証ユーザー: Supabaseに同期
          await ChatHistoryManager.syncChatSession(updatedSession, userId);
          onSyncStatusChange?.('connected');
        } else {
          // ゲストユーザー: ローカルのみ
          ChatHistoryManager.saveChatSession(updatedSession);
          onSyncStatusChange?.('disconnected');
        }
        
        lastSaveTimeRef.current = now;
        console.log('✅ [SYNC] Session saved successfully');
        
        // 保存完了を通知
        window.dispatchEvent(new CustomEvent('chatHistoryUpdated'));
      } catch (error) {
        console.error('❌ [SYNC] Save failed:', error);
        onSyncStatusChange?.('disconnected');
        
        // エラー時でもローカル保存を試みる
        try {
          ChatHistoryManager.saveChatSession({
            ...session,
            messages,
            conversationId: conversationId || undefined,
            updatedAt: Date.now(),
          });
          console.log('✅ [SYNC] Fallback to local storage successful');
        } catch (localError) {
          console.error('❌ [SYNC] Local save also failed:', localError);
        }
      } finally {
        setIsSaving(false);
      }
    }).catch(error => {
      console.error('❌ [SYNC] Queue error:', error);
      setIsSaving(false);
      onSyncStatusChange?.('disconnected');
    });
    
    return saveQueueRef.current;
  }, [userId, onSyncStatusChange]);
  
  return {
    isSaving,
    saveSession
  };
}