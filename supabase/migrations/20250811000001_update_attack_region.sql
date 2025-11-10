/*
  # Bölge Saldırı Fonksiyonu Güncellemesi
  
  - Fazla askeri olan taraf kazanır
  - Kazanan tarafın askerleri kalır (fazla kısmı bölgede kalır)
  - Kaybedenin askerleri kazananın olur
*/

-- Önce tüm eski rpc_attack_region fonksiyonlarını drop et (hem text hem uuid versiyonlarını temizle)
DROP FUNCTION IF EXISTS rpc_attack_region(text, integer);
DROP FUNCTION IF EXISTS rpc_attack_region(uuid, integer);
DROP FUNCTION IF EXISTS rpc_attack_region(text, integer, text);
DROP FUNCTION IF EXISTS rpc_attack_region(uuid, integer, text);

-- Yeni bölgeye saldırı RPC fonksiyonunu oluştur (sadece text parametreli versiyon)
CREATE FUNCTION rpc_attack_region(
  p_region_id text,
  p_attackers_to_send integer
)
RETURNS TABLE(success boolean, message text) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_soldiers integer := 0;
  v_defender_soldiers integer := 0;
  v_owner_id uuid;
  v_winner_soldiers integer := 0;
BEGIN
  -- Kullanıcı kontrolü
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Kullanıcı kimliği bulunamadı!';
    RETURN;
  END IF;

  -- Kullanıcının asker sayısını al
  SELECT COALESCE(soldiers, 0) INTO v_user_soldiers
  FROM user_soldiers
  WHERE user_id::uuid = v_user_id::uuid;

  -- Eğer kullanıcı user_soldiers tablosunda yoksa 0 olarak ayarla
  IF NOT FOUND OR v_user_soldiers IS NULL THEN
    v_user_soldiers := 0;
    INSERT INTO user_soldiers (user_id, soldiers)
    VALUES (v_user_id::uuid, 0)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Yeterli asker var mı?
  IF v_user_soldiers < p_attackers_to_send THEN
    RETURN QUERY SELECT false, 'Yetersiz asker!';
    RETURN;
  END IF;

  -- Bölge durumunu al
  SELECT defender_soldiers, owner_user_id 
  INTO v_defender_soldiers, v_owner_id
  FROM region_state
  WHERE region_id::text = p_region_id::text;

  -- Bölge bulunamazsa hata ver
  IF NOT FOUND OR v_defender_soldiers IS NULL THEN
    RETURN QUERY SELECT false, 'Bölge bulunamadı!';
    RETURN;
  END IF;

  -- NULL değerleri kontrol et
  IF v_defender_soldiers IS NULL THEN
    v_defender_soldiers := 0;
  END IF;

  -- Kendi bölgesine saldıramasın (NULL kontrolü ile)
  IF v_owner_id IS NOT NULL AND v_owner_id = v_user_id THEN
    RETURN QUERY SELECT false, 'Kendi bölgenize saldıramazsınız!';
    RETURN;
  END IF;

  -- Saldıran askerlerini gönder (düş)
  UPDATE user_soldiers
  SET soldiers = soldiers - p_attackers_to_send
  WHERE user_id::uuid = v_user_id::uuid;

  -- Saldırı sonucu hesapla
  IF p_attackers_to_send > v_defender_soldiers THEN
    -- Saldıran kazandı!
    
    -- Kazananın kalan askerleri
    v_winner_soldiers := p_attackers_to_send - v_defender_soldiers;
    
    -- Bölgeyi ele geçir ve kalan askerleri bölgeye yerleştir
    UPDATE region_state
    SET owner_user_id = v_user_id::uuid,
        defender_soldiers = v_winner_soldiers,
        updated_at = now()
    WHERE region_id::text = p_region_id::text;

    -- Kaybedenin (savunmacının) askerlerini kazanana ver
    -- Eğer savunmacı varsa, askerlerini kazananın hesabına ekle
    IF v_owner_id IS NOT NULL THEN
      UPDATE user_soldiers
      SET soldiers = soldiers + v_defender_soldiers
      WHERE user_id::uuid = v_user_id::uuid;
      
      -- Kaybedenin askerlerini düş (bölgeden çıkar)
      UPDATE user_soldiers
      SET soldiers = GREATEST(0, soldiers - v_defender_soldiers)
      WHERE user_id::uuid = v_owner_id::uuid;
    END IF;

    RETURN QUERY SELECT true, format('Bölge ele geçirildi! %s asker kaldı. Savunmacının %s askeri sizin oldu.', 
      v_winner_soldiers, v_defender_soldiers);
    
  ELSIF v_defender_soldiers > p_attackers_to_send THEN
    -- Savunmacı kazandı!
    
    -- Kazananın (savunmacının) kalan askerleri
    v_winner_soldiers := v_defender_soldiers - p_attackers_to_send;
    
    -- Bölgede kalan askerleri güncelle
    UPDATE region_state
    SET defender_soldiers = v_winner_soldiers,
        updated_at = now()
    WHERE region_id::text = p_region_id::text;

    -- Saldıranın (kaybedenin) askerlerini savunmacıya ver
    IF v_owner_id IS NOT NULL THEN
      UPDATE user_soldiers
      SET soldiers = soldiers + p_attackers_to_send
      WHERE user_id::uuid = v_owner_id::uuid;
    END IF;

    RETURN QUERY SELECT false, format('Saldırı başarısız! %s asker kaybettiniz. Savunmacıya verildi.', p_attackers_to_send);
    
  ELSE
    -- Eşit savaş - Her iki taraf da kaybeder, bölge boş kalır
    UPDATE region_state
    SET owner_user_id = NULL,
        defender_soldiers = 0,
        updated_at = now()
    WHERE region_id::text = p_region_id::text;

    -- Savunmacı varsa askerlerini de düş
    IF v_owner_id IS NOT NULL THEN
      UPDATE user_soldiers
      SET soldiers = GREATEST(0, soldiers - v_defender_soldiers)
      WHERE user_id::uuid = v_owner_id::uuid;
    END IF;

    RETURN QUERY SELECT false, 'Eşit savaş! Her iki taraf da kaybetti. Bölge boş kaldı.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log
SELECT 'Attack region function updated successfully' as message;

