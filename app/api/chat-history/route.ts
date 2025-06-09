import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import fs from 'fs';
import path from 'path';
import { ChatHistory, ChatSession } from '../../types/chat';

const CHAT_HISTORY_DIR = path.join(process.cwd(), 'data', 'chat-history');

// データディレクトリを確保
function ensureChatHistoryDir(): void {
  if (!fs.existsSync(CHAT_HISTORY_DIR)) {
    fs.mkdirSync(CHAT_HISTORY_DIR, { recursive: true });
  }
}

// ユーザーのチャット履歴ファイルパス
function getChatHistoryPath(userEmail: string): string {
  ensureChatHistoryDir();
  const fileName = `${Buffer.from(userEmail).toString('base64')}.json`;
  return path.join(CHAT_HISTORY_DIR, fileName);
}

// ユーザーのチャット履歴を取得
function getUserChatHistory(userEmail: string): ChatHistory {
  try {
    const filePath = getChatHistoryPath(userEmail);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('チャット履歴の読み込みエラー:', error);
  }
  
  return { sessions: [], currentSessionId: null };
}

// ユーザーのチャット履歴を保存
function saveUserChatHistory(userEmail: string, history: ChatHistory): void {
  try {
    const filePath = getChatHistoryPath(userEmail);
    fs.writeFileSync(filePath, JSON.stringify(history, null, 2), 'utf8');
  } catch (error) {
    console.error('チャット履歴の保存エラー:', error);
    throw error;
  }
}

// GET: チャット履歴を取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const history = getUserChatHistory(session.user.email);
    return NextResponse.json(history);
  } catch (error) {
    console.error('チャット履歴取得エラー:', error);
    return NextResponse.json(
      { error: 'チャット履歴の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// POST: チャット履歴を保存
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const history: ChatHistory = await request.json();
    
    // バリデーション
    if (!history || typeof history !== 'object') {
      return NextResponse.json(
        { error: '不正なデータ形式です' },
        { status: 400 }
      );
    }

    saveUserChatHistory(session.user.email, history);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('チャット履歴保存エラー:', error);
    return NextResponse.json(
      { error: 'チャット履歴の保存に失敗しました' },
      { status: 500 }
    );
  }
}

// PUT: 特定のセッションを更新
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const { sessionId, updatedSession }: { sessionId: string; updatedSession: ChatSession } = await request.json();
    
    const history = getUserChatHistory(session.user.email);
    
    // セッションを更新
    const updatedHistory = {
      ...history,
      sessions: history.sessions.map(s => 
        s.id === sessionId ? updatedSession : s
      ),
    };
    
    saveUserChatHistory(session.user.email, updatedHistory);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('セッション更新エラー:', error);
    return NextResponse.json(
      { error: 'セッションの更新に失敗しました' },
      { status: 500 }
    );
  }
}

// DELETE: セッションを削除
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'セッションIDが必要です' },
        { status: 400 }
      );
    }

    const history = getUserChatHistory(session.user.email);
    
    // セッションを削除
    const newSessions = history.sessions.filter(s => s.id !== sessionId);
    const newCurrentSessionId = history.currentSessionId === sessionId 
      ? (newSessions.length > 0 ? newSessions[0].id : null)
      : history.currentSessionId;

    const updatedHistory = {
      sessions: newSessions,
      currentSessionId: newCurrentSessionId,
    };
    
    saveUserChatHistory(session.user.email, updatedHistory);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('セッション削除エラー:', error);
    return NextResponse.json(
      { error: 'セッションの削除に失敗しました' },
      { status: 500 }
    );
  }
}