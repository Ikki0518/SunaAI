import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { logSecurityEvent } from '@/app/api/admin/security-events/route'
import { supabaseAdmin, insertSupabaseUser } from '@/app/lib/supabase'
import {
  recordFailedAttempt,
  isBlocked,
  checkPasswordStrength
} from '@/app/lib/security'
import { notifyNewUserRegistration } from '@/app/lib/emailNotification'
import { googleSheetsService } from '@/app/lib/googleSheets'
import { loginHistoryService } from '@/app/lib/loginHistoryService'
import { createUser, getUserByEmail, recordLoginHistory } from '@/app/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { phone, email, password } = await request.json()

    // 入力検証
    if (!phone || !email || !password) {
      return NextResponse.json(
        { error: '電話番号、メールアドレス、パスワードを入力してください' },
        { status: 400 }
      )
    }

    // パスワード強度チェック
    const passwordCheck = checkPasswordStrength(password)
    if (!passwordCheck.isStrong) {
      return NextResponse.json(
        { error: `パスワードが弱すぎます: ${passwordCheck.feedback.join(', ')}` },
        { status: 400 }
      )
    }

    // IPアドレスベースのブロックチェック
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                    request.headers.get('x-real-ip') ||
                    'unknown'
    
    const blockStatus = isBlocked(phone)
    if (blockStatus.blocked) {
      await logSecurityEvent(
        'account_locked',
        phone,
        `アカウントが一時的にブロックされています (${new Date(blockStatus.blockUntil!).toLocaleString('ja-JP')})`,
        {
          ipAddress: clientIP,
          severity: 'high'
        }
      )
      return NextResponse.json(
        { error: 'アカウントが一時的にブロックされています。しばらく時間をおいてから再試行してください。' },
        { status: 429 }
      )
    }

    // 重複チェック
    // Supabaseで電話番号重複チェック
    const { data: phoneDup, error: phoneDupError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone', phone);
    if (phoneDupError) throw phoneDupError;
    if (phoneDup && phoneDup.length > 0) {
      return NextResponse.json(
        { error: 'この電話番号は既に登録されています' },
        { status: 409 }
      )
    }
    
    // Supabaseでメールアドレス重複チェック
    const { data: emailDup, error: emailDupError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email);
    if (emailDupError) throw emailDupError;
    if (emailDup && emailDup.length > 0) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 409 }
      )
    }

    // パスワードハッシュ化
    const hashedPassword = await bcrypt.hash(password, 12)
    
    // ユーザー作成（Supabaseにinsert）
    await insertSupabaseUser({
      phone,
      email,
      name: email.split("@")[0],
      passwordHash: hashedPassword
    });

    return NextResponse.json(
      {
        success: true,
        message: '新規登録が完了しました！電話番号とパスワードでログインしてください。'
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('新規登録エラー:', error)
    return NextResponse.json(
      { error: '新規登録中にエラーが発生しました' },
      { status: 500 }
    )
  }
}