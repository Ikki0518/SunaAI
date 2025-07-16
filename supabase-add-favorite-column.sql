-- chat_messagesテーブルにis_favoriteカラムを追加
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- is_favoriteカラムにインデックスを追加（お気に入りメッセージの検索を高速化）
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_favorite ON chat_messages(is_favorite) WHERE is_favorite = TRUE;