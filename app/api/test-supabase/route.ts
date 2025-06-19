import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase';

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ 
        error: 'Supabaseが設定されていません' 
      }, { status: 500 });
    }

    // 接続テスト
    const { data, error } = await supabaseAdmin
      .from('user_activities')
      .select('count')
      .limit(1);
    
    if (error) {
      throw error;
    }

    // テーブル情報を取得
    const tablesInfo = [];
    
    // user_activities
    const { count: activitiesCount } = await supabaseAdmin
      .from('user_activities')
      .select('*', { count: 'exact', head: true });
    tablesInfo.push({ name: 'user_activities', count: activitiesCount || 0 });
    
    // security_events
    const { count: eventsCount } = await supabaseAdmin
      .from('security_events')
      .select('*', { count: 'exact', head: true });
    tablesInfo.push({ name: 'security_events', count: eventsCount || 0 });
    
    // login_history
    const { count: loginCount } = await supabaseAdmin
      .from('login_history')
      .select('*', { count: 'exact', head: true });
    tablesInfo.push({ name: 'login_history', count: loginCount || 0 });
    
    // chat_sessions
    const { count: sessionsCount } = await supabaseAdmin
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true });
    tablesInfo.push({ name: 'chat_sessions', count: sessionsCount || 0 });
    
    // chat_messages
    const { count: messagesCount } = await supabaseAdmin
      .from('chat_messages')
      .select('*', { count: 'exact', head: true });
    tablesInfo.push({ name: 'chat_messages', count: messagesCount || 0 });

    return NextResponse.json({
      success: true,
      message: 'Supabase接続成功',
      tables: tablesInfo
    });

  } catch (error: any) {
    console.error('Supabase接続テストエラー:', error);
    return NextResponse.json({ 
      error: error.message || 'Supabase接続テストに失敗しました' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json();
    
    if (!supabaseAdmin) {
      return NextResponse.json({ 
        error: 'Supabaseが設定されていません' 
      }, { status: 500 });
    }

    if (action === 'insert' && data) {
      // テストデータを挿入
      const { data: insertedData, error } = await supabaseAdmin
        .from('user_activities')
        .insert({
          user_id: data.user_id,
          user_email: data.user_email,
          action: data.action,
          details: data.details
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        message: 'テストデータを挿入しました',
        data: insertedData
      });
    }

    return NextResponse.json({ 
      error: '無効なアクション' 
    }, { status: 400 });

  } catch (error: any) {
    console.error('Supabaseテストデータ挿入エラー:', error);
    return NextResponse.json({ 
      error: error.message || 'テストデータ挿入に失敗しました' 
    }, { status: 500 });
  }
} 