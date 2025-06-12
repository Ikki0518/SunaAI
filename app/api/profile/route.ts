import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { userServiceServer } from '@/app/lib/userServiceServer';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: '表示名は必須です' }, { status: 400 });
    }

    // ユーザー情報を更新
    const updatedUser = await userServiceServer.updateUser(session.user.id, {
      name: name.trim()
    });

    if (!updatedUser) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('🐛 [DEBUG] Profile updated:', { userId: session.user.id, newName: name.trim() });
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
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'プロフィールの更新に失敗しました' }, { status: 500 });
  }
}