-- PvP Cooldown Sistemi
-- 1. Saldıran 3 saat boyunca tekrar saldıramaz (ama saldırı alabilir)
-- 2. Savunan 3 saat boyunca saldırı alamaz (ama saldırabilir)

-- 1. Kolonları ekle
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS last_attack_time TIMESTAMPTZ;
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS last_defend_time TIMESTAMPTZ;

-- 2. rpc_attack_player fonksiyonunu güncelle (Güç sistemi + Cooldown)
CREATE OR REPLACE FUNCTION rpc_attack_player(
  p_target_player_id uuid,
  p_soldiers_to_send integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attacker_id uuid;
  v_attacker_name text;
  v_attacker_soldiers integer;
  v_attacker_weapons integer;
  v_attacker_cash bigint;
  v_attacker_battles_won integer;
  v_attacker_battles_lost integer;
  v_attacker_last_attack timestamptz;
  
  v_defender_soldiers integer;
  v_defender_weapons integer;
  v_defender_cash bigint;
  v_defender_name text;
  v_defender_battles_lost integer;
  v_defender_token text;
  v_defender_last_defend timestamptz;
  
  v_attacker_power integer;
  v_defender_power integer;
  v_attacker_armed integer;
  v_attacker_unarmed integer;
  v_defender_armed integer;
  v_defender_unarmed integer;
  
  v_success boolean;
  v_power_difference integer;
  v_cash_reward bigint;
  
  v_attacker_loss integer;
  v_defender_loss integer;
  v_attacker_remaining integer;
  v_defender_remaining integer;
  
  v_result jsonb;
  v_cooldown_remaining interval;
BEGIN
  v_attacker_id := auth.uid();
  
  IF v_attacker_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Kullanıcı bulunamadı!');
  END IF;
  
  IF v_attacker_id = p_target_player_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Kendinize saldıramazsınız!');
  END IF;
  
  -- Saldıran bilgileri
  SELECT username, soldiers, COALESCE(weapon, 0), cash, battles_won, battles_lost, last_attack_time
  INTO v_attacker_name, v_attacker_soldiers, v_attacker_weapons, v_attacker_cash, v_attacker_battles_won, v_attacker_battles_lost, v_attacker_last_attack
  FROM player_stats
  WHERE id = v_attacker_id;
  
  -- COOLDOWN KONTROLÜ: Saldıran
  IF v_attacker_last_attack IS NOT NULL AND (now() - v_attacker_last_attack) < interval '3 hours' THEN
    v_cooldown_remaining := (v_attacker_last_attack + interval '3 hours') - now();
    RETURN jsonb_build_object(
      'success', false, 
      'message', format('Saldırı yorgunusunuz! %s dakika sonra tekrar saldırabilirsiniz.', EXTRACT(MINUTE FROM v_cooldown_remaining)::int + (EXTRACT(HOUR FROM v_cooldown_remaining)::int * 60))
    );
  END IF;
  
  -- Savunucu bilgileri
  SELECT username, soldiers, COALESCE(weapon, 0), cash, battles_lost, expo_push_token, last_defend_time
  INTO v_defender_name, v_defender_soldiers, v_defender_weapons, v_defender_cash, v_defender_battles_lost, v_defender_token, v_defender_last_defend
  FROM player_stats
  WHERE id = p_target_player_id;
  
  IF v_defender_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Hedef oyuncu bulunamadı!');
  END IF;
  
  -- COOLDOWN KONTROLÜ: Savunan (Koruma)
  IF v_defender_last_defend IS NOT NULL AND (now() - v_defender_last_defend) < interval '3 hours' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Bu oyuncu saldırı koruması altında!');
  END IF;
  
  IF p_soldiers_to_send > v_attacker_soldiers THEN
    RETURN jsonb_build_object('success', false, 'message', format('Yetersiz asker! %s askeriniz var.', v_attacker_soldiers));
  END IF;
  
  IF p_soldiers_to_send <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'En az 1 asker göndermelisiniz!');
  END IF;
  
  -- ===== GÜÇ HESAPLA =====
  -- Saldıran gücü (gönderdiği askerlerin oranına göre silah dağılımı)
  v_attacker_armed := LEAST(p_soldiers_to_send, FLOOR(v_attacker_weapons::float * p_soldiers_to_send / GREATEST(v_attacker_soldiers, 1))::integer);
  v_attacker_unarmed := p_soldiers_to_send - v_attacker_armed;
  v_attacker_power := (v_attacker_armed * 6) + (v_attacker_unarmed * 5);
  
  -- Savunucu gücü
  v_defender_armed := LEAST(v_defender_soldiers, v_defender_weapons);
  v_defender_unarmed := v_defender_soldiers - v_defender_armed;
  v_defender_power := (v_defender_armed * 6) + (v_defender_unarmed * 5);
  
  -- ===== KAZANAN BELİRLE =====
  -- Gücü fazla olan kazanır
  v_success := v_attacker_power > v_defender_power;
  v_power_difference := ABS(v_attacker_power - v_defender_power);
  
  -- ===== KAYIPLAR VE ÖDÜL =====
  IF v_success THEN
    -- Saldırgan kazandı
    v_defender_loss := v_defender_soldiers; -- Savunucu TÜM askerlerini kaybeder
    v_defender_remaining := 0;
    v_attacker_loss := FLOOR(v_defender_soldiers * 0.5)::integer; -- Saldırgan yarısını kaybeder
    v_attacker_remaining := GREATEST(0, p_soldiers_to_send - v_attacker_loss);
    
    -- ÖDÜL: Kazananın gücü × 100
    v_cash_reward := v_attacker_power * 100;
  ELSE
    -- Savunucu kazandı - ÖDÜL YOK
    v_attacker_loss := p_soldiers_to_send; -- Saldırgan TÜM gönderdiği askerleri kaybeder
    v_attacker_remaining := 0;
    v_defender_loss := FLOOR(p_soldiers_to_send * 0.5)::integer; -- Savunucu yarısını kaybeder
    v_defender_remaining := GREATEST(0, v_defender_soldiers - v_defender_loss);
    
    -- Savunucu kazanınca ödül YOK
    v_cash_reward := 0;
  END IF;
  
  -- ===== SALDIRGAN GÜNCELLE =====
  UPDATE player_stats
  SET 
    soldiers = v_attacker_soldiers - p_soldiers_to_send + v_attacker_remaining,
    cash = CASE WHEN v_success THEN cash + v_cash_reward ELSE cash END,
    battles_won = CASE WHEN v_success THEN battles_won + 1 ELSE battles_won END,
    battles_lost = CASE WHEN NOT v_success THEN battles_lost + 1 ELSE battles_lost END,
    last_attack_time = now(), -- Saldırı yaptığı için süre başlar
    updated_at = now()
  WHERE id = v_attacker_id;
  
  UPDATE user_soldiers
  SET 
    soldiers = v_attacker_soldiers - p_soldiers_to_send + v_attacker_remaining,
    updated_at = now()
  WHERE user_id = v_attacker_id;
  
  -- ===== SAVUNUCU GÜNCELLE =====
  UPDATE player_stats
  SET 
    soldiers = v_defender_remaining,
    battles_lost = CASE WHEN v_success THEN battles_lost + 1 ELSE battles_lost END,
    last_defend_time = now(), -- Saldırı yediği için koruma başlar
    updated_at = now()
  WHERE id = p_target_player_id;
  
  UPDATE user_soldiers
  SET 
    soldiers = v_defender_remaining,
    updated_at = now()
  WHERE user_id = p_target_player_id;
  
  -- ===== İN-APP BİLDİRİM =====
  INSERT INTO player_notifications (player_id, type, title, message, data)
  VALUES (
    p_target_player_id,
    'attack',
    CASE WHEN v_success THEN '⚔️ Saldırıya Uğradınız!' ELSE '🛡️ Savunma Başarılı!' END,
    CASE 
      WHEN v_success THEN format('%s saldırısında yenildiniz!
Güç: %s vs %s
💀 TÜM askerlerinizi kaybettiniz (%s asker)', v_attacker_name, v_attacker_power, v_defender_power, v_defender_loss)
      ELSE format('%s saldırısını püskürttünüz!
Güç: %s vs %s
🛡️ Kalan asker: %s', v_attacker_name, v_defender_power, v_attacker_power, v_defender_remaining)
    END,
    jsonb_build_object(
      'attacker_id', v_attacker_id,
      'attacker_name', v_attacker_name,
      'success', v_success,
      'attacker_power', v_attacker_power,
      'defender_power', v_defender_power,
      'cash_reward', v_cash_reward
    )
  );
  
  -- ===== PUSH NOTIFICATION =====
  IF v_defender_token IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := jsonb_build_object(
        'to', v_defender_token,
        'title', CASE WHEN v_success THEN '⚔️ SALDIRIYA UĞRADINIZ!' ELSE '🛡️ SAVUNMA BAŞARILI!' END,
        'body', CASE 
          WHEN v_success THEN format('%s size saldırdı ve kazandı! Güç: %s vs %s', v_attacker_name, v_attacker_power, v_defender_power)
          ELSE format('%s saldırısını püskürttünüz! Kalan asker: %s', v_attacker_name, v_defender_remaining)
        END,
        'sound', 'default',
        'data', jsonb_build_object('type', 'player_attack', 'attackerId', v_attacker_id)
      )
    );
  END IF;
  
  -- ===== SONUÇ =====
  v_result := jsonb_build_object(
    'success', v_success,
    'message', CASE 
      WHEN v_success THEN format('🎉 Saldırı başarılı!

%s oyuncusuna karşı kazandınız!
⚔️ Sizin Güç: %s | Rakip Güç: %s
💰 Ödül: $%s
💀 Kaybettiğiniz asker: %s
✅ Kalan askeriniz: %s
⏳ 3 saat boyunca tekrar saldıramazsınız.', 
        v_defender_name, v_attacker_power, v_defender_power, v_cash_reward, v_attacker_loss, v_attacker_remaining)
      ELSE format('💥 Saldırı başarısız!

%s savunmayı kazandı!
🛡️ Rakip Güç: %s | Sizin Güç: %s
💀 TÜM gönderdiğiniz askerler yok oldu (%s asker)
⏳ 3 saat boyunca tekrar saldıramazsınız.', 
        v_defender_name, v_defender_power, v_attacker_power, v_attacker_loss)
    END,
    'cashStolen', CASE WHEN v_success THEN v_cash_reward ELSE 0 END,
    'soldiersLost', v_attacker_loss,
    'attackerPower', v_attacker_power,
    'defenderPower', v_defender_power
  );
  
  RETURN v_result;
END;
$$;
