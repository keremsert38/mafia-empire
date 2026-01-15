-- =====================================================
-- AİLE SİSTEMİ MODERNİZASYONU
-- =====================================================

-- 1. Aile Profil Fotoğrafı Kolonu
ALTER TABLE families ADD COLUMN IF NOT EXISTS profile_image TEXT;

-- 2. Aileye Özel Chat Tablosu
CREATE TABLE IF NOT EXISTS family_chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sender_name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Chat için Indexler (Performans)
CREATE INDEX IF NOT EXISTS idx_family_chat_family_id ON family_chat_messages(family_id);
CREATE INDEX IF NOT EXISTS idx_family_chat_created_at ON family_chat_messages(created_at DESC);

-- 4. RLS (Row Level Security) Politikaları
ALTER TABLE family_chat_messages ENABLE ROW LEVEL SECURITY;

-- Aile üyeleri sadece kendi ailelerinin mesajlarını görebilir
DROP POLICY IF EXISTS "Family members can view their family chat" ON family_chat_messages;
CREATE POLICY "Family members can view their family chat"
ON family_chat_messages FOR SELECT
USING (
    family_id IN (
        SELECT family_id FROM family_members WHERE player_id = auth.uid()
    )
);

-- Aile üyeleri kendi ailelerine mesaj gönderebilir
DROP POLICY IF EXISTS "Family members can send messages" ON family_chat_messages;
CREATE POLICY "Family members can send messages"
ON family_chat_messages FOR INSERT
WITH CHECK (
    family_id IN (
        SELECT family_id FROM family_members WHERE player_id = auth.uid()
    )
    AND sender_id = auth.uid()
);

-- 5. Aile Profiline Realtime Subscription İzni
ALTER PUBLICATION supabase_realtime ADD TABLE family_chat_messages;
