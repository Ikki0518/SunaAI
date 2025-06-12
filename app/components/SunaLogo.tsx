'use client'

import { useTheme } from '@/app/contexts/ThemeContext'

interface SunaLogoProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function SunaLogo({ size = 'md', className = '' }: SunaLogoProps) {
  let resolvedTheme = 'light'
  
  try {
    const themeContext = useTheme()
    resolvedTheme = themeContext?.resolvedTheme || 'light'
  } catch (error) {
    console.warn('ThemeContext not available, using light theme as fallback')
    resolvedTheme = 'light'
  }
  
  // フォールバック処理
  if (!size || !['sm', 'md', 'lg'].includes(size)) {
    size = 'md';
  }
  
  const sizes = {
    sm: { width: 101, height: 55, fontSize: 26 },
    md: { width: 135, height: 70, fontSize: 32 },
    lg: { width: 202, height: 105, fontSize: 48 }
  }
  
  const currentSize = sizes[size]
  
  // サイズに応じて円の位置とサイズを調整
  const getCircleProps = () => {
    switch (size) {
      case 'sm':
        return {
          large: { cx: 79, cy: 20, r: 13 },
          medium: { cx: 64, cy: 28, r: 8 },
          small: { cx: 72, cy: 35, r: 5 }
        }
      case 'md':
        return {
          large: { cx: 105, cy: 25, r: 16 },
          medium: { cx: 86, cy: 35, r: 10 },
          small: { cx: 96, cy: 45, r: 6 }
        }
      case 'lg':
        return {
          large: { cx: 158, cy: 38, r: 24 },
          medium: { cx: 129, cy: 53, r: 15 },
          small: { cx: 144, cy: 68, r: 9 }
        }
    }
  }
  
  const circles = getCircleProps()
  
  return (
    <svg
      width={currentSize.width}
      height={currentSize.height}
      viewBox={`0 0 ${currentSize.width} ${currentSize.height}`}
      className={`flex-shrink-0 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Suna Logo"
    >
      {/* 大きな円（右上、明るいターコイズブルー） */}
      <circle 
        cx={circles.large.cx} 
        cy={circles.large.cy} 
        r={circles.large.r} 
        fill="#67E8F9" 
        opacity="0.85"
      />
      
      {/* 中くらいの円（左中央、濃いブルー） */}
      <circle 
        cx={circles.medium.cx} 
        cy={circles.medium.cy} 
        r={circles.medium.r} 
        fill="#2563EB" 
        opacity="0.9"
      />
      
      {/* 小さな円（右下、薄いターコイズ） */}
      <circle 
        cx={circles.small.cx} 
        cy={circles.small.cy} 
        r={circles.small.r} 
        fill="#A7F3D0" 
        opacity="0.75"
      />
      
      {/* テキスト "suna" - 太字、テーマに応じた色 */}
      <text
        x="0"
        y={size === 'sm' ? 42 : size === 'md' ? 50 : 75}
        fontSize={currentSize.fontSize}
        fontWeight="700"
        fill={resolvedTheme === 'dark' ? '#F8FAFC' : '#1E293B'}
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        letterSpacing="-1.2px"
      >
        suna
      </text>
    </svg>
  )
} 