-- =====================================================
-- BÖLGE SAVAŞ SİSTEMİ - YENİ DENGE
-- =====================================================
-- 1. Savunan taraf 1.2x buff alır (1000 savunucu = 1200 efektif güç)
-- 2. Fazla güce sahip taraf kazanır
-- 3. Kaybeden taraf askerlerinin %80'ini kaybeder
-- 4. Level sınırı yok - istenen kadar asker yerleştirilebilir

-- Bölge Takviye - Sınır Yok
CREATE OR REPLACE FUNCTION rpc_reinforce_region(p_region_id text, p_soldiers integer)
RETURNS TABLE(success boolean, message text) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_soldiers integer;
  v_owner_id uuid;
BEGIN
  -- Asker sayısı kontrolü
  SELECT COALESCE(soldiers, 0) INTO v_user_soldiers FROM player_stats WHERE id = v_user_id;
  
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
  
  -- SINIR YOK - İstediği kadar asker yerleştirebilir
  UPDATE player_stats SET soldiers = soldiers - p_soldiers WHERE id = v_user_id;
  UPDATE region_state SET defender_soldiers = defender_soldiers + p_soldiers, updated_at = now() WHERE region_id = p_region_id;
  
  RETURN QUERY SELECT true, format('%s asker bölgeye yerleştirildi!', p_soldiers)::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bölge Saldırı - Yeni Denge
CREATE OR REPLACE FUNCTION rpc_attack_region(p_region_id text, p_attackers_to_send integer)
RETURNS TABLE(success boolean, message text) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_soldiers integer;
  v_defender_soldiers integer;
  v_owner_id uuid;
  v_attacker_power integer;
  v_defender_power integer;
  v_defender_effective_power integer;
  v_loser_loss integer;
  v_winner_is_attacker boolean;
BEGIN
  -- 1. Saldıranın asker sayısı
  SELECT COALESCE(soldiers, 0) INTO v_user_soldiers FROM player_stats WHERE id = v_user_id;
  
  IF v_user_soldiers IS NULL OR v_user_soldiers < p_attackers_to_send THEN
    RETURN QUERY SELECT false, 'Yetersiz asker!'::text;
    RETURN;
  END IF;
  
  -- 2. Savunucu bilgileri
  SELECT defender_soldiers, owner_user_id 
  INTO v_defender_soldiers, v_owner_id 
  FROM region_state WHERE region_id = p_region_id;
  
  IF v_owner_id = v_user_id THEN
    RETURN QUERY SELECT false, 'Kendi bölgenize saldıramazsınız!'::text;
    RETURN;
  END IF;
  
  -- 3. GÜÇ HESAPLAMA
  v_attacker_power := p_attackers_to_send * 5;  -- Her asker 5 güç
  v_defender_power := COALESCE(v_defender_soldiers, 0) * 5;
  
  -- SAVUNAN 1.2x BUFF (1000 savunucu = 1200 efektif güç)
  v_defender_effective_power := FLOOR(v_defender_power * 1.2);
  
  -- 4. Saldıranın askerlerini düş
  UPDATE player_stats SET soldiers = soldiers - p_attackers_to_send WHERE id = v_user_id;
  
  -- 5. SAVAŞ SONUCU: Daha yüksek efektif güç kazanır
  v_winner_is_attacker := v_attacker_power > v_defender_effective_power;
  
  IF v_winner_is_attacker THEN
    -- SALDIRAN KAZANDI
    -- Savunucu %80 kaybeder (hepsi ölür çünkü bölge ele geçiriliyor)
    v_loser_loss := v_defender_soldiers;
    
    -- Saldıranın kaybı: Savunucu gücünün %80'i kadar asker
    DECLARE
      v_attacker_loss integer;
      v_surviving_attackers integer;
    BEGIN
      v_attacker_loss := FLOOR(v_defender_soldiers * 0.8);
      v_surviving_attackers := GREATEST(1, p_attackers_to_send - v_attacker_loss);
      
      -- Bölgeyi ele geçir
      UPDATE region_state 
      SET owner_user_id = v_user_id, 
          defender_soldiers = v_surviving_attackers, 
          updated_at = now() 
      WHERE region_id = p_region_id;
    END;
    
    RETURN QUERY SELECT true, format('🏆 BÖLGE ELE GEÇİRİLDİ! Saldırı: %s vs Savunma: %s (x1.2 = %s)', 
      v_attacker_power, v_defender_power, v_defender_effective_power)::text;
  ELSE
    -- SAVUNAN KAZANDI
    -- Saldıran tüm askerlerini kaybetti (zaten düşüldü)
    
    -- Savunucu kaybı: Saldıran gücünün %80'i kadar asker
    v_loser_loss := FLOOR(p_attackers_to_send * 0.8);
    
    UPDATE region_state 
    SET defender_soldiers = GREATEST(1, defender_soldiers - v_loser_loss), 
        updated_at = now() 
    WHERE region_id = p_region_id;
    
    RETURN QUERY SELECT false, format('💀 SALDIRI BAŞARISIZ! Saldırı: %s vs Savunma: %s (x1.2 = %s)', 
      v_attacker_power, v_defender_power, v_defender_effective_power)::text;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION rpc_reinforce_region(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_attack_region(text, integer) TO authenticated;
