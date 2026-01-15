-- =====================================================
-- GÜÇ SIRALAMASI VE CHAT LİMİTİ
-- =====================================================

-- 1. GÜÇ SIRALAMASI EKLEMESİ
-- Güç = Seviye + Silah Gücü + Asker Sayısı hesabıyla

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
  ELSIF leaderboard_type = 'power' THEN
    -- GÜÇ SIRALAMASI
    -- Güç = (Level * 100) + (Asker Sayısı * 10) + (Silah Gücü * 50)
    RETURN QUERY
    SELECT 
      ps.id,
      ps.username,
      COALESCE(ps.rank, 'Savaşçı')::TEXT,
      ps.level::INTEGER,
      (
        (ps.level * 100) + 
        (COALESCE(us.soldiers, 0) * 10) + 
        (COALESCE(ps.ak47, 0) * 50) + 
        (COALESCE(ps.baretta, 0) * 20)
      )::BIGINT as score,
      ROW_NUMBER() OVER (ORDER BY 
        (ps.level * 100) + 
        (COALESCE(us.soldiers, 0) * 10) + 
        (COALESCE(ps.ak47, 0) * 50) + 
        (COALESCE(ps.baretta, 0) * 20) 
      DESC)::BIGINT,
      ps.profile_image,
      COALESCE((SELECT COUNT(*)::INTEGER FROM region_state WHERE owner_user_id = ps.id), 0)::INTEGER,
      TRUE,
      NOW(),
      0
    FROM player_stats ps
    LEFT JOIN user_soldiers us ON us.user_id = ps.id
    ORDER BY (
      (ps.level * 100) + 
      (COALESCE(us.soldiers, 0) * 10) + 
      (COALESCE(ps.ak47, 0) * 50) + 
      (COALESCE(ps.baretta, 0) * 20)
    ) DESC
    LIMIT limit_count;
  ELSE
    -- Level sıralaması (varsayılan)
    RETURN QUERY
    SELECT 
      ps.id,
      ps.username,
      COALESCE(ps.rank, 'Soldato')::TEXT,
      ps.level::INTEGER,
      ps.level::BIGINT as score,
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

-- =====================================================
-- 2. CHAT MESAJ LİMİTİ (50 MESAJ)
-- =====================================================

-- Eski mesajları silen trigger fonksiyonu
CREATE OR REPLACE FUNCTION cleanup_old_chat_messages()
RETURNS TRIGGER AS $$
DECLARE
  v_message_count INTEGER;
  v_delete_count INTEGER;
BEGIN
  -- Toplam mesaj sayısını al
  SELECT COUNT(*) INTO v_message_count FROM chat_messages;
  
  -- 50'den fazla mesaj varsa en eskileri sil
  IF v_message_count > 50 THEN
    v_delete_count := v_message_count - 50;
    
    DELETE FROM chat_messages
    WHERE id IN (
      SELECT id FROM chat_messages
      ORDER BY created_at ASC
      LIMIT v_delete_count
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı oluştur (Her yeni mesajda çalışır)
DROP TRIGGER IF EXISTS trigger_cleanup_old_messages ON chat_messages;

CREATE TRIGGER trigger_cleanup_old_messages
  AFTER INSERT ON chat_messages
  FOR EACH STATEMENT
  EXECUTE FUNCTION cleanup_old_chat_messages();

-- İlk temizlik (mevcut fazla mesajları sil)
DO $$
DECLARE
  v_message_count INTEGER;
  v_delete_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_message_count FROM chat_messages;
  
  IF v_message_count > 50 THEN
    v_delete_count := v_message_count - 50;
    
    DELETE FROM chat_messages
    WHERE id IN (
      SELECT id FROM chat_messages
      ORDER BY created_at ASC
      LIMIT v_delete_count
    );
    
    RAISE NOTICE 'Silinen mesaj sayısı: %', v_delete_count;
  END IF;
END $$;
