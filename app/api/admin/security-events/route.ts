import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';
import fs from 'fs/promises';
import path from 'path';

// 管理者権限チェック
async function isAdmin(session: any): Promise<boolean> {
  if (!session?.user?.email) return false;
  
  const adminEmails = ['ikki_y0518@icloud.com', 'ikkiyamamoto0518@gmail.com'];
  return adminEmails.includes(session.user.email);
}

interface SecurityEvent {
  id: string;
  type: 'failed_login' | 'suspicious_activity' | 'multiple_attempts' | 'account_locked';
  email: string;
  timestamp: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// セキュリティイベントファイルのパス
const SECURITY_EVENTS_FILE = path.join(process.cwd(), 'data', 'security-events.json');

// セキュリティイベントを読み込む
async function loadSecurityEvents(): Promise<SecurityEvent[]> {
  try {
    const data = await fs.readFile(SECURITY_EVENTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // ファイルが存在しない場合は空配列を返す
    return [];
  }
}

// セキュリティイベントを保存する
async function saveSecurityEvents(events: SecurityEvent[]): Promise<void> {
  try {
    // dataディレクトリが存在しない場合は作成
    const dataDir = path.dirname(SECURITY_EVENTS_FILE);
    await fs.mkdir(dataDir, { recursive: true });
    
    await fs.writeFile(SECURITY_EVENTS_FILE, JSON.stringify(events, null, 2));
  } catch (error) {
    console.error('セキュリティイベントの保存に失敗:', error);
  }
}

export async function GET(request: NextRequest) {
  try {
    // URLパラメータでバイパスモードをチェック
    const url = new URL(request.url);
    const bypassMode = url.searchParams.get('bypass') === 'true';
    
    console.log('🔧 [ADMIN SECURITY API] Request received');
    console.log('🔧 [ADMIN SECURITY API] Bypass mode:', bypassMode);
    
    const session = await getServerSession(authOptions);
    console.log('🔧 [ADMIN SECURITY API] Session:', session ? 'exists' : 'null');
    console.log('🔧 [ADMIN SECURITY API] User email:', session?.user?.email);
    
    // バイパスモードでない場合のみ認証チェック
    if (!bypassMode) {
      if (!session || !(await isAdmin(session))) {
        console.log('🔧 [ADMIN SECURITY API] Unauthorized access attempt');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      console.log('🔧 [ADMIN SECURITY API] Bypassing authentication');
    }

    console.log('🔧 [ADMIN SECURITY API] Authorization passed, fetching data...');

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const severity = searchParams.get('severity') as 'low' | 'medium' | 'high' | 'critical' | null;

    const events = await loadSecurityEvents();
    
    // 重要度でフィルタリング
    let filteredEvents = events;
    if (severity) {
      filteredEvents = events.filter(event => event.severity === severity);
    }

    // 新しい順にソート
    const sortedEvents = filteredEvents.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // 制限数を適用
    const limitedEvents = sortedEvents.slice(0, limit);

    return NextResponse.json(limitedEvents);

  } catch (error) {
    console.error('セキュリティイベントの取得エラー:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !(await isAdmin(session))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, email, details, ipAddress, userAgent, severity = 'medium' } = body;

    if (!type || !email || !details) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newEvent: SecurityEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      email,
      timestamp: new Date().toISOString(),
      details,
      ipAddress,
      userAgent,
      severity
    };

    const events = await loadSecurityEvents();
    events.push(newEvent);

    // 最新の1000件のみ保持
    if (events.length > 1000) {
      events.splice(0, events.length - 1000);
    }

    await saveSecurityEvents(events);

    return NextResponse.json({ success: true, event: newEvent });

  } catch (error) {
    console.error('セキュリティイベントの作成エラー:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// セキュリティイベントを記録するヘルパー関数
export async function logSecurityEvent(
  type: SecurityEvent['type'],
  email: string,
  details: string,
  options: {
    ipAddress?: string;
    userAgent?: string;
    severity?: SecurityEvent['severity'];
  } = {}
) {
  try {
    const event: SecurityEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      email,
      timestamp: new Date().toISOString(),
      details,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      severity: options.severity || 'medium'
    };

    const events = await loadSecurityEvents();
    events.push(event);

    // 最新の1000件のみ保持
    if (events.length > 1000) {
      events.splice(0, events.length - 1000);
    }

    await saveSecurityEvents(events);
    
    // 重要度が高い場合はコンソールにも出力
    if (event.severity === 'high' || event.severity === 'critical') {
      console.warn(`🚨 [SECURITY] ${event.severity.toUpperCase()}: ${event.details} (${event.email})`);
    }

  } catch (error) {
    console.error('セキュリティイベントのログ記録に失敗:', error);
  }
}