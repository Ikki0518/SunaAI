import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { updateSupabaseUserName, getSupabaseUserByEmail } from '@/app/lib/supabase';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // 開発モードでのバイパス機能
    const { searchParams } = new URL(request.url);
    const bypassAuth = searchParams.get('bypass') === 'true' && process.env.NODE_ENV === 'development';
    
    if (!bypassAuth && !session?.user) {
      console.log('🔒 [PROFILE API] No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, userEmail } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: '表示名は必須です' }, { status: 400 });
    }

    let userId = session?.user?.id;
    let userEmailToUse = session?.user?.email;

    // バイパスモード時または、セッションにIDがない場合はemailで検索
    if (bypassAuth && userEmail) {
      userEmailToUse = userEmail;
      console.log('🔓 [PROFILE API] Bypass mode activated with email:', userEmailToUse);
    }

    if (!userId && userEmailToUse) {
      // emailからユーザーを取得してIDを特定
      const user = await getSupabaseUserByEmail(userEmailToUse);
      if (user) {
        userId = user.id;
        console.log('📧 [PROFILE API] Found user ID via email:', userId);
      }
    }

    if (!userId) {
      console.log('❌ [PROFILE API] No user ID found');
      return NextResponse.json({ error: 'ユーザーIDが特定できません' }, { status: 400 });
    }

    // Supabaseでユーザー名を更新
    const updatedUser = await updateSupabaseUserName(userId, name.trim());

    if (!updatedUser) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [DEBUG] Profile updated:', { 
        userId, 
        newName: name.trim(), 
        email: userEmailToUse,
        bypassMode: bypassAuth 
      });
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email
      }
    });

  } catch (error) {
    console.error('❌ [PROFILE API] Profile update error:', error);
    return NextResponse.json({ 
      error: 'プロフィールの更新に失敗しました', 
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined 
    }, { status: 500 });
  }
}