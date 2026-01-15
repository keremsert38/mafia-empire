-- =====================================================
-- GENEL SOHBET SİSTEMİ - TAM KURULUM
-- =====================================================

-- 1. Önce eski tabloyu temizle (varsa)
DROP TABLE IF EXISTS chat_messages CASCADE;

-- 2. chat_messages tablosunu oluştur
CREATE TABLE chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. İndeksler
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);

-- 4. RLS (Row Level Security) Aktif Et
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 5. SELECT Politikası - Herkes mesajları görebilir
CREATE POLICY "Anyone can view messages"
ON chat_messages FOR SELECT
TO authenticated
USING (true);

-- 6. INSERT Politikası - Authenticated kullanıcılar mesaj gönderebilir
CREATE POLICY "Authenticated users can insert"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 7. Realtime için publikasyon ekle
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- 8. Admin kullanıcıları (kendi user_id'lerini ekle)
-- Bu kullanıcılar mesajlarında admin etiketi görünür
-- Örnek: UPDATE chat_messages SET is_admin = TRUE WHERE user_id = 'your-admin-user-id';

-- 9. Test mesajı (opsiyonel - silmek istersen DELETE FROM chat_messages WHERE message LIKE '%Hoş geldiniz%')
-- INSERT INTO chat_messages (user_id, username, message, is_admin) 
-- VALUES (NULL, 'Sistem', 'Genel sohbete hoş geldiniz! 🎉', TRUE);
