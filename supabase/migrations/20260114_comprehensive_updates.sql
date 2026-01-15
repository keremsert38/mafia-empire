-- =====================================================
-- TEMİZ GÜNCELLEME SQL'İ (HATASIZ)
-- =====================================================

-- =====================================================
-- 1. ÜRETİM SÜRELERİNİ KISALT
-- =====================================================
-- Tüm tarifleri çok kısa süreye ayarla (6 saniye = 0.1 dakika)
UPDATE recipes SET production_time = 0.1;

-- =====================================================
-- 2. FABRİKA LEVEL SINIRINI KALDIR
-- =====================================================
UPDATE businesses SET required_level = 1 WHERE id LIKE 'fab_%';

-- =====================================================
-- 3. PLAYER_STATS'A ÜRÜN KOLONLARI EKLE
-- =====================================================
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS ak47 INTEGER DEFAULT 0;
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS baretta INTEGER DEFAULT 0;
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS health_kit INTEGER DEFAULT 0;
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS food_pack INTEGER DEFAULT 0;

-- =====================================================
-- 4. BÖLGEDEN ASKER ÇEKME FONKSİYONU
-- =====================================================
CREATE OR REPLACE FUNCTION withdraw_soldiers_from_region(
  p_region_id TEXT,
  p_amount INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_region RECORD;
  v_current_soldiers INTEGER;
BEGIN
  -- Bölgeyi bul
  SELECT * INTO v_region FROM regions WHERE id = p_region_id;
  
  IF v_region IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Bölge bulunamadı');
  END IF;
  
  -- Sahiplik kontrolü
  IF v_region.owner_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Bu bölge size ait değil');
  END IF;
  
  -- Mevcut asker sayısı kontrolü
  IF v_region.soldiers < p_amount THEN
    RETURN jsonb_build_object('success', false, 'message', 
      format('Bölgede sadece %s asker var', v_region.soldiers));
  END IF;
  
  -- Minimum 1 asker bölgede kalmalı (opsiyonel)
  IF v_region.soldiers - p_amount < 1 THEN
    RETURN jsonb_build_object('success', false, 'message', 
      'Bölgede en az 1 asker kalmalı');
  END IF;
  
  -- Bölgeden askerleri çek
  UPDATE regions 
  SET soldiers = soldiers - p_amount 
  WHERE id = p_region_id;
  
  -- Oyuncuya askerleri ekle
  UPDATE user_soldiers 
  SET soldiers = soldiers + p_amount 
  WHERE user_id = v_user_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', format('%s asker geri çekildi!', p_amount),
    'withdrawn', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION withdraw_soldiers_from_region(TEXT, INTEGER) TO authenticated;

-- =====================================================
-- 5. BÖLGE SIRALAMASI
-- =====================================================

-- Bölge sıralaması view
DROP VIEW IF EXISTS leaderboard_territories CASCADE;
CREATE VIEW leaderboard_territories AS
SELECT 
  ps.id,
  ps.username,
  ps.level,
  ps.family_id,
  COUNT(r.id) as territory_count,
  ROW_NUMBER() OVER (ORDER BY COUNT(r.id) DESC, ps.level DESC) as rank
FROM player_stats ps
LEFT JOIN regions r ON r.owner_id = ps.id
GROUP BY ps.id, ps.username, ps.level, ps.family_id
ORDER BY territory_count DESC, ps.level DESC;

-- Leaderboard fonksiyonu (level + territories destekli)
DROP FUNCTION IF EXISTS get_leaderboard_by_type(TEXT, INTEGER);
CREATE OR REPLACE FUNCTION get_leaderboard_by_type(
  leaderboard_type TEXT DEFAULT 'level',
  limit_count INTEGER DEFAULT 100
)
RETURNS TABLE(
  player_id UUID,
  player_name TEXT,
  rank_name TEXT,
  player_level INTEGER,
  score BIGINT,
  player_rank BIGINT,
  profile_image TEXT,
  territories INTEGER,
  is_active BOOLEAN,
  last_active TIMESTAMPTZ,
  score_change INTEGER
) AS $$
BEGIN
  IF leaderboard_type = 'territories' THEN
    RETURN QUERY
    SELECT 
      lt.id,
      lt.username,
      'Bölge Lordu'::TEXT,
      lt.level::INTEGER,
      lt.territory_count::BIGINT,
      lt.rank::BIGINT,
      NULL::TEXT,
      lt.territory_count::INTEGER,
      TRUE,
      NOW(),
      0
    FROM leaderboard_territories lt
    LIMIT limit_count;
  ELSE
    -- Default: Level sıralaması
    RETURN QUERY
    SELECT 
      ps.id,
      ps.username,
      COALESCE(ps.rank, 'Soldato')::TEXT,
      ps.level::INTEGER,
      ps.experience::BIGINT,
      ROW_NUMBER() OVER (ORDER BY ps.level DESC, ps.experience DESC)::BIGINT,
      NULL::TEXT,
      0,
      TRUE,
      NOW(),
      0
    FROM player_stats ps
    ORDER BY ps.level DESC, ps.experience DESC
    LIMIT limit_count;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_leaderboard_by_type(TEXT, INTEGER) TO authenticated;

-- =====================================================
-- ÖZET:
-- 1. Üretim süreleri 6 saniyeye indirildi
-- 2. Fabrika level sınırı kaldırıldı
-- 3. Player_stats'a ürün kolonları eklendi
-- 4. Bölgeden asker çekme fonksiyonu eklendi
-- 5. Bölge sıralaması eklendi
-- =====================================================
