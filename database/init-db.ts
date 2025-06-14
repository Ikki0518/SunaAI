import { initializeDatabase } from '../app/lib/db';

async function main() {
  console.log('🚀 データベースの初期化を開始します...');
  
  try {
    await initializeDatabase();
    console.log('✅ データベースの初期化が完了しました！');
  } catch (error) {
    console.error('❌ データベースの初期化に失敗しました:', error);
    process.exit(1);
  }
}

main();