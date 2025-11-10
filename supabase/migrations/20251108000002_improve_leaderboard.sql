-- Leaderboard iyileştirmeleri

-- 1. Leaderboard güncelleme fonksiyonunu geliştir
CREATE OR REPLACE FUNCTION update_leaderboard()
RETURNS void AS $$
BEGIN
  -- Önce mevcut cache'i temizle
  DELETE FROM leaderboard_cache;
  
  -- Tüm aktif oyuncuları leaderboard'a ekle (son 7 gün içinde aktif olanlar)
  INSERT INTO leaderboard_cache (
    player_id, player_name, rank_name, level, respect, territories, profile_image
  )
  SELECT 
    ps.id,
    ps.username,
    ps.rank,
    ps.level,
    ps.respect,
    ps.territories,
    ps.profile_image
  FROM player_stats ps
  WHERE ps.level > 0 
    AND ps.last_active > (now() - interval '7 days') -- Son 7 gün aktif olanlar
  ORDER BY ps.level DESC, ps.respect DESC;
  
  -- Level sıralaması
  WITH level_rankings AS (
    SELECT 
      player_id,
      ROW_NUMBER() OVER (
        ORDER BY 
          level DESC, 
          respect DESC, 
          territories DESC, -- Eşitlik durumunda bölge sayısı
          last_updated ASC
      ) as rank_position
    FROM leaderboard_cache
    WHERE level > 0 -- Sadece gerçek seviyeye sahip oyuncular
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
    WHERE respect > 0
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
          respect DESC, -- Eşit bölge sayısında saygı puanı yüksek olan
          level DESC,
          last_updated ASC
      ) as rank_position
    FROM leaderboard_cache
    WHERE territories > 0
  )
  UPDATE leaderboard_cache lc
  SET territories_rank = tr.rank_position
  FROM territory_rankings tr
  WHERE lc.player_id = tr.player_id;
  
  -- Son güncelleme zamanını ayarla
  UPDATE leaderboard_cache SET last_updated = now();
END;
$$ language 'plpgsql';

-- 2. Sıralama verilerini düzenli olarak güncelle (her 5 dakikada bir)
CREATE OR REPLACE FUNCTION schedule_leaderboard_updates()
RETURNS void AS $$
BEGIN
  -- pgcron extension gerekli
  SELECT cron.schedule(
    'update-leaderboard',  -- Görev adı
    '*/5 * * * *',        -- Her 5 dakikada bir
    'SELECT update_leaderboard();'
  );
END;
$$ LANGUAGE plpgsql;

-- 3. Get leaderboard fonksiyonunu güncelle (aktif durumu ve sıralama detaylarını ekle)
CREATE OR REPLACE FUNCTION get_leaderboard_by_type(
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
  is_active boolean,        -- Aktiflik durumu eklendi
  last_active timestamptz,  -- Son aktiflik zamanı eklendi
  score_change integer      -- Skor değişimi eklendi
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
    END AS score,
    CASE 
      WHEN leaderboard_type = 'level' THEN lc.level_rank
      WHEN leaderboard_type = 'respect' THEN lc.respect_rank
      WHEN leaderboard_type = 'territories' THEN lc.territories_rank
      ELSE lc.level_rank
    END AS player_rank,
    lc.profile_image,
    lc.territories,
    (now() - ps.last_active) < interval '1 day' AS is_active, -- Son 24 saat aktif
    ps.last_active,
    CASE 
      WHEN leaderboard_type = 'level' THEN 
        lc.level - (SELECT level FROM player_stats_history WHERE player_id = lc.player_id ORDER BY created_at DESC LIMIT 1 OFFSET 1)
      WHEN leaderboard_type = 'respect' THEN 
        lc.respect - (SELECT respect FROM player_stats_history WHERE player_id = lc.player_id ORDER BY created_at DESC LIMIT 1 OFFSET 1)
      WHEN leaderboard_type = 'territories' THEN 
        lc.territories - (SELECT territories FROM player_stats_history WHERE player_id = lc.player_id ORDER BY created_at DESC LIMIT 1 OFFSET 1)
      ELSE 0
    END AS score_change
  FROM leaderboard_cache lc
  JOIN player_stats ps ON lc.player_id = ps.id
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

-- 4. İstatistik geçmişi tablosu oluştur (skor değişimleri için)
CREATE TABLE IF NOT EXISTS player_stats_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  level integer NOT NULL,
  respect integer NOT NULL,
  territories integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_stats_history_player_id ON player_stats_history(player_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_history_created_at ON player_stats_history(created_at);

-- 5. İstatistik geçmişini güncelleyen trigger
CREATE OR REPLACE FUNCTION log_player_stats_history()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.level != OLD.level OR NEW.respect != OLD.respect OR NEW.territories != OLD.territories) THEN
    INSERT INTO player_stats_history (
      player_id, level, respect, territories
    ) VALUES (
      NEW.id, NEW.level, NEW.respect, NEW.territories
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER player_stats_history_trigger
  AFTER UPDATE ON player_stats
  FOR EACH ROW
  EXECUTE FUNCTION log_player_stats_history();

-- 6. RLS politikalarını güncelle
ALTER TABLE player_stats_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on player_stats_history" ON player_stats_history
  FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON player_stats_history TO authenticated;
GRANT ALL ON player_stats_history TO anon;

-- 7. İlk verileri oluştur
INSERT INTO player_stats_history (
  player_id, level, respect, territories
)
SELECT 
  id, level, respect, territories
FROM player_stats
WHERE level > 0
ON CONFLICT DO NOTHING;

-- 8. Leaderboard'u güncelle
SELECT update_leaderboard();