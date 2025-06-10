const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const createTestUser = async () => {
  const email = 'testuser@test.com';
  const password = 'testpass';
  
  // パスワードをハッシュ化
  const hashedPassword = await bcrypt.hash(password, 12);
  
  // 現在のユーザーデータを読み込み
  const usersFilePath = path.join(__dirname, 'data', 'users.json');
  let users = [];
  
  if (fs.existsSync(usersFilePath)) {
    const usersData = fs.readFileSync(usersFilePath, 'utf8');
    users = JSON.parse(usersData);
  }
  
  // 新しいテストユーザーを追加
  const newUser = {
    id: Date.now().toString(),
    email: email,
    password: hashedPassword,
    name: 'testuser',
    createdAt: Date.now()
  };
  
  // 既存のテストユーザーを削除（存在する場合）
  users = users.filter(user => user.email !== email);
  
  // 新しいユーザーを追加
  users.push(newUser);
  
  // ファイルに保存
  fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
  
  console.log('テストユーザーが作成されました:');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Hashed Password: ${hashedPassword}`);
};

createTestUser().catch(console.error);