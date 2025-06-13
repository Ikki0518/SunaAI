import { User, CreateUserData } from '../types/user';
import fs from 'fs';
import path from 'path';

const USERS_FILE_PATH = path.join(process.cwd(), 'data', 'users.json');

class UserServiceServer {
  private ensureDataDir(): void {
    const dataDir = path.dirname(USERS_FILE_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  private getUsers(): User[] {
    try {
      console.log('🐛 [DEBUG] Reading users file:', USERS_FILE_PATH);
      this.ensureDataDir();
      if (fs.existsSync(USERS_FILE_PATH)) {
        const data = fs.readFileSync(USERS_FILE_PATH, 'utf8');
        console.log('🐛 [DEBUG] File content length:', data.length);
        const users = JSON.parse(data);
        console.log('🐛 [DEBUG] Parsed users count:', users.length);
        return users;
      }
      console.log('🐛 [DEBUG] Users file does not exist, returning empty array');
      return [];
    } catch (error) {
      console.error('🐛 [CRITICAL] ユーザーデータの読み込みエラー:', error);
      console.error('🐛 [CRITICAL] File path:', USERS_FILE_PATH);
      console.error('🐛 [CRITICAL] File exists:', fs.existsSync(USERS_FILE_PATH));
      return [];
    }
  }

  private saveUsers(users: User[]): void {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🐛 [DEBUG] Saving users:', users.length, 'users to', USERS_FILE_PATH);
      }
      this.ensureDataDir();
      const jsonData = JSON.stringify(users, null, 2);
      if (process.env.NODE_ENV === 'development') {
        console.log('🐛 [DEBUG] JSON data length:', jsonData.length);
      }
      fs.writeFileSync(USERS_FILE_PATH, jsonData, 'utf8');
      if (process.env.NODE_ENV === 'development') {
        console.log('🐛 [DEBUG] Users saved successfully');
      }
    } catch (error) {
      console.error('🐛 [CRITICAL] ユーザーデータの保存エラー:', error);
      if (process.env.NODE_ENV === 'development') {
        console.error('🐛 [CRITICAL] Users count:', users.length);
        console.error('🐛 [CRITICAL] File path:', USERS_FILE_PATH);
      }
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const users = this.getUsers();
    return users.find(user => user.email === email) || null;
  }

  async getUserByPhone(phone: string): Promise<User | null> {
    const users = this.getUsers();
    return users.find(user => user.phone === phone) || null;
  }

  async getUserById(userId: string): Promise<User | null> {
    const users = this.getUsers();
    return users.find(user => user.id === userId) || null;
  }

  async createUser(userData: CreateUserData): Promise<User> {
    const users = this.getUsers();
    
    // 電話番号の重複チェック
    if (users.some(user => user.phone === userData.phone)) {
      throw new Error('この電話番号は既に登録されています');
    }
    
    // メールアドレスの重複チェック
    if (users.some(user => user.email === userData.email)) {
      throw new Error('このメールアドレスは既に登録されています');
    }

    const newUser: User = {
      id: Date.now().toString(),
      ...userData,
      createdAt: Date.now(),
    };

    users.push(newUser);
    this.saveUsers(users);
    
    return newUser;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    const users = this.getUsers();
    const userIndex = users.findIndex(user => user.id === userId);
    
    if (userIndex === -1) {
      return null;
    }

    users[userIndex] = { ...users[userIndex], ...updates };
    this.saveUsers(users);
    
    return users[userIndex];
  }

  async deleteUser(userId: string): Promise<boolean> {
    const users = this.getUsers();
    const filteredUsers = users.filter(user => user.id !== userId);
    
    if (filteredUsers.length === users.length) {
      return false; // ユーザーが見つからなかった
    }

    this.saveUsers(filteredUsers);
    return true;
  }

  // 開発/テスト用: すべてのユーザーを取得
  async getAllUsers(): Promise<User[]> {
    return this.getUsers();
  }

  // 開発/テスト用: すべてのユーザーを削除
  async clearAllUsers(): Promise<void> {
    try {
      if (fs.existsSync(USERS_FILE_PATH)) {
        fs.unlinkSync(USERS_FILE_PATH);
      }
    } catch (error) {
      console.error('ユーザーデータのクリアエラー:', error);
    }
  }

  // 管理者以外のユーザーをリセット
  async resetAllUsers(): Promise<{ deletedCount: number; remainingUsers: User[] }> {
    const users = this.getUsers();
    const adminEmails = ['ikkiyamamoto0518@gmail.com', 'ikki_y0518@icloud.com'];
    
    // 管理者以外のユーザーを削除
    const remainingUsers = users.filter(user => adminEmails.includes(user.email));
    const deletedCount = users.length - remainingUsers.length;
    
    this.saveUsers(remainingUsers);
    
    return {
      deletedCount,
      remainingUsers
    };
  }
}

export const userServiceServer = new UserServiceServer();