/*
  # Tam Sıralama Sistemi - Tablo ve Fonksiyonlar

  1. Yeni Tablolar
    - `leaderboard_cache` - Sıralama verilerini önbelleğe alır
    - Performans için indexler
    
  2. Fonksiyonlar
    - `update_leaderboard()` - Sıralama verilerini günceller
    - `get_leaderboard_by_type()` - Sıralama tipine göre veri döner
    
  3. Otomatik Güncelleme
    - Player stats değiştiğinde sıralama otomatik güncellenir
    
  4. Sıralama Tipleri
    - level: Seviye sıralaması
    - respect: Saygı sıralaması  
    - territories: Bölge sıralaması
*/

-- 1. Leaderboard cache tablosu oluştur
CREATE TABLE IF NOT EXISTS leaderboard_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  player_name text NOT NULL,
  rank_name text NOT NULL,
  level integer NOT NULL,
  respect integer NOT NULL,
  territories integer NOT NULL,
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

-- 3. Leaderboard güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_leaderboard()
RETURNS void AS $$
BEGIN
  -- Önce mevcut cache'i temizle
  DELETE FROM leaderboard_cache;
  
  -- Tüm aktif oyuncuları leaderboard'a ekle
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
  WHERE ps.level > 0 -- Sadece aktif oyuncular
  ORDER BY ps.level DESC, ps.respect DESC;
  
  -- Sıralama pozisyonlarını hesapla ve güncelle
  
  -- Level sıralaması
  WITH level_rankings AS (
    SELECT 
      player_id,
      ROW_NUMBER() OVER (ORDER BY level DESC, respect DESC, last_updated ASC) as rank_position
    FROM leaderboard_cache
  )
  UPDATE leaderboard_cache lc
  SET level_rank = lr.rank_position
  FROM level_rankings lr
  WHERE lc.player_id = lr.player_id;
  
  -- Respect sıralaması
  WITH respect_rankings AS (
    SELECT 
      player_id,
      ROW_NUMBER() OVER (ORDER BY respect DESC, level DESC, last_updated ASC) as rank_position
    FROM leaderboard_cache
  )
  UPDATE leaderboard_cache lc
  SET respect_rank = rr.rank_position
  FROM respect_rankings rr
  WHERE lc.player_id = rr.player_id;
  
  -- Territories sıralaması
  WITH territory_rankings AS (
    SELECT 
      player_id,
      ROW_NUMBER() OVER (ORDER BY territories DESC, level DESC, last_updated ASC) as rank_position
    FROM leaderboard_cache
  )
  UPDATE leaderboard_cache lc
  SET territories_rank = tr.rank_position
  FROM territory_rankings tr
  WHERE lc.player_id = tr.player_id;
  
  -- Son güncelleme zamanını ayarla
  UPDATE leaderboard_cache SET last_updated = now();
  
  RAISE LOG 'Leaderboard updated successfully with % players', (SELECT COUNT(*) FROM leaderboard_cache);
END;
$$ language 'plpgsql';

-- 4. Sıralama tipine göre veri dönen fonksiyon (güncellenmiş versiyon)
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
  territories integer
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
    lc.territories
  FROM leaderboard_cache lc
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

-- 5. Player stats güncellendiğinde leaderboard'u otomatik güncelle
CREATE OR REPLACE FUNCTION trigger_leaderboard_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Leaderboard'u asenkron olarak güncelle (performans için)
  PERFORM pg_notify('leaderboard_update', NEW.id::text);
  
  -- Basit güncelleme (gerçek zamanlı için)
  INSERT INTO leaderboard_cache (
    player_id, player_name, rank_name, level, respect, territories, profile_image
  )
  VALUES (
    NEW.id, NEW.username, NEW.rank, NEW.level, NEW.respect, NEW.territories, NEW.profile_image
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
$$ language 'plpgsql';

-- 6. Player stats trigger'ını oluştur
DROP TRIGGER IF EXISTS on_player_stats_updated ON player_stats;
CREATE TRIGGER on_player_stats_updated
  AFTER INSERT OR UPDATE ON player_stats
  FOR EACH ROW EXECUTE FUNCTION trigger_leaderboard_update();

-- 7. RLS politikası
CREATE POLICY "Allow all operations on leaderboard_cache" ON leaderboard_cache
  FOR ALL USING (true) WITH CHECK (true);

-- 8. İzinler
GRANT ALL ON leaderboard_cache TO authenticated;
GRANT ALL ON leaderboard_cache TO anon;

-- 9. İlk leaderboard verilerini oluştur
SELECT update_leaderboard();

-- 10. Real-time için publication
ALTER PUBLICATION supabase_realtime ADD TABLE leaderboard_cache;