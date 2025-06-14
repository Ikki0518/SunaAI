import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { userServiceServer } from '@/app/lib/userServiceServer'
import { logSecurityEvent } from '@/app/api/admin/security-events/route'
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
    const existingUserByPhone = await userServiceServer.getUserByPhone(phone)
    if (existingUserByPhone) {
      return NextResponse.json(
        { error: 'この電話番号は既に登録されています' },
        { status: 409 }
      )
    }
    
    const existingUserByEmail = await userServiceServer.getUserByEmail(email)
    if (existingUserByEmail) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 409 }
      )
    }

    // パスワードハッシュ化
    const hashedPassword = await bcrypt.hash(password, 12)
    
    // ユーザー作成
    const user = await userServiceServer.createUser({
      phone,
      email,
      password: hashedPassword,
      name: email.split("@")[0], // メールの@より前を名前とする
    })

    // 新規登録通知を送信（非同期で実行、エラーでも処理を継続）
    notifyNewUserRegistration(user.email, user.name, user.id).catch(error => {
      console.error('🔔 [NOTIFICATION] 新規登録通知の送信に失敗:', error)
    })

    // ローカルログイン履歴に新規登録を記録
    loginHistoryService.recordLogin(user.id, user.email, user.name, 'signup');

    // Google Sheetsに新規登録データを記録（非同期で実行、エラーでも処理を継続）
    googleSheetsService.addUserRegistration({
      email: user.email,
      name: user.name,
      registrationDate: new Date().toISOString(),
      loginMethod: 'credentials'
    }).catch(error => {
      console.error('📊 [SHEETS] Google Sheetsへの記録に失敗:', error)
    })

    return NextResponse.json(
      { 
        success: true,
        message: '新規登録が完了しました！電話番号とパスワードでログインしてください。',
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name
        }
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