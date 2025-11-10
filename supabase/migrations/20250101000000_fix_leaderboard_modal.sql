/*
  # LeaderboardModal için Güncel SQL Kodu
  
  Bu migration, LeaderboardModal'ın çalışması için gereken tüm SQL kodlarını içerir.
  
  Özellikler:
  1. Leaderboard cache tablosu
  2. get_leaderboard_by_type fonksiyonu (is_active, last_active, score_change ile)
  3. update_leaderboard fonksiyonu
  4. Otomatik güncelleme trigger'ları
  5. İstatistik geçmişi tablosu (score_change için)
*/

-- 1. Leaderboard cache tablosu (eğer yoksa oluştur)
CREATE TABLE IF NOT EXISTS leaderboard_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  player_name text NOT NULL,
  rank_name text NOT NULL,
  level integer NOT NULL DEFAULT 1,
  respect integer NOT NULL DEFAULT 0,
  territories integer NOT NULL DEFAULT 0,
  profile_image text,
  level_rank integer,
  respect_rank integer,
  territories_rank integer,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(player_id)
);

-- 2. Performans için indexler
CREATE INDEX IF NOT EXISTS idx_leaderboard_level_rank ON leaderboard_cache(level_rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_respect_rank ON leaderboard_cache(respect_rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_territories_rank ON leaderboard_cache(territories_rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_player_id ON leaderboard_cache(player_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_level ON leaderboard_cache(level DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_respect ON leaderboard_cache(respect DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_territories ON leaderboard_cache(territories DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_last_updated ON leaderboard_cache(last_updated DESC);

-- 3. İstatistik geçmişi tablosu (score_change için - eğer yoksa oluştur)
CREATE TABLE IF NOT EXISTS player_stats_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  level integer NOT NULL,
  respect integer NOT NULL,
  territories integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_stats_history_player_id ON player_stats_history(player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_player_stats_history_created_at ON player_stats_history(created_at DESC);

-- 4. Leaderboard güncelleme fonksiyonu
-- Önce mevcut fonksiyonu sil (eğer varsa)
DROP FUNCTION IF EXISTS update_leaderboard() CASCADE;

-- Yeni fonksiyonu oluştur
CREATE FUNCTION update_leaderboard()
RETURNS void AS $$
BEGIN
  -- Önce mevcut cache'i temizle
  DELETE FROM leaderboard_cache;
  
  -- Tüm aktif oyuncuları leaderboard'a ekle (son 30 gün içinde aktif olanlar)
  INSERT INTO leaderboard_cache (
    player_id, player_name, rank_name, level, respect, territories, profile_image
  )
  SELECT 
    ps.id,
    ps.username,
    COALESCE(ps.rank, 'Soldato'),
    COALESCE(ps.level, 1),
    COALESCE(ps.respect, 0),
    COALESCE(ps.territories, 0),
    ps.profile_image
  FROM player_stats ps
  WHERE ps.level > 0 
    AND ps.last_active > (now() - interval '30 days') -- Son 30 gün aktif olanlar
  ORDER BY ps.level DESC, ps.respect DESC, ps.territories DESC;
  
  -- Level sıralaması
  WITH level_rankings AS (
    SELECT 
      player_id,
      ROW_NUMBER() OVER (
        ORDER BY 
          level DESC, 
          respect DESC, 
          territories DESC,
          last_updated ASC
      ) as rank_position
    FROM leaderboard_cache
    WHERE level > 0
  )
  UPDATE leaderboard_cache lc
  SET level_rank = lr.rank_position
  FROM level_rankings lr
  WHERE lc.player_id = lr.player_id;
  
  -- Respect sıralaması
  WITH respect_rankings AS (
    SELECT 
      player_id,
      ROW_NUMBER() OVER (
        ORDER BY 
          respect DESC, 
          level DESC, 
          territories DESC,
          last_updated ASC
      ) as rank_position
    FROM leaderboard_cache
    WHERE respect >= 0
  )
  UPDATE leaderboard_cache lc
  SET respect_rank = rr.rank_position
  FROM respect_rankings rr
  WHERE lc.player_id = rr.player_id;
  
  -- Territories sıralaması
  WITH territory_rankings AS (
    SELECT 
      player_id,
      ROW_NUMBER() OVER (
        ORDER BY 
          territories DESC,
          respect DESC,
          level DESC,
          last_updated ASC
      ) as rank_position
    FROM leaderboard_cache
    WHERE territories >= 0
  )
  UPDATE leaderboard_cache lc
  SET territories_rank = tr.rank_position
  FROM territory_rankings tr
  WHERE lc.player_id = tr.player_id;
  
  -- Son güncelleme zamanını ayarla
  UPDATE leaderboard_cache SET last_updated = now();
  
  RAISE LOG 'Leaderboard updated successfully with % players', (SELECT COUNT(*) FROM leaderboard_cache);
END;
$$ LANGUAGE plpgsql;

-- 5. get_leaderboard_by_type fonksiyonu (LeaderboardModal için tam uyumlu)
-- Önce mevcut fonksiyonu sil (eğer varsa) - tüm olası imzaları dene
DROP FUNCTION IF EXISTS get_leaderboard_by_type(text, integer) CASCADE;
DROP FUNCTION IF EXISTS get_leaderboard_by_type(text) CASCADE;

-- Yeni fonksiyonu oluştur
CREATE FUNCTION get_leaderboard_by_type(
  leaderboard_type text, 
  limit_count integer DEFAULT 100
)
RETURNS TABLE (
  player_id uuid,
  player_name text,
  rank_name text,
  player_level integer,
  score integer,
  player_rank integer,
  profile_image text,
  territories integer,
  is_active boolean,
  last_active text,
  score_change integer
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    lc.player_id,
    lc.player_name,
    lc.rank_name,
    lc.level AS player_level,
    CASE 
      WHEN leaderboard_type = 'level' THEN lc.level
      WHEN leaderboard_type = 'respect' THEN lc.respect
      WHEN leaderboard_type = 'territories' THEN lc.territories
      ELSE lc.level
    END::integer AS score,
    CASE 
      WHEN leaderboard_type = 'level' THEN COALESCE(lc.level_rank, 999999)
      WHEN leaderboard_type = 'respect' THEN COALESCE(lc.respect_rank, 999999)
      WHEN leaderboard_type = 'territories' THEN COALESCE(lc.territories_rank, 999999)
      ELSE COALESCE(lc.level_rank, 999999)
    END::integer AS player_rank,
    lc.profile_image,
    COALESCE(lc.territories, 0) AS territories,
    -- Son 24 saat içinde aktif mi?
    (now() - ps.last_active) < interval '24 hours' AS is_active,
    -- last_active'ı ISO string formatında döndür
    ps.last_active::text AS last_active,
    -- Score change: önceki kayıt ile karşılaştır
    COALESCE(
      CASE 
        WHEN leaderboard_type = 'level' THEN 
          lc.level - COALESCE((
            SELECT psh.level 
            FROM player_stats_history psh 
            WHERE psh.player_id = lc.player_id 
              AND psh.created_at < ps.last_active
            ORDER BY psh.created_at DESC 
            LIMIT 1
          ), lc.level)
        WHEN leaderboard_type = 'respect' THEN 
          lc.respect - COALESCE((
            SELECT psh.respect 
            FROM player_stats_history psh 
            WHERE psh.player_id = lc.player_id 
              AND psh.created_at < ps.last_active
            ORDER BY psh.created_at DESC 
            LIMIT 1
          ), lc.respect)
        WHEN leaderboard_type = 'territories' THEN 
          lc.territories - COALESCE((
            SELECT psh.territories 
            FROM player_stats_history psh 
            WHERE psh.player_id = lc.player_id 
              AND psh.created_at < ps.last_active
            ORDER BY psh.created_at DESC 
            LIMIT 1
          ), lc.territories)
        ELSE 0
      END,
      0
    )::integer AS score_change
  FROM leaderboard_cache lc
  INNER JOIN player_stats ps ON lc.player_id = ps.id
  WHERE 
    CASE 
      WHEN leaderboard_type = 'level' THEN lc.level_rank IS NOT NULL
      WHEN leaderboard_type = 'respect' THEN lc.respect_rank IS NOT NULL
      WHEN leaderboard_type = 'territories' THEN lc.territories_rank IS NOT NULL
      ELSE lc.level_rank IS NOT NULL
    END
  ORDER BY 
    CASE 
      WHEN leaderboard_type = 'level' THEN lc.level_rank
      WHEN leaderboard_type = 'respect' THEN lc.respect_rank
      WHEN leaderboard_type = 'territories' THEN lc.territories_rank
      ELSE lc.level_rank
    END ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- 6. İstatistik geçmişini güncelleyen trigger fonksiyonu
-- Önce mevcut fonksiyonu sil (eğer varsa)
DROP FUNCTION IF EXISTS log_player_stats_history() CASCADE;

-- Yeni fonksiyonu oluştur
CREATE FUNCTION log_player_stats_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Level, respect veya territories değiştiyse geçmişe kaydet
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO player_stats_history (
      player_id, level, respect, territories
    ) VALUES (
      NEW.id, 
      COALESCE(NEW.level, 1), 
      COALESCE(NEW.respect, 0), 
      COALESCE(NEW.territories, 0)
    );
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF (NEW.level != OLD.level OR NEW.respect != OLD.respect OR NEW.territories != OLD.territories) THEN
      INSERT INTO player_stats_history (
        player_id, level, respect, territories
      ) VALUES (
        NEW.id, 
        COALESCE(NEW.level, 1), 
        COALESCE(NEW.respect, 0), 
        COALESCE(NEW.territories, 0)
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 7. Player stats trigger'ını oluştur veya güncelle
DROP TRIGGER IF EXISTS player_stats_history_trigger ON player_stats;
CREATE TRIGGER player_stats_history_trigger
  AFTER INSERT OR UPDATE ON player_stats
  FOR EACH ROW
  EXECUTE FUNCTION log_player_stats_history();

-- 8. Leaderboard cache'i güncelleyen trigger fonksiyonu
-- Önce mevcut fonksiyonu sil (eğer varsa)
DROP FUNCTION IF EXISTS trigger_leaderboard_update() CASCADE;

-- Yeni fonksiyonu oluştur
CREATE FUNCTION trigger_leaderboard_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Leaderboard cache'i güncelle veya ekle
  INSERT INTO leaderboard_cache (
    player_id, player_name, rank_name, level, respect, territories, profile_image
  )
  VALUES (
    NEW.id, 
    NEW.username, 
    COALESCE(NEW.rank, 'Soldato'), 
    COALESCE(NEW.level, 1), 
    COALESCE(NEW.respect, 0), 
    COALESCE(NEW.territories, 0), 
    NEW.profile_image
  )
  ON CONFLICT (player_id) DO UPDATE SET
    player_name = EXCLUDED.player_name,
    rank_name = EXCLUDED.rank_name,
    level = EXCLUDED.level,
    respect = EXCLUDED.respect,
    territories = EXCLUDED.territories,
    profile_image = EXCLUDED.profile_image,
    last_updated = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Player stats trigger'ını oluştur veya güncelle
DROP TRIGGER IF EXISTS on_player_stats_updated ON player_stats;
CREATE TRIGGER on_player_stats_updated
  AFTER INSERT OR UPDATE ON player_stats
  FOR EACH ROW 
  EXECUTE FUNCTION trigger_leaderboard_update();

-- 10. RLS politikaları
ALTER TABLE leaderboard_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on leaderboard_cache" ON leaderboard_cache;
CREATE POLICY "Allow all operations on leaderboard_cache" ON leaderboard_cache
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on player_stats_history" ON player_stats_history;
CREATE POLICY "Allow all operations on player_stats_history" ON player_stats_history
  FOR ALL USING (true) WITH CHECK (true);

-- 11. İzinler
GRANT ALL ON leaderboard_cache TO authenticated;
GRANT ALL ON leaderboard_cache TO anon;
GRANT ALL ON player_stats_history TO authenticated;
GRANT ALL ON player_stats_history TO anon;

-- 12. Mevcut oyuncular için ilk geçmiş kayıtlarını oluştur
INSERT INTO player_stats_history (
  player_id, level, respect, territories
)
SELECT 
  id, 
  COALESCE(level, 1), 
  COALESCE(respect, 0), 
  COALESCE(territories, 0)
FROM player_stats
WHERE level > 0
ON CONFLICT DO NOTHING;

-- 13. İlk leaderboard verilerini oluştur
SELECT update_leaderboard();

-- 14. Real-time için publication (eğer real-time kullanılıyorsa)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE leaderboard_cache;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Publication yoksa veya tablo zaten ekliyse hata verme
    NULL;
END $$;

-- 15. Fonksiyon izinleri
GRANT EXECUTE ON FUNCTION get_leaderboard_by_type(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_leaderboard_by_type(text, integer) TO anon;
GRANT EXECUTE ON FUNCTION update_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION update_leaderboard() TO anon;

