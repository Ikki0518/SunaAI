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
      this.ensureDataDir();
      if (fs.existsSync(USERS_FILE_PATH)) {
        const data = fs.readFileSync(USERS_FILE_PATH, 'utf8');
        return JSON.parse(data);
      }
      return [];
    } catch (error) {
      console.error('ユーザーデータの読み込みエラー:', error);
      return [];
    }
  }

  private saveUsers(users: User[]): void {
    try {
      this.ensureDataDir();
      fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2), 'utf8');
    } catch (error) {
      console.error('ユーザーデータの保存エラー:', error);
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const users = this.getUsers();
    return users.find(user => user.email === email) || null;
  }

  async createUser(userData: CreateUserData): Promise<User> {
    const users = this.getUsers();
    
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
}

export const userServiceServer = new UserServiceServer();