export interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  createdAt: number;
}

export interface CreateUserData {
  email: string;
  name: string;
  password: string;
}