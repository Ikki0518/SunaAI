// Supabase上の重複セッションをクリーンアップするスクリプト
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupDuplicateSessions() {
  try {
    console.log('🧹 重複セッションのクリーンアップを開始します...');
    
    // 全セッションを取得
    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    console.log('📊 総セッション数:', sessions.length);
    
    // タイトル別にグループ化
    const sessionGroups = new Map();
    
    sessions.forEach(session => {
      const title = session.title || 'Untitled';
      if (!sessionGroups.has(title)) {
        sessionGroups.set(title, []);
      }
      sessionGroups.get(title).push(session);
    });
    
    let totalDeleted = 0;
    
    // 各グループで重複を処理
    for (const [title, group] of sessionGroups) {
      if (group.length > 1) {
        console.log(`🔍 "${title}" の重複: ${group.length}個`);
        
        // 最新のセッションを保持（created_atが最新）
        const sortedGroup = group.sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        );
        
        const keepSession = sortedGroup[0];
        const duplicateSessions = sortedGroup.slice(1);
        
        console.log(`✅ 保持: ${keepSession.id} (${keepSession.created_at})`);
        
        // 重複セッションを削除
        for (const duplicate of duplicateSessions) {
          console.log(`🗑️ 削除: ${duplicate.id} (${duplicate.created_at})`);
          
          // メッセージも削除
          const { error: messagesError } = await supabase
            .from('chat_messages')
            .delete()
            .eq('session_id', duplicate.id);
          
          if (messagesError) {
            console.error(`❌ メッセージ削除エラー (${duplicate.id}):`, messagesError);
          }
          
          // セッションを削除
          const { error: sessionError } = await supabase
            .from('chat_sessions')
            .delete()
            .eq('id', duplicate.id);
          
          if (sessionError) {
            console.error(`❌ セッション削除エラー (${duplicate.id}):`, sessionError);
          } else {
            totalDeleted++;
          }
        }
      }
    }
    
    console.log('🎉 クリーンアップ完了!');
    console.log(`📈 削除されたセッション数: ${totalDeleted}`);
    
    // 最終状態を確認
    const { data: finalSessions } = await supabase
      .from('chat_sessions')
      .select('title')
      .order('created_at', { ascending: false });
    
    console.log('📋 残りのセッション数:', finalSessions?.length || 0);
    
    const titleCounts = {};
    finalSessions?.forEach(session => {
      const title = session.title || 'Untitled';
      titleCounts[title] = (titleCounts[title] || 0) + 1;
    });
    
    console.log('📊 タイトル別セッション数:');
    Object.entries(titleCounts).forEach(([title, count]) => {
      console.log(`  "${title}": ${count}個`);
    });
    
  } catch (error) {
    console.error('❌ クリーンアップエラー:', error);
  }
}

// 実行確認
console.log('⚠️ この操作はSupabase上の重複データを永久に削除します。');
console.log('続行するには以下のコマンドを実行してください:');
console.log('node scripts/cleanup-duplicate-sessions.js --confirm');

if (process.argv.includes('--confirm')) {
  cleanupDuplicateSessions();
} else {
  console.log('🛑 --confirmフラグが必要です。操作を中止しました。');
}