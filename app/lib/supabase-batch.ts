import { supabaseAdmin } from './supabase';
import { ChatMessage } from '@/app/types/chat';

interface BatchOperation {
  table: string;
  operation: 'insert' | 'update' | 'upsert';
  data: any[];
}

export class SupabaseBatchManager {
  private static batchQueue: BatchOperation[] = [];
  private static batchTimer: NodeJS.Timeout | null = null;
  private static readonly BATCH_SIZE = 100;
  private static readonly BATCH_DELAY = 500; // 500ms
  
  /**
   * バッチ処理でメッセージを保存
   */
  static async saveMessagesBatch(messages: ChatMessage[], sessionId: string, userId: string) {
    if (!messages || messages.length === 0) return;
    
    // メッセージをバッチ用に準備
    const batchData = messages.map(msg => ({
      id: this.generateUUID(),
      session_id: sessionId,
      user_id: userId,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      is_favorite: msg.isFavorite || false,
      created_at: new Date().toISOString()
    }));
    
    // 既存のメッセージを削除してから新規挿入（重複防止）
    try {
      if (supabaseAdmin) {
        // 既存メッセージを削除
        const { error: deleteError } = await supabaseAdmin
          .from('chat_messages')
          .delete()
          .eq('session_id', sessionId);
          
        if (deleteError) {
          console.error('❌ [BATCH] Failed to delete existing messages:', deleteError);
        }
        
        // バッチ挿入
        const chunks = this.chunkArray(batchData, this.BATCH_SIZE);
        
        for (const chunk of chunks) {
          const { error: insertError } = await supabaseAdmin
            .from('chat_messages')
            .insert(chunk);
            
          if (insertError) {
            console.error('❌ [BATCH] Failed to insert message batch:', insertError);
            throw insertError;
          }
        }
        
        console.log('✅ [BATCH] Successfully saved', messages.length, 'messages');
      }
    } catch (error) {
      console.error('❌ [BATCH] Batch save failed:', error);
      throw error;
    }
  }
  
  /**
   * 配列を指定サイズのチャンクに分割
   */
  private static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  /**
   * UUID生成
   */
  private static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}