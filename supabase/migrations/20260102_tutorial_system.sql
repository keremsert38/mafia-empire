-- Tutorial Sistemi
-- Yeni oyuncular için adım adım rehber

-- 1. player_stats'a tutorial kolonları ekle
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS tutorial_step INTEGER DEFAULT 0;
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS tutorial_completed BOOLEAN DEFAULT false;

-- 2. Tutorial tamamlama ödülü veren fonksiyon
CREATE OR REPLACE FUNCTION rpc_complete_tutorial()
RETURNS TABLE(success BOOLEAN, message TEXT, reward_cash INTEGER) AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_completed BOOLEAN;
  v_reward INTEGER := 1000; -- $1000 ödül
BEGIN
  -- Zaten tamamlanmış mı kontrol et
  SELECT tutorial_completed INTO v_completed
  FROM player_stats
  WHERE id = v_user_id;
  
  IF v_completed = TRUE THEN
    RETURN QUERY SELECT FALSE, 'Tutorial zaten tamamlandı.'::TEXT, 0;
    RETURN;
  END IF;
  
  -- Tutorial'ı tamamla ve ödül ver
  UPDATE player_stats
  SET 
    tutorial_completed = TRUE,
    tutorial_step = 7,
    cash = cash + v_reward
  WHERE id = v_user_id;
  
  RETURN QUERY SELECT TRUE, format('Tebrikler! $%s ödül kazandınız!', v_reward)::TEXT, v_reward;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Tutorial adımını güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION rpc_update_tutorial_step(p_step INTEGER)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_current_step INTEGER;
BEGIN
  SELECT tutorial_step INTO v_current_step
  FROM player_stats
  WHERE id = v_user_id;
  
  -- Sadece ilerleme varsa güncelle
  IF p_step > v_current_step THEN
    UPDATE player_stats
    SET tutorial_step = p_step
    WHERE id = v_user_id;
    
    RETURN QUERY SELECT TRUE, format('Adım %s tamamlandı!', p_step)::TEXT;
  ELSE
    RETURN QUERY SELECT FALSE, 'Adım zaten tamamlanmış.'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Tutorial atlama fonksiyonu
CREATE OR REPLACE FUNCTION rpc_skip_tutorial()
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  UPDATE player_stats
  SET 
    tutorial_completed = TRUE,
    tutorial_step = 7
  WHERE id = v_user_id;
  
  RETURN QUERY SELECT TRUE, 'Tutorial atlandı.'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
