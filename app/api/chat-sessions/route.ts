import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseChatSessions, saveSupabaseChatSession } from '@/app/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

// チャットセッション一覧取得
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [CHAT-SESSIONS API] GET request received');
    
    const session = await getServerSession(authOptions);
    console.log('🔧 [CHAT-SESSIONS API] Session check:', {
      hasSession: !!session,
      userEmail: session?.user?.email,
      userId: session?.user?.id
    });

    // ログインしていない場合は空配列を返す（エラーにしない）
    if (!session?.user?.id) {
      console.log('🔧 [CHAT-SESSIONS API] No authenticated user - returning empty sessions');
      return NextResponse.json({ sessions: [] });
    }

    const user_id = session.user.id;
    console.log('🔧 [CHAT-SESSIONS API] Loading sessions for user:', user_id.slice(0, 8) + '...');
    
    const sessions = await getSupabaseChatSessions(user_id);
    console.log('🔧 [CHAT-SESSIONS API] Successfully loaded sessions:', sessions.length);
    
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('🔧 [CHAT-SESSIONS API] Failed to load chat sessions:', error);
    console.error('🔧 [CHAT-SESSIONS API] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json({ 
      error: 'Failed to load sessions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// チャットセッション保存
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [CHAT-SESSIONS API] POST request received');
    
    const session = await getServerSession(authOptions);
    console.log('🔧 [CHAT-SESSIONS API] Session check:', {
      hasSession: !!session,
      userEmail: session?.user?.email
    });

    // ログインしていない場合はエラーを返す（保存はログイン必須）
    if (!session?.user?.id) {
      console.log('🔧 [CHAT-SESSIONS API] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user_id = session.user.id;
    const { chatSession } = await request.json();
    
    console.log('🔧 [CHAT-SESSIONS API] Saving session:', {
      sessionId: chatSession?.id,
      userId: user_id.slice(0, 8) + '...',
      title: chatSession?.title
    });
    
    if (!chatSession) {
      return NextResponse.json({ error: 'Chat session data required' }, { status: 400 });
    }

    await saveSupabaseChatSession({
      id: chatSession.id,
      user_id,
      title: chatSession.title
      // 他のフィールドはSupabaseテーブルにカラムが存在しないため除外
      // conversation_id: chatSession.conversationId,
      // is_pinned: chatSession.isPinned || false,
      // created_at: new Date(chatSession.createdAt).toISOString(),
      // updated_at: new Date(chatSession.updatedAt || Date.now()).toISOString()
    });
    
    console.log('🔧 [CHAT-SESSIONS API] Successfully saved session');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('🔧 [CHAT-SESSIONS API] Failed to save chat session:', error);
    console.error('🔧 [CHAT-SESSIONS API] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json({ 
      error: 'Failed to save session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 