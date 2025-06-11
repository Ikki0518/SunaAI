import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import fs from 'fs';
import path from 'path';
import { ChatSession } from '@/app/types/chat';

const CHAT_HISTORY_DIR = path.join(process.cwd(), 'data', 'chat-history');

// ディレクトリが存在しない場合は作成
if (!fs.existsSync(CHAT_HISTORY_DIR)) {
  fs.mkdirSync(CHAT_HISTORY_DIR, { recursive: true });
}

function getUserHistoryPath(userId: string): string {
  // Base64エンコードしてファイル名として安全にする
  const encodedUserId = Buffer.from(userId).toString('base64');
  return path.join(CHAT_HISTORY_DIR, `${encodedUserId}.json`);
}

function loadUserHistory(userId: string): ChatSession[] {
  try {
    const filePath = getUserHistoryPath(userId);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    
    const data = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error loading user history:', error);
    return [];
  }
}

function saveUserHistory(userId: string, sessions: ChatSession[]): void {
  try {
    const filePath = getUserHistoryPath(userId);
    fs.writeFileSync(filePath, JSON.stringify(sessions, null, 2));
  } catch (error) {
    console.error('Error saving user history:', error);
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId || userId !== session.user.email) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const sessions = loadUserHistory(userId);
    
    // 最新順でソート
    const sortedSessions = sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    
    return NextResponse.json({ sessions: sortedSessions });
  } catch (error) {
    console.error('Error in GET /api/chat-history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, userId, session: chatSession } = body;

    if (!userId || userId !== session.user.email) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    if (action === 'save' && chatSession) {
      const sessions = loadUserHistory(userId);
      
      // 既存セッションの更新または新規追加
      const existingIndex = sessions.findIndex(s => s.id === chatSession.id);
      if (existingIndex >= 0) {
        sessions[existingIndex] = {
          ...chatSession,
          updatedAt: Date.now(),
        };
      } else {
        sessions.push({
          ...chatSession,
          updatedAt: Date.now(),
        });
      }

      // 最大100セッションまで保持（古いものから削除）
      const sortedSessions = sessions.sort((a, b) => b.updatedAt - a.updatedAt);
      const limitedSessions = sortedSessions.slice(0, 100);

      saveUserHistory(userId, limitedSessions);
      
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in POST /api/chat-history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, sessionId } = body;

    if (!userId || userId !== session.user.email) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const sessions = loadUserHistory(userId);
    const filteredSessions = sessions.filter(s => s.id !== sessionId);
    
    saveUserHistory(userId, filteredSessions);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/chat-history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}