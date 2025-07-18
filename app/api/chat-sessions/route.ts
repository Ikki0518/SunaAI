import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseChatSessions, saveSupabaseChatSession, deleteSupabaseChatSession } from '@/app/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

// チャットセッション一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // ログインしていない場合は空配列を返す（エラーにしない）
    if (!session?.user?.id) {
      return NextResponse.json({ sessions: [] });
    }

    const user_id = session.user.id;
    
    const sessions = await getSupabaseChatSessions(user_id);
    
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
    const session = await getServerSession(authOptions);

    // ログインしていない場合はエラーを返す（保存はログイン必須）
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user_id = session.user.id;
    const { chatSession } = await request.json();
    
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

// 🎯 修正2: チャットセッション削除
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

    // Supabaseからセッションを削除（権限チェック付き）
    await deleteSupabaseChatSession(sessionId, user_id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('🔧 [CHAT-SESSIONS API] Failed to delete chat session:', error);
    console.error('🔧 [CHAT-SESSIONS API] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // ユーザーフレンドリーなエラーメッセージ
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let status = 500;
    
    if (errorMessage.includes('見つかりません')) {
      status = 404;
    } else if (errorMessage.includes('削除できません') || errorMessage.includes('権限')) {
      status = 403;
    }
    
    return NextResponse.json({ 
      error: 'Failed to delete session',
      details: errorMessage
    }, { status });
  }
}