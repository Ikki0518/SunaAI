'use client';

import { useState } from 'react';
import { supabase, isSupabaseEnabled } from '@/app/lib/supabase';

export default function TestSupabase() {
  const [status, setStatus] = useState<string>('未テスト');
  const [error, setError] = useState<string>('');
  const [tables, setTables] = useState<any[]>([]);
  
  // Supabaseが設定されていない場合の表示
  if (!isSupabaseEnabled()) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Supabase接続テスト</h1>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-700 mb-4">⚠️ Supabaseが設定されていません</h2>
            <p className="mb-4">Supabaseを使用するには、以下の手順で設定を完了してください：</p>
            
            <ol className="list-decimal list-inside space-y-3 mb-6">
              <li>
                <strong>Supabaseダッシュボード</strong>から認証情報を取得
                <ul className="list-disc list-inside ml-6 mt-2 text-sm text-gray-600">
                  <li>Settings → API に移動</li>
                  <li>Project URL をコピー</li>
                  <li>anon public キーをコピー</li>
                  <li>service_role キーをコピー</li>
                </ul>
              </li>
              <li>
                <strong>.env.local</strong>ファイルを更新
                <pre className="bg-gray-100 p-3 rounded mt-2 text-sm overflow-x-auto">
{`NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key`}
                </pre>
              </li>
              <li>
                <strong>アプリケーションを再起動</strong>
                <pre className="bg-gray-100 p-3 rounded mt-2 text-sm">
                  npm run dev
                </pre>
              </li>
            </ol>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <p className="text-sm">
                <strong>注意:</strong> 現在、プレースホルダーの値が設定されています。
                実際のSupabaseプロジェクトの認証情報に置き換えてください。
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const testConnection = async () => {
    setStatus('テスト中...');
    setError('');
    
    try {
      // 接続テスト
      const { data, error } = await supabase
        .from('user_activities')
        .select('count')
        .limit(1);
      
      if (error) {
        throw error;
      }
      
      setStatus('✅ 接続成功！');
      
      // テーブル情報を取得
      const tablesInfo = [];
      
      // user_activities
      const { count: activitiesCount } = await supabase
        .from('user_activities')
        .select('*', { count: 'exact', head: true });
      tablesInfo.push({ name: 'user_activities', count: activitiesCount || 0 });
      
      // security_events
      const { count: eventsCount } = await supabase
        .from('security_events')
        .select('*', { count: 'exact', head: true });
      tablesInfo.push({ name: 'security_events', count: eventsCount || 0 });
      
      // login_history
      const { count: loginCount } = await supabase
        .from('login_history')
        .select('*', { count: 'exact', head: true });
      tablesInfo.push({ name: 'login_history', count: loginCount || 0 });
      
      setTables(tablesInfo);
      
    } catch (err: any) {
      setStatus('❌ 接続失敗');
      setError(err.message || 'Unknown error');
    }
  };

  const insertTestData = async () => {
    try {
      // テストデータを挿入
      const { data, error } = await supabase
        .from('user_activities')
        .insert({
          user_id: 'test-user-123',
          user_email: 'test@example.com',
          action: 'test_action',
          details: 'Supabase接続テスト'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      alert('テストデータを挿入しました！');
      testConnection(); // 再度接続テストを実行
    } catch (err: any) {
      alert('エラー: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Supabase接続テスト</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">接続状態</h2>
          <p className="text-lg mb-4">ステータス: {status}</p>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
              <p className="text-red-600">エラー: {error}</p>
            </div>
          )}
          
          <button
            onClick={testConnection}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-2"
          >
            接続テスト
          </button>
          
          <button
            onClick={insertTestData}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            テストデータ挿入
          </button>
        </div>
        
        {tables.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">テーブル情報</h2>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">テーブル名</th>
                  <th className="text-left py-2">レコード数</th>
                </tr>
              </thead>
              <tbody>
                {tables.map((table) => (
                  <tr key={table.name} className="border-b">
                    <td className="py-2">{table.name}</td>
                    <td className="py-2">{table.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded p-4">
          <h3 className="font-semibold mb-2">セットアップ手順</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Supabaseダッシュボードから認証情報を取得</li>
            <li>.env.localファイルに認証情報を設定</li>
            <li>SQL Editorでsupabase-tables.sqlを実行</li>
            <li>このページで接続テストを実行</li>
          </ol>
        </div>
      </div>
    </div>
  );
}