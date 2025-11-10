/*
  # Bölgeye Asker Yerleştirme Fonksiyonu
  
  - Kendi bölgelerimize asker yerleştirebilme
  - Seviyeye göre maksimum asker kontrolü (seviye × 5)
*/

-- Bölgeye asker yerleştirme RPC fonksiyonu
CREATE OR REPLACE FUNCTION rpc_reinforce_region(
  p_region_id text,
  p_soldiers_to_send integer,
  p_player_level integer
)
RETURNS TABLE(success boolean, message text) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_soldiers integer := 0;
  v_current_defenders integer := 0;
  v_owner_id uuid;
  v_max_soldiers_per_territory integer;
BEGIN
  -- Kullanıcı kontrolü
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Kullanıcı kimliği bulunamadı!';
    RETURN;
  END IF;

  -- Maksimum asker hesapla (seviye × 5)
  v_max_soldiers_per_territory := p_player_level * 5;

  -- Kullanıcının asker sayısını al
  SELECT COALESCE(soldiers, 0) INTO v_user_soldiers
  FROM user_soldiers
  WHERE user_id::uuid = v_user_id::uuid;

  IF NOT FOUND OR v_user_soldiers IS NULL THEN
    v_user_soldiers := 0;
    INSERT INTO user_soldiers (user_id, soldiers)
    VALUES (v_user_id::uuid, 0)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Yeterli asker var mı?
  IF v_user_soldiers < p_soldiers_to_send THEN
    RETURN QUERY SELECT false, format('Yetersiz asker! Sadece %s askeriniz var.', v_user_soldiers);
    RETURN;
  END IF;

  -- Bölge durumunu al
  SELECT defender_soldiers, owner_user_id 
  INTO v_current_defenders, v_owner_id
  FROM region_state
  WHERE region_id::text = p_region_id::text;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Bölge bulunamadı!';
    RETURN;
  END IF;

  -- NULL kontrolü
  IF v_current_defenders IS NULL THEN
    v_current_defenders := 0;
  END IF;

  -- Sadece kendi bölgemize asker yerleştirebiliriz
  IF v_owner_id IS NULL OR v_owner_id::uuid != v_user_id::uuid THEN
    RETURN QUERY SELECT false, 'Sadece kendi bölgelerinize asker yerleştirebilirsiniz!';
    RETURN;
  END IF;

  -- Maksimum kapasite kontrolü
  IF (v_current_defenders + p_soldiers_to_send) > v_max_soldiers_per_territory THEN
    RETURN QUERY SELECT false, format(
      'Maksimum kapasite aşıldı! Seviye %s için maksimum %s asker yerleştirebilirsiniz. Mevcut: %s, Yerleştirilecek: %s', 
      p_player_level, 
      v_max_soldiers_per_territory, 
      v_current_defenders, 
      p_soldiers_to_send
    );
    RETURN;
  END IF;

  -- Minimum kontrolü
  IF p_soldiers_to_send < 1 THEN
    RETURN QUERY SELECT false, 'En az 1 asker yerleştirmelisiniz!';
    RETURN;
  END IF;

  -- Askerleri kullanıcı hesabından düş
  UPDATE user_soldiers
  SET soldiers = soldiers - p_soldiers_to_send
  WHERE user_id::uuid = v_user_id::uuid;

  -- Bölgeye asker ekle
  UPDATE region_state
  SET defender_soldiers = defender_soldiers + p_soldiers_to_send,
      updated_at = now()
  WHERE region_id::text = p_region_id::text;

  RETURN QUERY SELECT true, format(
    '%s asker başarıyla yerleştirildi! Yeni toplam: %s / %s', 
    p_soldiers_to_send,
    v_current_defenders + p_soldiers_to_send,
    v_max_soldiers_per_territory
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log
SELECT 'Reinforce region function created successfully' as message;

