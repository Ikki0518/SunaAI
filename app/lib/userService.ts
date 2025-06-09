import { User, CreateUserData } from '../types/user';

const USERS_STORAGE_KEY = 'dify-chat-users';

class UserService {
  private getUsers(): User[] {
    if (typeof window === 'undefined') {
      return [];
    }
    
    try {
      const stored = localStorage.getItem(USERS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('ユーザーデータの読み込みエラー:', error);
      return [];
    }
  }

  private saveUsers(users: User[]): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
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
    if (typeof window === 'undefined') return;
    localStorage.removeItem(USERS_STORAGE_KEY);
  }
}

export const userService = new UserService();