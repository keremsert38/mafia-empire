/*
  # Chat Rapor ve Engelleme Sistemi
  
  1. Yeni Tablolar
    - `chat_reports` - Oyuncu raporları
    - `chat_blocks` - Oyuncu engellemeleri
    
  2. Özellikler
    - Oyuncuları raporlama (küfür, spam, taciz vb.)
    - Kişisel engelleme (engellenen kişinin mesajlarını görmeme)
*/

-- Raporlar tablosu
CREATE TABLE IF NOT EXISTS chat_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reported_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reported_message_id uuid REFERENCES chat_messages(id) ON DELETE SET NULL,
  reason text NOT NULL,  -- 'profanity', 'spam', 'harassment', 'inappropriate', 'other'
  description text,       -- Ek açıklama (opsiyonel)
  status text DEFAULT 'pending',  -- 'pending', 'reviewed', 'action_taken', 'dismissed'
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Engellemeler tablosu
CREATE TABLE IF NOT EXISTS chat_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  blocked_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_user_id)
);

-- RLS etkinleştir
ALTER TABLE chat_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_blocks ENABLE ROW LEVEL SECURITY;

-- Raporlar için policies
DROP POLICY IF EXISTS "Users can create reports" ON chat_reports;
CREATE POLICY "Users can create reports" ON chat_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can view own reports" ON chat_reports;
CREATE POLICY "Users can view own reports" ON chat_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Engellemeler için policies
DROP POLICY IF EXISTS "Users can manage own blocks" ON chat_blocks;
CREATE POLICY "Users can manage own blocks" ON chat_blocks
  FOR ALL USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can view if blocked" ON chat_blocks;
CREATE POLICY "Users can view if blocked" ON chat_blocks
  FOR SELECT USING (auth.uid() = blocked_user_id);

-- Oyuncu raporlama RPC
CREATE OR REPLACE FUNCTION rpc_report_user(
  p_reported_user_id uuid,
  p_reported_message_id uuid DEFAULT NULL,
  p_reason text DEFAULT 'other',
  p_description text DEFAULT NULL
)
RETURNS TABLE(success boolean, message text) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing_report integer;
BEGIN
  -- Kendini raporlayamaz
  IF v_user_id = p_reported_user_id THEN
    RETURN QUERY SELECT false, 'Kendinizi raporlayamazsınız!';
    RETURN;
  END IF;
  
  -- Aynı mesaj için zaten rapor var mı kontrol et
  IF p_reported_message_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_existing_report
    FROM chat_reports
    WHERE reporter_id = v_user_id 
      AND reported_message_id = p_reported_message_id;
    
    IF v_existing_report > 0 THEN
      RETURN QUERY SELECT false, 'Bu mesajı zaten raporladınız!';
      RETURN;
    END IF;
  END IF;
  
  -- Rapor oluştur
  INSERT INTO chat_reports (
    reporter_id,
    reported_user_id,
    reported_message_id,
    reason,
    description
  )
  VALUES (
    v_user_id,
    p_reported_user_id,
    p_reported_message_id,
    p_reason,
    p_description
  );
  
  RETURN QUERY SELECT true, 'Rapor başarıyla gönderildi. Yöneticiler inceleyecek.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Oyuncu engelleme RPC
CREATE OR REPLACE FUNCTION rpc_block_user(p_blocked_user_id uuid)
RETURNS TABLE(success boolean, message text) AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  -- Kendini engelleyemez
  IF v_user_id = p_blocked_user_id THEN
    RETURN QUERY SELECT false, 'Kendinizi engelleyemezsiniz!';
    RETURN;
  END IF;
  
  -- Engelleme ekle
  INSERT INTO chat_blocks (blocker_id, blocked_user_id)
  VALUES (v_user_id, p_blocked_user_id)
  ON CONFLICT (blocker_id, blocked_user_id) DO NOTHING;
  
  RETURN QUERY SELECT true, 'Kullanıcı engellendi. Artık mesajlarını görmeyeceksiniz.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Oyuncu engel kaldırma RPC
CREATE OR REPLACE FUNCTION rpc_unblock_user(p_blocked_user_id uuid)
RETURNS TABLE(success boolean, message text) AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  DELETE FROM chat_blocks
  WHERE blocker_id = v_user_id AND blocked_user_id = p_blocked_user_id;
  
  RETURN QUERY SELECT true, 'Kullanıcının engeli kaldırıldı.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Engellenen kullanıcıları getir
CREATE OR REPLACE FUNCTION rpc_get_blocked_users()
RETURNS TABLE(
  blocked_user_id uuid,
  blocked_username text,
  blocked_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cb.blocked_user_id,
    COALESCE(ps.username, 'Bilinmeyen'),
    cb.created_at
  FROM chat_blocks cb
  LEFT JOIN player_stats ps ON ps.id = cb.blocked_user_id
  WHERE cb.blocker_id = auth.uid()
  ORDER BY cb.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- İzinler
GRANT EXECUTE ON FUNCTION rpc_report_user(uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_block_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_unblock_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_blocked_users() TO authenticated;

GRANT ALL ON chat_reports TO authenticated;
GRANT ALL ON chat_blocks TO authenticated;

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_chat_reports_reporter ON chat_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_chat_reports_reported ON chat_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_reports_status ON chat_reports(status);
CREATE INDEX IF NOT EXISTS idx_chat_blocks_blocker ON chat_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_chat_blocks_blocked ON chat_blocks(blocked_user_id);
