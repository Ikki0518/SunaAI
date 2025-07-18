import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseChatMessages, saveSupabaseChatMessage, deleteSupabaseChatMessages } from '@/app/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

// チャットメッセージ一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const session_id = searchParams.get('session_id');
    
    if (!session_id) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);

    // ログインしていない場合は空配列を返す（エラーにしない）
    if (!session?.user?.id) {
      return NextResponse.json({ messages: [] });
    }

    const messages = await getSupabaseChatMessages(session_id);
    
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('🔧 [CHAT-MESSAGES API] Failed to load chat messages:', error);
    console.error('🔧 [CHAT-MESSAGES API] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json({ 
      error: 'Failed to load messages',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// チャットメッセージ保存
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // ログインしていない場合はエラーを返す（保存はログイン必須）
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user_id = session.user.id;
    const { message, session_id } = await request.json();
    
    if (!message || !session_id) {
      return NextResponse.json({ error: 'Message and session ID required' }, { status: 400 });
    }

    // UUID生成用のヘルパー関数
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    // Supabaseのスキーマに合わせたデータ構造
    const messageData = {
      id: generateUUID(),
      session_id,
      user_id,
      role: message.role as 'user' | 'bot',
      content: message.content,
      timestamp: message.timestamp || Date.now(),
      // created_atは削除（Supabaseが自動生成）
      // is_favoriteは削除（テーブルに存在しない場合）
    };

    // デバッグ用ログ
    console.log('🔧 [CHAT-MESSAGES API] Saving message:', messageData);

    await saveSupabaseChatMessage(messageData);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('🔧 [CHAT-MESSAGES API] Failed to save chat message:', error);
    console.error('🔧 [CHAT-MESSAGES API] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      // Supabaseのエラー詳細を追加
      supabaseError: error instanceof Error && 'code' in error ? (error as any).code : undefined,
      supabaseHint: error instanceof Error && 'hint' in error ? (error as any).hint : undefined,
      supabaseDetails: error instanceof Error && 'details' in error ? (error as any).details : undefined
    });
    
    return NextResponse.json({
      error: 'Failed to save message',
      details: error instanceof Error ? error.message : 'Unknown error',
      // 開発環境でのみ詳細なエラー情報を返す
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          message: error instanceof Error ? error.message : String(error),
          code: error instanceof Error && 'code' in error ? (error as any).code : undefined,
          hint: error instanceof Error && 'hint' in error ? (error as any).hint : undefined
        }
      })
    }, { status: 500 });
  }
}

// 🎯 修正2: チャットメッセージ削除
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // ログインしていない場合はエラーを返す（削除はログイン必須）
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user_id = session.user.id;
    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Supabaseからメッセージを削除（権限チェック付き）
    await deleteSupabaseChatMessages(sessionId, user_id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('🔧 [CHAT-MESSAGES API] Failed to delete chat messages:', error);
    console.error('🔧 [CHAT-MESSAGES API] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json({ 
      error: 'Failed to delete messages',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}