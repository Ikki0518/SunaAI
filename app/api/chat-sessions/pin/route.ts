import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { supabaseAdmin } from '@/app/lib/supabase';

// セッションのピン留め状態を切り替え
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { sessionId, isPinned } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }
    
    console.log('📌 [PIN API] Toggling pin status:', {
      sessionId,
      isPinned,
      userId: session.user.id
    });
    
    // Supabaseでピン留め状態を更新
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('chat_sessions')
        .update({ 
          is_pinned: isPinned,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .eq('user_id', session.user.id) // ユーザーの所有するセッションのみ更新可能
        .select()
        .single();
      
      if (error) {
        console.error('❌ [PIN API] Failed to update pin status:', error);
        throw error;
      }
      
      console.log('✅ [PIN API] Pin status updated successfully:', data);
      
      return NextResponse.json({ 
        success: true,
        session: data
      });
    } else {
      // Supabaseが設定されていない場合
      return NextResponse.json({ 
        success: true,
        message: 'Local update only (Supabase not configured)'
      });
    }
  } catch (error) {
    console.error('❌ [PIN API] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to update pin status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}