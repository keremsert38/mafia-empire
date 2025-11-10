/*
  # Sıralama Kategorilerini Güncelle - Sadece Level, Respect, Territories

  1. Değişiklikler
    - İtibar (reputation) sıralamasını kaldır
    - Sadece seviye, saygı ve bölge sıralamaları kalsın
    - Fonksiyonları güncelle
    
  2. Sıralama Kategorileri
    - level: Seviye sıralaması
    - respect: Saygı sıralaması  
    - territories: Bölge sıralaması
*/

-- 1. Leaderboard fonksiyonunu güncelle - sadece 3 kategori
CREATE OR REPLACE FUNCTION get_leaderboard_by_type(leaderboard_type text, limit_count integer DEFAULT 100)
RETURNS TABLE (
  id uuid,
  player_name text,
  rank_name text,
  level integer,
  score integer,
  position integer,
  profile_image text,
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
        lc.territories
      FROM leaderboard_cache lc
      ORDER BY lc.position_territories ASC
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
        lc.territories
      FROM leaderboard_cache lc
      ORDER BY lc.position_level ASC
      LIMIT limit_count;
  END CASE;
END;
$$ language 'plpgsql';

-- 2. Leaderboard güncelleme fonksiyonunu optimize et
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
  
  -- Son güncelleme zamanını ayarla
  UPDATE leaderboard_cache SET last_updated = now();
  
  RAISE LOG 'Leaderboard updated successfully with 3 categories';
END;
$$ language 'plpgsql';

-- 3. İlk leaderboard verilerini oluştur
SELECT update_leaderboard();