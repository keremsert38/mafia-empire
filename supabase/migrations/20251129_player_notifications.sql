-- =====================================================
-- PLAYER NOTIFICATIONS TABLE - UPDATED VERSION
-- =====================================================
-- Bu migration'ı Supabase Dashboard > SQL Editor'da çalıştırın
-- =====================================================

-- Önce eski tabloyu temizle (varsa)
DROP TABLE IF EXISTS player_notifications CASCADE;

-- Yeni notifications tablosu oluştur
CREATE TABLE player_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('attack', 'defense', 'family', 'system')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Index'ler oluştur
CREATE INDEX idx_player_notifications_player_id ON player_notifications(player_id, created_at DESC);
CREATE INDEX idx_player_notifications_unread ON player_notifications(player_id, is_read) WHERE is_read = false;

-- RLS'yi etkinleştir
ALTER TABLE player_notifications ENABLE ROW LEVEL SECURITY;

-- Policy'ler - authenticated kullanıcılar için
-- Kendi bildirimlerini görebilir
CREATE POLICY "Users can view own notifications" 
ON player_notifications FOR SELECT 
USING (auth.uid() = player_id);

-- Kendi bildirimlerini güncelleyebilir (is_read işaretlemek için)
CREATE POLICY "Users can update own notifications" 
ON player_notifications FOR UPDATE 
USING (auth.uid() = player_id);

-- Herkes başkasına bildirim gönderebilir (attack durumu için)
CREATE POLICY "Users can insert notifications to others" 
ON player_notifications FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- İzinleri ver
GRANT ALL ON player_notifications TO authenticated;
GRANT ALL ON player_notifications TO anon;

-- Başarı mesajı
SELECT 'player_notifications tablosu başarıyla oluşturuldu!' AS status;
