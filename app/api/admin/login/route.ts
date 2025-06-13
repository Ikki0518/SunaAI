import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    // ハードコードされた管理者認証
    const isAdmin = (email === 'ikki_y0518@icloud.com' && password === 'admin123') ||
                   (email === 'ikkiyamamoto0518@gmail.com' && password === 'admin123')
    
    if (isAdmin) {
      console.log('🐛 [DEBUG] Admin login successful via API:', email)
      
      return NextResponse.json({
        success: true,
        user: {
          id: 'admin-' + Date.now(),
          name: 'いっき',
          email: email,
          isAdmin: true
        }
      })
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid credentials' },
      { status: 401 }
    )
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Admin login endpoint' })
}