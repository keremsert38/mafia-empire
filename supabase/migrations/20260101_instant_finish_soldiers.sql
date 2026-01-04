-- Function to instantly finish soldier training using Diamonds (MT Coins)
-- Cost: 1 Diamond per pending soldier

CREATE OR REPLACE FUNCTION rpc_finish_soldier_training_instantly()
RETURNS TABLE(success boolean, message text, soldiers_added integer, cost integer) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_queue record;
  v_elapsed_seconds integer;
  v_completed_so_far integer;
  v_training_pending integer;
  v_total_remaining_to_claim integer;
  v_cost integer;
  v_user_mt integer;
BEGIN
  -- Get queue info
  SELECT * INTO v_queue FROM soldier_production_queue WHERE user_id = v_user_id;

  IF NOT FOUND OR v_queue.soldiers_ordered <= v_queue.soldiers_completed THEN
    RETURN QUERY SELECT false, 'Üretimde asker yok.'::text, 0, 0;
    RETURN;
  END IF;

  -- Calculate pending based on time elapsed since start
  v_elapsed_seconds := EXTRACT(EPOCH FROM (now() - v_queue.production_start_time))::integer;
  -- Calculate how many have finished by time (virtual progress)
  v_completed_so_far := LEAST(v_queue.soldiers_ordered, v_elapsed_seconds / 100);
  
  -- Calculate soldiers that still need training time
  v_training_pending := v_queue.soldiers_ordered - v_completed_so_far;

  -- Cost is 1 Diamond per pending soldier
  IF v_training_pending <= 0 THEN
    v_cost := 0;
  ELSE
    v_cost := v_training_pending * 1;
  END IF;

  -- Check MT coins
  SELECT mt_coins INTO v_user_mt FROM player_stats WHERE id = v_user_id;

  IF v_user_mt < v_cost THEN
    RETURN QUERY SELECT false, format('Yetersiz Elmas! %s Elmas gerekli.', v_cost)::text, 0, v_cost;
    RETURN;
  END IF;

  -- Execute Transaction
  -- 1. Deduct MT Cost
  IF v_cost > 0 THEN
    UPDATE player_stats SET mt_coins = mt_coins - v_cost WHERE id = v_user_id;
  END IF;

  -- 2. Add Soldiers (All ordered minus what was already claimed in DB)
  v_total_remaining_to_claim := v_queue.soldiers_ordered - v_queue.soldiers_completed;
  
  IF v_total_remaining_to_claim > 0 THEN
    -- Update user_soldiers
    INSERT INTO user_soldiers (user_id, soldiers) VALUES (v_user_id, v_total_remaining_to_claim)
    ON CONFLICT (user_id) DO UPDATE SET soldiers = user_soldiers.soldiers + EXCLUDED.soldiers, updated_at = now();

    -- Update player_stats
    UPDATE player_stats SET soldiers = soldiers + v_total_remaining_to_claim WHERE id = v_user_id;
  END IF;

  -- 3. Clear Queue
  UPDATE soldier_production_queue
  SET soldiers_ordered = 0,
      soldiers_completed = 0,
      production_start_time = NULL,
      updated_at = now()
  WHERE user_id = v_user_id;

  RETURN QUERY SELECT true, format('%s asker eğitimi anında tamamlandı!', v_total_remaining_to_claim)::text, v_total_remaining_to_claim, v_cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
