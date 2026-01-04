-- FINAL SOLDIER SYNC FIX + BARETTA IMAGE UPDATE

-- 1. Fix rpc_check_soldier_production to sync with player_stats
CREATE OR REPLACE FUNCTION rpc_check_soldier_production()
RETURNS TABLE(
  soldiers_added integer,
  soldiers_pending integer,
  seconds_remaining integer,
  message text
) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_queue record;
  v_elapsed_seconds integer;
  v_completed_now integer;
  v_total_completed integer;
  v_pending integer;
  v_seconds_for_pending integer;
BEGIN
  SELECT * INTO v_queue
  FROM soldier_production_queue
  WHERE user_id = v_user_id;
  
  IF NOT FOUND OR v_queue.soldiers_ordered <= v_queue.soldiers_completed THEN
    RETURN QUERY SELECT 0, 0, 0, 'Üretimde soldato yok.';
    RETURN;
  END IF;
  
  v_elapsed_seconds := EXTRACT(EPOCH FROM (now() - v_queue.production_start_time))::integer;
  v_total_completed := LEAST(v_queue.soldiers_ordered, v_elapsed_seconds / 100);
  v_completed_now := v_total_completed - v_queue.soldiers_completed;
  v_pending := v_queue.soldiers_ordered - v_total_completed;
  v_seconds_for_pending := CASE WHEN v_pending > 0 THEN
    (v_total_completed + 1) * 100 - v_elapsed_seconds
  ELSE 0 END;
  
  IF v_completed_now > 0 THEN
    -- Update user_soldiers
    INSERT INTO user_soldiers (user_id, soldiers)
    VALUES (v_user_id, v_completed_now)
    ON CONFLICT (user_id)
    DO UPDATE SET soldiers = user_soldiers.soldiers + EXCLUDED.soldiers, updated_at = now();

    -- CRITICAL: Also update player_stats!
    UPDATE player_stats
    SET soldiers = soldiers + v_completed_now
    WHERE id = v_user_id;
    
    -- Update queue
    UPDATE soldier_production_queue
    SET soldiers_completed = v_total_completed,
        last_check_time = now(),
        updated_at = now()
    WHERE user_id = v_user_id;
    
    -- Reset if complete
    IF v_pending = 0 THEN
      UPDATE soldier_production_queue
      SET soldiers_ordered = 0,
          soldiers_completed = 0,
          production_start_time = NULL,
          updated_at = now()
      WHERE user_id = v_user_id;
    END IF;
  END IF;
  
  RETURN QUERY SELECT 
    v_completed_now,
    v_pending,
    GREATEST(0, v_seconds_for_pending),
    CASE WHEN v_completed_now > 0 THEN
      format('%s soldato üretimi tamamlandı!', v_completed_now)
    ELSE
      format('%s soldato üretiliyor, kalan: %s saniye', v_pending, v_seconds_for_pending)
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update Baretta image (gun image)
UPDATE items 
SET image_url = 'https://cdn-icons-png.flaticon.com/128/1529/1529117.png'
WHERE name = 'Baretta 9mm';
