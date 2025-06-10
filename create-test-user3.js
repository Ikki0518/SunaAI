const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function createTestUser() {
  const usersPath = path.join(__dirname, 'data', 'users.json');
  
  // 既存のユーザーデータを読み込む
  let users = [];
  if (fs.existsSync(usersPath)) {
    const data = fs.readFileSync(usersPath, 'utf8');
    users = JSON.parse(data);
  }
  
  // シンプルなパスワードでハッシュ化
  const password = 'password';
  const hashedPassword = await bcrypt.hash(password, 12);
  
  // 新しいテストユーザーを作成
  const newUser = {
    id: Date.now().toString(),
    email: 'testuser3@test.com',
    password: hashedPassword,
    name: 'testuser3',
    createdAt: Date.now()
  };
  
  // ユーザーを追加
  users.push(newUser);
  
  // ファイルに保存
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
  
  console.log('テストユーザーを作成しました:');
  console.log('Email: testuser3@test.com');
  console.log('Password: password');
}

createTestUser().catch(console.error);