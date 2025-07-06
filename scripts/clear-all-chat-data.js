// 全てのチャットデータを削除するスクリプト
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clearAllChatData() {
  try {
    console.log('🗑️ 全てのチャットデータを削除します...');
    
    // 全メッセージを削除
    console.log('🗑️ メッセージを削除中...');
    const { error: messagesError } = await supabase
      .from('chat_messages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 全て削除
    
    if (messagesError) {
      console.error('❌ メッセージ削除エラー:', messagesError);
    } else {
      console.log('✅ 全メッセージを削除しました');
    }
    
    // 全セッションを削除
    console.log('🗑️ セッションを削除中...');
    const { error: sessionsError } = await supabase
      .from('chat_sessions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 全て削除
    
    if (sessionsError) {
      console.error('❌ セッション削除エラー:', sessionsError);
    } else {
      console.log('✅ 全セッションを削除しました');
    }
    
    console.log('🎉 全てのチャットデータを削除完了！');
    console.log('💡 ローカルストレージも手動でクリアしてください');
    
  } catch (error) {
    console.error('❌ 削除エラー:', error);
  }
}

// 実行確認
console.log('⚠️ この操作は全てのチャットデータを永久に削除します。');
console.log('続行するには以下のコマンドを実行してください:');
console.log('node scripts/clear-all-chat-data.js --confirm');

if (process.argv.includes('--confirm')) {
  clearAllChatData();
} else {
  console.log('🛑 --confirmフラグが必要です。操作を中止しました。');
}