import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseChatMessages, saveSupabaseChatMessage } from '@/app/lib/supabase';
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

    await saveSupabaseChatMessage({
      id: generateUUID(), // UUID形式のIDを生成
      session_id,
      user_id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      created_at: new Date().toISOString()
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('🔧 [CHAT-MESSAGES API] Failed to save chat message:', error);
    console.error('🔧 [CHAT-MESSAGES API] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json({ 
      error: 'Failed to save message',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 