-- Enable pg_net for HTTP requests (Push Notifications)
create extension if not exists "pg_net";

-- Add Push Token Column
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

-- Redefine rpc_attack_region with Notification + Sync Fix
CREATE OR REPLACE FUNCTION rpc_attack_region(p_region_id text, p_attackers_to_send integer)
RETURNS TABLE(success boolean, message text) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_soldiers integer;
  v_defender_soldiers integer;
  v_owner_id uuid;
  v_victim_token text;
  v_attacker_name text;
BEGIN
  -- 1. Get Attacker Stats (Check player_stats as primary source if available, or user_soldiers)
  -- We'll use user_soldiers as legacy, but ensure player_stats is utilized
  SELECT soldiers INTO v_user_soldiers FROM user_soldiers WHERE user_id = v_user_id;
  
  -- Fallback check on player_stats if user_soldiers is empty/missing
  IF v_user_soldiers IS NULL THEN
     SELECT soldiers INTO v_user_soldiers FROM player_stats WHERE id = v_user_id;
  END IF;

  IF v_user_soldiers IS NULL OR v_user_soldiers < p_attackers_to_send THEN
    RETURN QUERY SELECT false, 'Yetersiz asker!'::text;
    RETURN;
  END IF;

  -- 2. Get Defender Stats
  SELECT defender_soldiers, owner_user_id INTO v_defender_soldiers, v_owner_id FROM region_state WHERE region_id = p_region_id;
  
  IF v_owner_id = v_user_id THEN
    RETURN QUERY SELECT false, 'Kendi bölgenize saldıramazsınız!'::text;
    RETURN;
  END IF;

  -- 3. Execute Attack: Deduct Soldiers
  UPDATE user_soldiers SET soldiers = soldiers - p_attackers_to_send, updated_at = now() WHERE user_id = v_user_id;
  -- SYNC FIX: Update player_stats too
  UPDATE player_stats SET soldiers = soldiers - p_attackers_to_send WHERE id = v_user_id;

  -- 4. Calculate Outcome
  IF p_attackers_to_send >= (COALESCE(v_defender_soldiers, 0) * 1.5) THEN
    -- Success
    UPDATE region_state SET owner_user_id = v_user_id, defender_soldiers = GREATEST(0, p_attackers_to_send - COALESCE(v_defender_soldiers, 0)), updated_at = now() WHERE region_id = p_region_id;
    
    -- Notification to Victim (Owner Lost Region)
    IF v_owner_id IS NOT NULL THEN
        SELECT expo_push_token INTO v_victim_token FROM player_stats WHERE id = v_owner_id;
        IF v_victim_token IS NOT NULL THEN
            PERFORM net.http_post(
                url := 'https://exp.host/--/api/v2/push/send',
                body := jsonb_build_object(
                    'to', v_victim_token,
                    'title', '⚠️ BÖLGE KAYBEDİLDİ!',
                    'body', 'Bölgelerinden biri işgal edildi!',
                    'sound', 'default',
                    'data', jsonb_build_object('type', 'attack_loss', 'regionId', p_region_id)
                )
            );
        END IF;
    END IF;

    RETURN QUERY SELECT true, 'Bölge ele geçirildi!'::text;
  ELSE
    -- Fail
    UPDATE region_state SET defender_soldiers = GREATEST(0, COALESCE(defender_soldiers, 0) - (p_attackers_to_send / 2)), updated_at = now() WHERE region_id = p_region_id;
    
    -- Notification to Victim (Defended Successfully)
    IF v_owner_id IS NOT NULL THEN
        SELECT expo_push_token INTO v_victim_token FROM player_stats WHERE id = v_owner_id;
        IF v_victim_token IS NOT NULL THEN
            PERFORM net.http_post(
                url := 'https://exp.host/--/api/v2/push/send',
                body := jsonb_build_object(
                    'to', v_victim_token,
                    'title', '🛡️ SALDIRI PÜSKÜRTÜLDÜ!',
                    'body', 'Bölgenize yapılan saldırıyı savundunuz.',
                    'sound', 'default',
                    'data', jsonb_build_object('type', 'attack_defend', 'regionId', p_region_id)
                )
            );
        END IF;
    END IF;

    RETURN QUERY SELECT false, 'Saldırı başarısız!'::text;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
