/*
  # Soldato Level Limiti Kaldırma

  Bu migration ile soldato üretiminde level sınırı kaldırılmıştır.
  Oyuncular artık paraları yettiği kadar soldato üretebilir.
*/

-- rpc_order_soldiers fonksiyonunu güncelle - level limiti kaldır
CREATE OR REPLACE FUNCTION rpc_order_soldiers(
  p_count integer
)
RETURNS TABLE(success boolean, message text) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_current_queue record;
  v_user_cash bigint;
  v_user_level integer;
  v_cost bigint;
  v_current_soldiers integer;
  v_pending_soldiers integer;
BEGIN
  -- Kullanıcı bilgilerini al
  SELECT cash, level INTO v_user_cash, v_user_level
  FROM player_stats
  WHERE id = v_user_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Kullanıcı bulunamadı!';
    RETURN;
  END IF;
  
  -- Sipariş miktarı kontrolü (1-500 arası)
  IF p_count < 1 OR p_count > 500 THEN
    RETURN QUERY SELECT false, 'Sipariş miktarı 1-500 arası olmalıdır!';
    RETURN;
  END IF;
  
  -- Mevcut asker sayısını al
  SELECT COALESCE(soldiers, 0) INTO v_current_soldiers
  FROM user_soldiers
  WHERE user_id = v_user_id;
  
  IF NOT FOUND THEN
    v_current_soldiers := 0;
    INSERT INTO user_soldiers (user_id, soldiers) VALUES (v_user_id, 0);
  END IF;
  
  -- Mevcut sıradaki askerleri al
  SELECT * INTO v_current_queue
  FROM soldier_production_queue
  WHERE user_id = v_user_id;
  
  v_pending_soldiers := COALESCE(v_current_queue.soldiers_ordered - v_current_queue.soldiers_completed, 0);
  
  -- LEVEL LİMİTİ KALDIRILDI - Artık sınırsız asker üretilebilir
  -- Eski kod: v_max_soldiers := v_user_level * 5;
  
  -- Maliyet hesapla (100 * count * level multiplier)
  v_cost := FLOOR(100 * p_count * (1 + v_user_level * 0.1));
  
  IF v_user_cash < v_cost THEN
    RETURN QUERY SELECT false, format('Yetersiz para! Gerekli: $%s', v_cost);
    RETURN;
  END IF;
  
  -- Parayı düş
  UPDATE player_stats
  SET cash = cash - v_cost
  WHERE id = v_user_id;
  
  -- Üretim sırasına ekle veya güncelle
  IF v_current_queue IS NULL THEN
    -- Yeni sıra oluştur
    INSERT INTO soldier_production_queue (
      user_id, 
      soldiers_ordered, 
      soldiers_completed, 
      production_start_time,
      last_check_time,
      updated_at
    )
    VALUES (
      v_user_id, 
      p_count, 
      0, 
      now(),
      now(),
      now()
    );
  ELSE
    -- Mevcut sıraya ekle
    UPDATE soldier_production_queue
    SET soldiers_ordered = soldiers_ordered + p_count,
        production_start_time = COALESCE(production_start_time, now()),
        updated_at = now()
    WHERE user_id = v_user_id;
  END IF;
  
  RETURN QUERY SELECT true, format('%s soldato siparişi verildi! Üretim süresi: %s saniye. Maliyet: $%s', 
    p_count, p_count * 100, v_cost);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
