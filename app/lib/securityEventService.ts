import fs from 'fs/promises';
import path from 'path';
import { sendSecurityAlert } from './emailNotification';
import { recordSecurityEvent as recordToSupabase } from './supabase';

const SECURITY_EVENTS_FILE = path.join(process.cwd(), 'data', 'security-events.json');

export interface SecurityEvent {
  id: string;
  type: 'failed_login' | 'suspicious_activity' | 'unauthorized_access' | 'data_breach';
  email?: string;
  timestamp: string;
  details: string;
  ipAddress?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export async function recordSecurityEvent(
  type: SecurityEvent['type'],
  details: string,
  email?: string,
  ipAddress?: string,
  severity: SecurityEvent['severity'] = 'medium'
): Promise<void> {
  try {
    const event: SecurityEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      email,
      timestamp: new Date().toISOString(),
      details,
      ipAddress,
      severity
    };

    // Supabaseに記録
    await recordToSupabase(type, details, severity, email, undefined, ipAddress);

    // 既存のファイルシステムにも記録（バックアップとして）
    let events: SecurityEvent[] = [];
    try {
      const data = await fs.readFile(SECURITY_EVENTS_FILE, 'utf-8');
      events = JSON.parse(data);
    } catch (error) {
      // ファイルが存在しない場合は空の配列から始める
      console.log('Security events file not found, creating new one');
    }

    // 新しいイベントを追加
    events.push(event);

    // ファイルに保存
    await fs.mkdir(path.dirname(SECURITY_EVENTS_FILE), { recursive: true });
    await fs.writeFile(SECURITY_EVENTS_FILE, JSON.stringify(events, null, 2));

    console.log(`Security event recorded: ${type} - ${details}`);

    // 高severity以上のイベントはメール通知
    if (severity === 'high' || severity === 'critical') {
      await sendSecurityAlert(event);
    }
  } catch (error) {
    console.error('Error recording security event:', error);
  }
}

export async function getSecurityEvents(): Promise<SecurityEvent[]> {
  try {
    const data = await fs.readFile(SECURITY_EVENTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading security events:', error);
    return [];
  }
}

export async function trackFailedLogin(
  email: string,
  ipAddress?: string,
  attemptCount: number = 1
): Promise<void> {
  const severity = attemptCount >= 3 ? 'high' : 'medium';
  const details = attemptCount === 1 
    ? 'パスワードが間違っています (試行回数: 1)'
    : `パスワードが間違っています (試行回数: ${attemptCount})`;
  
  await recordSecurityEvent('failed_login', details, email, ipAddress, severity);
}

export async function trackSuspiciousActivity(
  details: string,
  email?: string,
  ipAddress?: string,
  severity: SecurityEvent['severity'] = 'medium'
): Promise<void> {
  await recordSecurityEvent('suspicious_activity', details, email, ipAddress, severity);
}

export async function trackUnauthorizedAccess(
  details: string,
  email?: string,
  ipAddress?: string
): Promise<void> {
  await recordSecurityEvent('unauthorized_access', details, email, ipAddress, 'high');
}