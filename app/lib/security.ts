import { NextRequest } from 'next/server';

// レート制限のためのメモリストア（本番環境ではRedisなどを使用）
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// 失敗試行の追跡
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();

// IPアドレスを取得
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

// レート制限チェック
export function checkRateLimit(
  identifier: string, 
  maxRequests: number = 10, 
  windowMs: number = 15 * 60 * 1000 // 15分
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `rate_limit:${identifier}`;
  
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    // 新しいウィンドウまたは期限切れ
    const resetTime = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: maxRequests - 1, resetTime };
  }
  
  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: current.resetTime };
  }
  
  current.count++;
  rateLimitStore.set(key, current);
  
  return { 
    allowed: true, 
    remaining: maxRequests - current.count, 
    resetTime: current.resetTime 
  };
}

// 失敗試行の記録
export function recordFailedAttempt(identifier: string): {
  count: number;
  isBlocked: boolean;
  blockUntil?: number;
} {
  const now = Date.now();
  const key = `failed:${identifier}`;
  
  const current = failedAttempts.get(key);
  const maxAttempts = 5;
  const blockDuration = 30 * 60 * 1000; // 30分
  const resetWindow = 60 * 60 * 1000; // 1時間
  
  if (!current || (now - current.lastAttempt) > resetWindow) {
    // 新しい試行または期限切れ
    failedAttempts.set(key, { count: 1, lastAttempt: now });
    return { count: 1, isBlocked: false };
  }
  
  const newCount = current.count + 1;
  failedAttempts.set(key, { count: newCount, lastAttempt: now });
  
  if (newCount >= maxAttempts) {
    const blockUntil = now + blockDuration;
    return { count: newCount, isBlocked: true, blockUntil };
  }
  
  return { count: newCount, isBlocked: false };
}

// 失敗試行のリセット（成功時）
export function resetFailedAttempts(identifier: string): void {
  failedAttempts.delete(`failed:${identifier}`);
}

// ブロック状態のチェック
export function isBlocked(identifier: string): { blocked: boolean; blockUntil?: number } {
  const now = Date.now();
  const key = `failed:${identifier}`;
  
  const current = failedAttempts.get(key);
  if (!current) {
    return { blocked: false };
  }
  
  const maxAttempts = 5;
  const blockDuration = 30 * 60 * 1000; // 30分
  
  if (current.count >= maxAttempts) {
    const blockUntil = current.lastAttempt + blockDuration;
    if (now < blockUntil) {
      return { blocked: true, blockUntil };
    } else {
      // ブロック期間終了
      failedAttempts.delete(key);
      return { blocked: false };
    }
  }
  
  return { blocked: false };
}

// 不審な活動の検出
export function detectSuspiciousActivity(
  request: NextRequest,
  userEmail?: string
): {
  suspicious: boolean;
  reasons: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
} {
  const reasons: string[] = [];
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
  
  const userAgent = request.headers.get('user-agent') || '';
  const ip = getClientIP(request);
  
  // ボットの検出
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /curl/i, /wget/i, /python/i, /java/i
  ];
  
  if (botPatterns.some(pattern => pattern.test(userAgent))) {
    reasons.push('ボットまたは自動化ツールの可能性');
    severity = 'medium';
  }
  
  // 空のUser-Agent
  if (!userAgent) {
    reasons.push('User-Agentが設定されていません');
    severity = 'medium';
  }
  
  // 異常に短いUser-Agent
  if (userAgent.length < 10) {
    reasons.push('異常に短いUser-Agent');
    severity = 'medium';
  }
  
  // 既知の悪意のあるIPパターン（例）
  const suspiciousIPPatterns = [
    /^10\.0\.0\./, // 内部ネットワークからの外部アクセス（設定による）
    /^192\.168\./, // プライベートIPからの不審なアクセス
  ];
  
  // 注意: 実際の環境では、より精密なIP検証が必要
  
  // 複数の失敗試行
  const failedCount = failedAttempts.get(`failed:${ip}`)?.count || 0;
  if (failedCount >= 3) {
    reasons.push(`複数回の失敗試行 (${failedCount}回)`);
    severity = failedCount >= 5 ? 'high' : 'medium';
  }
  
  // 短時間での大量リクエスト
  const rateLimit = checkRateLimit(ip, 20, 5 * 60 * 1000); // 5分間で20リクエスト
  if (!rateLimit.allowed) {
    reasons.push('短時間での大量リクエスト');
    severity = 'high';
  }
  
  return {
    suspicious: reasons.length > 0,
    reasons,
    severity
  };
}

// セキュリティヘッダーの設定
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
}

// パスワード強度チェック
export function checkPasswordStrength(password: string): {
  score: number;
  feedback: string[];
  isStrong: boolean;
} {
  const feedback: string[] = [];
  let score = 0;
  
  // 長さチェック
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('8文字以上にしてください');
  }
  
  if (password.length >= 12) {
    score += 1;
  }
  
  // 文字種チェック
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('小文字を含めてください');
  }
  
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('大文字を含めてください');
  }
  
  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('数字を含めてください');
  }
  
  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 1;
  }
  // 記号は必須ではないため、フィードバックを削除
  
  // 一般的なパスワードチェック
  const commonPasswords = [
    'password', '123456', 'password123', 'admin', 'qwerty',
    'letmein', 'welcome', 'monkey', '1234567890'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    score = Math.max(0, score - 2);
    feedback.push('一般的すぎるパスワードです');
  }
  
  return {
    score,
    feedback,
    isStrong: score >= 3 && feedback.length === 0
  };
}

// クリーンアップ関数（定期的に古いデータを削除）
export function cleanupSecurityData(): void {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  // レート制限データのクリーンアップ
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
  
  // 失敗試行データのクリーンアップ
  for (const [key, data] of failedAttempts.entries()) {
    if ((now - data.lastAttempt) > oneHour) {
      failedAttempts.delete(key);
    }
  }
}

// 定期クリーンアップの開始
if (typeof window === 'undefined') {
  // サーバーサイドでのみ実行
  setInterval(cleanupSecurityData, 10 * 60 * 1000); // 10分ごと
}