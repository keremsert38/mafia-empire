-- =====================================================
-- BÖLGEDEN ASKER ÇEKME DÜZELTMESİ
-- player_stats.soldiers'ı direkt güncelle
-- =====================================================

CREATE OR REPLACE FUNCTION withdraw_soldiers_from_region(
  p_region_id TEXT,
  p_amount INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_state RECORD;
BEGIN
  -- Bölge durumunu bul (region_state)
  SELECT * INTO v_state FROM region_state WHERE region_id = p_region_id;
  
  IF v_state IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Bölge durumu bulunamadı');
  END IF;
  
  -- Sahiplik kontrolü
  IF v_state.owner_user_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Bu bölge size ait değil');
  END IF;
  
  -- Mevcut asker sayısı kontrolü
  IF v_state.defender_soldiers < p_amount THEN
    RETURN jsonb_build_object('success', false, 'message', 
      format('Bölgede sadece %s asker var', v_state.defender_soldiers));
  END IF;
  
  -- Minimum 1 asker bölgede kalmalı
  IF v_state.defender_soldiers - p_amount < 1 THEN
    RETURN jsonb_build_object('success', false, 'message', 
      'Bölgede en az 1 asker kalmalı');
  END IF;
  
  -- Bölgeden askerleri çek
  UPDATE region_state 
  SET defender_soldiers = defender_soldiers - p_amount 
  WHERE region_id = p_region_id;
  
  -- *** ÖNEMLİ: HER ZAMAN player_stats'ı güncelle ***
  UPDATE player_stats
  SET soldiers = soldiers + p_amount
  WHERE id = v_user_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', format('%s asker geri çekildi!', p_amount),
    'withdrawn', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION withdraw_soldiers_from_region(TEXT, INTEGER) TO authenticated;
