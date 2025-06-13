export interface User {
  id: string;
  email: string;
  phone: string;
  name: string;
  password: string;
  createdAt: number;
}

export interface CreateUserData {
  email: string;
  phone: string;
  name: string;
  password: string;
}