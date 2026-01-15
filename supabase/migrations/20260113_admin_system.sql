-- =====================================================
-- ADMİN SİSTEMİ
-- =====================================================
-- Bu SQL'i Supabase Dashboard > SQL Editor'de çalıştırın

-- 1. player_stats tablosuna is_admin kolonu ekle
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Kendi hesabınızı admin yapın (user_id'nizi buraya yazın)
-- Önce user_id'nizi bulun: SELECT id, username FROM player_stats LIMIT 10;
-- Sonra bu SQL'i güncelleyip çalıştırın:
-- UPDATE player_stats SET is_admin = TRUE WHERE id = 'BURAYA_USER_ID_YAZIN';

-- 3. Admin kontrolü için RPC fonksiyonu
CREATE OR REPLACE FUNCTION check_is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM player_stats 
    WHERE id = p_user_id AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Kullanıcı bilgilerini getiren fonksiyonu güncelle (admin dahil)
CREATE OR REPLACE FUNCTION get_player_info(p_user_id UUID)
RETURNS TABLE(
  username TEXT,
  level INTEGER,
  respect BIGINT,
  is_admin BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.username,
    ps.level,
    ps.respect,
    COALESCE(ps.is_admin, FALSE)
  FROM player_stats ps
  WHERE ps.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Chat mesajlarında admin bilgisini göstermek için view
CREATE OR REPLACE VIEW chat_messages_with_admin AS
SELECT 
  cm.*,
  COALESCE(ps.is_admin, FALSE) as is_admin
FROM chat_messages cm
LEFT JOIN player_stats ps ON cm.user_id = ps.id;

-- =====================================================
-- KULLANIM:
-- 1. Bu SQL'i çalıştırın
-- 2. Admin yapmak istediğiniz hesabın user_id'sini bulun:
--    SELECT id, username FROM player_stats WHERE username = 'KULLANICI_ADI';
-- 3. Admin yapın:
--    UPDATE player_stats SET is_admin = TRUE WHERE id = 'USER_ID';
-- =====================================================
