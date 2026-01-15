-- =====================================================
-- SIRALAMA EKRANI GÜNCELLEMESİ
-- Profile fotoğrafı, level, bölge sayısı destekli
-- =====================================================

-- Eski fonksiyonu sil
DROP FUNCTION IF EXISTS get_leaderboard_by_type(TEXT, INTEGER);

-- Yeni fonksiyon: profile_image ve territories dahil
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
    -- Bölge sıralaması
    RETURN QUERY
    SELECT 
      ps.id,
      ps.username,
      COALESCE(ps.rank, 'Bölge Lordu')::TEXT,
      ps.level::INTEGER,
      COUNT(rs.region_id)::BIGINT as score,
      ROW_NUMBER() OVER (ORDER BY COUNT(rs.region_id) DESC, ps.level DESC)::BIGINT,
      ps.profile_image,
      COUNT(rs.region_id)::INTEGER,
      TRUE,
      NOW(),
      0
    FROM player_stats ps
    LEFT JOIN region_state rs ON rs.owner_user_id = ps.id
    GROUP BY ps.id, ps.username, ps.rank, ps.level, ps.profile_image
    ORDER BY COUNT(rs.region_id) DESC, ps.level DESC
    LIMIT limit_count;
  ELSE
    -- Level sıralaması (score = level olarak gösterilecek)
    RETURN QUERY
    SELECT 
      ps.id,
      ps.username,
      COALESCE(ps.rank, 'Soldato')::TEXT,
      ps.level::INTEGER,
      ps.level::BIGINT as score, -- XP yerine Level
      ROW_NUMBER() OVER (ORDER BY ps.level DESC, ps.experience DESC)::BIGINT,
      ps.profile_image,
      COALESCE((SELECT COUNT(*)::INTEGER FROM region_state WHERE owner_user_id = ps.id), 0)::INTEGER,
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
