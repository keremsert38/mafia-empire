-- =====================================================
-- GENEL SOHBET SİSTEMİ - BASİT KURULUM
-- =====================================================
-- Bu dosyayı ADIM ADIM çalıştır, hata alırsan o satırı atla.

-- ADIM 1: Eski tabloyu sil (varsa)
DROP TABLE IF EXISTS chat_messages;

-- ADIM 2: Yeni tabloyu oluştur
CREATE TABLE chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ADIM 3: İndeks ekle
CREATE INDEX idx_chat_created ON chat_messages(created_at DESC);

-- ADIM 4: RLS aktif et
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- ADIM 5: Okuma izni (herkes okuyabilir)
DROP POLICY IF EXISTS "chat_select" ON chat_messages;
CREATE POLICY "chat_select" ON chat_messages
FOR SELECT USING (true);

-- ADIM 6: Yazma izni (herkes yazabilir - basit)
DROP POLICY IF EXISTS "chat_insert" ON chat_messages;
CREATE POLICY "chat_insert" ON chat_messages
FOR INSERT WITH CHECK (true);

-- ADIM 7: Realtime (opsiyonel - hata verirse atla)
-- ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- TEST: Bu satırı çalıştırarak test mesajı ekle
INSERT INTO chat_messages (user_id, username, message, is_admin)
VALUES ('00000000-0000-0000-0000-000000000000', 'Sistem', 'Sohbet sistemi aktif! 🎉', TRUE);

-- Kontrol: SELECT * FROM chat_messages;
