import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { getSecurityEvents as getSupabaseSecurityEvents } from '@/app/lib/supabase';
import { getSecurityEvents as getLocalSecurityEvents } from '@/app/lib/securityEventService';

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.email !== 'ikki_y0518@icloud.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Supabaseからセキュリティイベントを取得
    const supabaseEvents = await getSupabaseSecurityEvents(100);
    
    // ローカルファイルからもセキュリティイベントを取得
    const localEvents = await getLocalSecurityEvents();
    
    // イベントを結合して重複を除去
    const eventMap = new Map();
    
    // Supabaseのイベントを追加
    supabaseEvents.forEach(event => {
      eventMap.set(event.id, {
        ...event,
        source: 'supabase'
      });
    });
    
    // ローカルのイベントを追加（重複しない場合のみ）
    localEvents.forEach(event => {
      if (!eventMap.has(event.id)) {
        eventMap.set(event.id, {
          ...event,
          source: 'local'
        });
      }
    });
    
    // 配列に変換してソート
    const allEvents = Array.from(eventMap.values())
      .sort((a, b) => new Date(b.created_at || b.timestamp).getTime() - new Date(a.created_at || a.timestamp).getTime());

    return NextResponse.json({
      events: allEvents,
      total: allEvents.length,
      sources: {
        supabase: supabaseEvents.length,
        local: localEvents.length
      }
    });

  } catch (error) {
    console.error('セキュリティイベントの取得エラー:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}