/*
  # Sıralama Sistemi - Database Tabanlı Leaderboard

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
    - reputation: İtibar sıralaması
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
  reputation integer NOT NULL,
  profile_image text,
  position_level integer,
  position_respect integer,
  position_territories integer,
  position_reputation integer,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(player_id)
);

-- 2. Performans için indexler
CREATE INDEX IF NOT EXISTS idx_leaderboard_level ON leaderboard_cache(level DESC, last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_respect ON leaderboard_cache(respect DESC, last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_territories ON leaderboard_cache(territories DESC, last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_reputation ON leaderboard_cache(reputation DESC, last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_player_id ON leaderboard_cache(player_id);

-- 3. Leaderboard güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_leaderboard()
RETURNS void AS $$
BEGIN
  -- Önce mevcut cache'i temizle
  DELETE FROM leaderboard_cache;
  
  -- Tüm aktif oyuncuları leaderboard'a ekle
  INSERT INTO leaderboard_cache (
    player_id, player_name, rank_name, level, respect, territories, reputation, profile_image
  )
  SELECT 
    ps.id,
    ps.username,
    ps.rank,
    ps.level,
    ps.respect,
    ps.territories,
    ps.reputation,
    ps.profile_image
  FROM player_stats ps
  WHERE ps.level > 0 -- Sadece aktif oyuncular
  ORDER BY ps.level DESC, ps.respect DESC;
  
  -- Pozisyonları hesapla ve güncelle
  
  -- Level pozisyonları
  WITH level_rankings AS (
    SELECT 
      player_id,
      ROW_NUMBER() OVER (ORDER BY level DESC, respect DESC, last_updated ASC) as position
    FROM leaderboard_cache
  )
  UPDATE leaderboard_cache lc
  SET position_level = lr.position
  FROM level_rankings lr
  WHERE lc.player_id = lr.player_id;
  
  -- Respect pozisyonları
  WITH respect_rankings AS (
    SELECT 
      player_id,
      ROW_NUMBER() OVER (ORDER BY respect DESC, level DESC, last_updated ASC) as position
    FROM leaderboard_cache
  )
  UPDATE leaderboard_cache lc
  SET position_respect = rr.position
  FROM respect_rankings rr
  WHERE lc.player_id = rr.player_id;
  
  -- Territories pozisyonları
  WITH territory_rankings AS (
    SELECT 
      player_id,
      ROW_NUMBER() OVER (ORDER BY territories DESC, level DESC, last_updated ASC) as position
    FROM leaderboard_cache
  )
  UPDATE leaderboard_cache lc
  SET position_territories = tr.position
  FROM territory_rankings tr
  WHERE lc.player_id = tr.player_id;
  
  -- Reputation pozisyonları
  WITH reputation_rankings AS (
    SELECT 
      player_id,
      ROW_NUMBER() OVER (ORDER BY reputation DESC, level DESC, last_updated ASC) as position
    FROM leaderboard_cache
  )
  UPDATE leaderboard_cache lc
  SET position_reputation = repr.position
  FROM reputation_rankings repr
  WHERE lc.player_id = repr.player_id;
  
  -- Son güncelleme zamanını ayarla
  UPDATE leaderboard_cache SET last_updated = now();
  
  RAISE LOG 'Leaderboard updated successfully';
END;
$$ language 'plpgsql';

-- 4. Sıralama tipine göre veri dönen fonksiyon
CREATE OR REPLACE FUNCTION get_leaderboard_by_type(leaderboard_type text, limit_count integer DEFAULT 100)
RETURNS TABLE (
  id uuid,
  player_name text,
  rank_name text,
  level integer,
  score integer,
  position integer,
  profile_image text,
  reputation integer,
  territories integer
) AS $$
BEGIN
  CASE leaderboard_type
    WHEN 'level' THEN
      RETURN QUERY
      SELECT 
        lc.player_id as id,
        lc.player_name,
        lc.rank_name,
        lc.level,
        lc.level as score,
        lc.position_level as position,
        lc.profile_image,
        lc.reputation,
        lc.territories
      FROM leaderboard_cache lc
      ORDER BY lc.position_level ASC
      LIMIT limit_count;
      
    WHEN 'respect' THEN
      RETURN QUERY
      SELECT 
        lc.player_id as id,
        lc.player_name,
        lc.rank_name,
        lc.level,
        lc.respect as score,
        lc.position_respect as position,
        lc.profile_image,
        lc.reputation,
        lc.territories
      FROM leaderboard_cache lc
      ORDER BY lc.position_respect ASC
      LIMIT limit_count;
      
    WHEN 'territories' THEN
      RETURN QUERY
      SELECT 
        lc.player_id as id,
        lc.player_name,
        lc.rank_name,
        lc.level,
        lc.territories as score,
        lc.position_territories as position,
        lc.profile_image,
        lc.reputation,
        lc.territories
      FROM leaderboard_cache lc
      ORDER BY lc.position_territories ASC
      LIMIT limit_count;
      
    WHEN 'reputation' THEN
      RETURN QUERY
      SELECT 
        lc.player_id as id,
        lc.player_name,
        lc.rank_name,
        lc.level,
        lc.reputation as score,
        lc.position_reputation as position,
        lc.profile_image,
        lc.reputation,
        lc.territories
      FROM leaderboard_cache lc
      ORDER BY lc.position_reputation ASC
      LIMIT limit_count;
      
    ELSE
      -- Default olarak level sıralaması döner
      RETURN QUERY
      SELECT 
        lc.player_id as id,
        lc.player_name,
        lc.rank_name,
        lc.level,
        lc.level as score,
        lc.position_level as position,
        lc.profile_image,
        lc.reputation,
        lc.territories
      FROM leaderboard_cache lc
      ORDER BY lc.position_level ASC
      LIMIT limit_count;
  END CASE;
END;
$$ language 'plpgsql';

-- 5. Player stats güncellendiğinde leaderboard'u otomatik güncelle
CREATE OR REPLACE FUNCTION trigger_leaderboard_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Leaderboard'u asenkron olarak güncelle (performans için)
  PERFORM pg_notify('leaderboard_update', NEW.id::text);
  
  -- Basit güncelleme (gerçek zamanlı için)
  INSERT INTO leaderboard_cache (
    player_id, player_name, rank_name, level, respect, territories, reputation, profile_image
  )
  VALUES (
    NEW.id, NEW.username, NEW.rank, NEW.level, NEW.respect, NEW.territories, NEW.reputation, NEW.profile_image
  )
  ON CONFLICT (player_id) DO UPDATE SET
    player_name = EXCLUDED.player_name,
    rank_name = EXCLUDED.rank_name,
    level = EXCLUDED.level,
    respect = EXCLUDED.respect,
    territories = EXCLUDED.territories,
    reputation = EXCLUDED.reputation,
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