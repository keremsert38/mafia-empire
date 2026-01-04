/*
  # Güç Bazlı Savaş Sistemi (Power-Based Combat)
  
  Değişiklikler:
  1. Bölge savaşları artık soldato sayısı yerine GÜÇ değerine göre hesaplanıyor
  2. Her soldato = 5 güç
  3. Silahlı soldato = 6 güç (+1 bonus)
  4. rpc_reinforce_region - sınır kaldırıldı
  5. rpc_attack_region - güç bazlı mücadele
*/

-- Güç hesaplama fonksiyonu (player_stats'tan weapon kolonunu kullanır)
CREATE OR REPLACE FUNCTION calculate_player_power(p_user_id uuid)
RETURNS TABLE(
  total_soldiers integer,
  armed_soldiers integer,
  unarmed_soldiers integer,
  total_power integer
) AS $$
DECLARE
  v_soldiers integer;
  v_weapons integer;
  v_armed integer;
  v_unarmed integer;
  v_power integer;
BEGIN
  -- Asker ve silah sayısını al
  SELECT COALESCE(ps.soldiers, 0), COALESCE(ps.weapon, 0)
  INTO v_soldiers, v_weapons
  FROM player_stats ps
  WHERE ps.id = p_user_id;
  
  IF v_soldiers IS NULL THEN
    v_soldiers := 0;
    v_weapons := 0;
  END IF;
  
  -- Silahlı asker sayısı (minimum silah veya asker)
  v_armed := LEAST(v_soldiers, v_weapons);
  v_unarmed := v_soldiers - v_armed;
  
  -- Güç hesaplama: silahlı × 6 + silahsız × 5
  v_power := (v_armed * 6) + (v_unarmed * 5);
  
  RETURN QUERY SELECT v_soldiers, v_armed, v_unarmed, v_power;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bölge savunma gücü hesaplama (NPC bölgeleri için sabit güç)
CREATE OR REPLACE FUNCTION calculate_region_power(p_region_id text)
RETURNS integer AS $$
DECLARE
  v_defender_soldiers integer;
BEGIN
  SELECT COALESCE(defender_soldiers, 0)
  INTO v_defender_soldiers
  FROM region_state
  WHERE region_id = p_region_id;
  
  -- NPC bölgeler için tüm askerler 5 güç
  RETURN v_defender_soldiers * 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Güncellenmiş rpc_attack_region - GÜÇ BAZLI
CREATE OR REPLACE FUNCTION rpc_attack_region(p_region_id text, p_attackers_to_send integer)
RETURNS TABLE(success boolean, message text) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_soldiers integer;
  v_user_weapons integer;
  v_defender_soldiers integer;
  v_owner_id uuid;
  v_victim_token text;
  v_attacker_power integer;
  v_defender_power integer;
  v_armed_count integer;
  v_unarmed_count integer;
BEGIN
  -- 1. Saldıran oyuncunun asker ve silah sayısını al
  SELECT COALESCE(soldiers, 0), COALESCE(weapon, 0)
  INTO v_user_soldiers, v_user_weapons
  FROM player_stats WHERE id = v_user_id;
  
  IF v_user_soldiers IS NULL THEN
    SELECT soldiers INTO v_user_soldiers FROM user_soldiers WHERE user_id = v_user_id;
    v_user_weapons := 0;
  END IF;
  
  IF v_user_soldiers IS NULL OR v_user_soldiers < p_attackers_to_send THEN
    RETURN QUERY SELECT false, 'Yetersiz asker!'::text;
    RETURN;
  END IF;
  
  -- 2. Savunucu bilgilerini al
  SELECT defender_soldiers, owner_user_id 
  INTO v_defender_soldiers, v_owner_id 
  FROM region_state WHERE region_id = p_region_id;
  
  IF v_owner_id = v_user_id THEN
    RETURN QUERY SELECT false, 'Kendi bölgenize saldıramazsınız!'::text;
    RETURN;
  END IF;
  
  -- 3. SALDIRAN GÜCÜNÜ HESAPLA
  -- Silahlı asker sayısını orantılı olarak dağıt
  v_armed_count := LEAST(p_attackers_to_send, FLOOR(v_user_weapons::float * p_attackers_to_send / GREATEST(v_user_soldiers, 1))::integer);
  v_unarmed_count := p_attackers_to_send - v_armed_count;
  v_attacker_power := (v_armed_count * 6) + (v_unarmed_count * 5);
  
  -- 4. SAVUNUCU GÜCÜNÜ HESAPLA (NPC için 5 güç/asker)
  IF v_owner_id IS NULL THEN
    -- NPC bölgesi
    v_defender_power := COALESCE(v_defender_soldiers, 0) * 5;
  ELSE
    -- Oyuncu bölgesi - silah bonusu ekle
    DECLARE
      v_defender_weapons integer;
      v_defender_armed integer;
      v_defender_unarmed integer;
    BEGIN
      SELECT COALESCE(weapon, 0) INTO v_defender_weapons FROM player_stats WHERE id = v_owner_id;
      v_defender_armed := LEAST(COALESCE(v_defender_soldiers, 0), v_defender_weapons);
      v_defender_unarmed := COALESCE(v_defender_soldiers, 0) - v_defender_armed;
      v_defender_power := (v_defender_armed * 6) + (v_defender_unarmed * 5);
    END;
  END IF;
  
  -- 5. Askerleri düş
  UPDATE user_soldiers SET soldiers = soldiers - p_attackers_to_send, updated_at = now() WHERE user_id = v_user_id;
  UPDATE player_stats SET soldiers = soldiers - p_attackers_to_send WHERE id = v_user_id;
  
  -- 6. SAVAŞ SONUCU (Saldırı gücü >= Savunma gücü × 1.2 ise başarılı)
  IF v_attacker_power >= (v_defender_power * 1.2) THEN
    -- Başarılı - kalan askerler (güç farkına göre)
    DECLARE
      v_surviving_soldiers integer;
    BEGIN
      v_surviving_soldiers := GREATEST(0, p_attackers_to_send - FLOOR(v_defender_soldiers * 0.5)::integer);
      UPDATE region_state SET owner_user_id = v_user_id, defender_soldiers = v_surviving_soldiers, updated_at = now() WHERE region_id = p_region_id;
    END;
    
    -- Push Notification
    IF v_owner_id IS NOT NULL THEN
      SELECT expo_push_token INTO v_victim_token FROM player_stats WHERE id = v_owner_id;
      IF v_victim_token IS NOT NULL THEN
        PERFORM net.http_post(
          url := 'https://exp.host/--/api/v2/push/send',
          body := jsonb_build_object(
            'to', v_victim_token,
            'title', '⚠️ BÖLGE KAYBEDİLDİ!',
            'body', format('Bölgeniz ele geçirildi! Güç: %s vs %s', v_attacker_power, v_defender_power),
            'sound', 'default',
            'data', jsonb_build_object('type', 'attack_loss', 'regionId', p_region_id)
          )
        );
      END IF;
    END IF;
    
    RETURN QUERY SELECT true, format('Bölge ele geçirildi! Saldırı Gücü: %s vs Savunma: %s', v_attacker_power, v_defender_power)::text;
  ELSE
    -- Başarısız - savunucunun asker kaybı (güç oranına göre)
    DECLARE
      v_defender_loss integer;
    BEGIN
      v_defender_loss := FLOOR(v_defender_soldiers * (v_attacker_power::float / GREATEST(v_defender_power, 1) * 0.4))::integer;
      UPDATE region_state SET defender_soldiers = GREATEST(0, defender_soldiers - v_defender_loss), updated_at = now() WHERE region_id = p_region_id;
    END;
    
    -- Push Notification
    IF v_owner_id IS NOT NULL THEN
      SELECT expo_push_token INTO v_victim_token FROM player_stats WHERE id = v_owner_id;
      IF v_victim_token IS NOT NULL THEN
        PERFORM net.http_post(
          url := 'https://exp.host/--/api/v2/push/send',
          body := jsonb_build_object(
            'to', v_victim_token,
            'title', '🛡️ SALDIRI PÜSKÜRTÜLDÜ!',
            'body', format('Savunma başarılı! Güç: %s vs %s', v_defender_power, v_attacker_power),
            'sound', 'default',
            'data', jsonb_build_object('type', 'attack_defend', 'regionId', p_region_id)
          )
        );
      END IF;
    END IF;
    
    RETURN QUERY SELECT false, format('Saldırı başarısız! Saldırı Gücü: %s vs Savunma: %s', v_attacker_power, v_defender_power)::text;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Güncellenmiş rpc_reinforce_region - SINIR KALDIRILDI
CREATE OR REPLACE FUNCTION rpc_reinforce_region(p_region_id text, p_soldiers integer)
RETURNS TABLE(success boolean, message text) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_soldiers integer;
  v_owner_id uuid;
BEGIN
  -- Asker sayısı kontrolü
  SELECT COALESCE(soldiers, 0) INTO v_user_soldiers FROM player_stats WHERE id = v_user_id;
  
  IF v_user_soldiers IS NULL THEN
    SELECT soldiers INTO v_user_soldiers FROM user_soldiers WHERE user_id = v_user_id;
  END IF;
  
  IF v_user_soldiers IS NULL OR v_user_soldiers < p_soldiers THEN
    RETURN QUERY SELECT false, format('Yetersiz asker! Mevcut: %s', COALESCE(v_user_soldiers, 0))::text;
    RETURN;
  END IF;
  
  -- Bölge sahiplik kontrolü
  SELECT owner_user_id INTO v_owner_id FROM region_state WHERE region_id = p_region_id;
  IF v_owner_id IS NULL OR v_owner_id != v_user_id THEN
    RETURN QUERY SELECT false, 'Bu bölge size ait değil!'::text;
    RETURN;
  END IF;
  
  -- SINIR KALDIRILDI - İstediği kadar asker yerleştirebilir
  
  -- Askerleri güncelle
  UPDATE user_soldiers SET soldiers = soldiers - p_soldiers, updated_at = now() WHERE user_id = v_user_id;
  UPDATE player_stats SET soldiers = soldiers - p_soldiers WHERE id = v_user_id;
  UPDATE region_state SET defender_soldiers = defender_soldiers + p_soldiers, updated_at = now() WHERE region_id = p_region_id;
  
  RETURN QUERY SELECT true, format('%s asker bölgeye yerleştirildi!', p_soldiers)::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- İzinler
GRANT EXECUTE ON FUNCTION calculate_player_power(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_region_power(text) TO authenticated;
