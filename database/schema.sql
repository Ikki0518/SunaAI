-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ログイン履歴テーブル
CREATE TABLE IF NOT EXISTS login_history (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'signin' or 'signup'
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date DATE DEFAULT CURRENT_DATE,
  user_agent TEXT,
  ip_address VARCHAR(45),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_date ON login_history(date);
CREATE INDEX IF NOT EXISTS idx_login_history_action ON login_history(action);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);