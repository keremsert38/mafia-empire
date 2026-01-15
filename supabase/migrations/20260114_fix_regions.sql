-- =====================================================
-- TEMİZ GÜNCELLEME SQL'İ (DÜZELTİLMİŞ)
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
-- Mevcut değilse ekle (Hata vermemesi için)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='player_stats' AND column_name='ak47') THEN
        ALTER TABLE player_stats ADD COLUMN ak47 INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='player_stats' AND column_name='baretta') THEN
        ALTER TABLE player_stats ADD COLUMN baretta INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='player_stats' AND column_name='health_kit') THEN
        ALTER TABLE player_stats ADD COLUMN health_kit INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='player_stats' AND column_name='food_pack') THEN
        ALTER TABLE player_stats ADD COLUMN food_pack INTEGER DEFAULT 0;
    END IF;
END $$;

-- =====================================================
-- 4. BÖLGEDEN ASKER ÇEKME FONKSİYONU (DÜZELTİLDİ)
-- =====================================================
-- regions tablosunda owner_id ve soldiers yok, bunlar region_state tablosunda!

CREATE OR REPLACE FUNCTION withdraw_soldiers_from_region(
  p_region_id TEXT,
  p_amount INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_state RECORD;
  v_current_soldiers INTEGER;
BEGIN
  -- Bölge durumunu bul (region_state)
  SELECT * INTO v_state FROM region_state WHERE region_id = p_region_id;
  
  IF v_state IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Bölge durumu bulunamadı');
  END IF;
  
  -- Sahiplik kontrolü
  IF v_state.owner_user_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Bu bölge size ait değil');
  END IF;
  
  -- Mevcut asker sayısı kontrolü (defender_soldiers)
  IF v_state.defender_soldiers < p_amount THEN
    RETURN jsonb_build_object('success', false, 'message', 
      format('Bölgede sadece %s asker var', v_state.defender_soldiers));
  END IF;
  
  -- Minimum 1 asker bölgede kalmalı (opsiyonel)
  IF v_state.defender_soldiers - p_amount < 1 THEN
    RETURN jsonb_build_object('success', false, 'message', 
      'Bölgede en az 1 asker kalmalı');
  END IF;
  
  -- Bölgeden askerleri çek (region_state güncelle)
  UPDATE region_state 
  SET defender_soldiers = defender_soldiers - p_amount 
  WHERE region_id = p_region_id;
  
  -- Oyuncuya askerleri ekle
  -- user_soldiers tablosu varsa orayı, yoksa player_stats'ı güncelle (kodda user_soldiers kullanılmış)
  -- Garanti olsun diye user_soldiers tablosunu kontrol et
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_soldiers') THEN
      UPDATE user_soldiers 
      SET soldiers = soldiers + p_amount 
      WHERE user_id = v_user_id;
  ELSE
      -- user_soldiers yoksa player_stats güncelle (Fallback)
      UPDATE player_stats
      SET soldiers = soldiers + p_amount
      WHERE id = v_user_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', format('%s asker geri çekildi!', p_amount),
    'withdrawn', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION withdraw_soldiers_from_region(TEXT, INTEGER) TO authenticated;

-- =====================================================
-- 5. BÖLGE SIRALAMASI (DÜZELTİLDİ)
-- =====================================================

-- Bölge sıralaması view (region_state kullanarak)
DROP VIEW IF EXISTS leaderboard_territories CASCADE;

CREATE VIEW leaderboard_territories AS
SELECT 
  ps.id,
  ps.username,
  ps.level,
  ps.family_id,
  COUNT(rs.region_id) as territory_count, -- region_state say
  ROW_NUMBER() OVER (ORDER BY COUNT(rs.region_id) DESC, ps.level DESC) as rank
FROM player_stats ps
LEFT JOIN region_state rs ON rs.owner_user_id = ps.id -- owner_id yerine owner_user_id
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
