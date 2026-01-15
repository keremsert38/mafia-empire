-- =====================================================
-- SOLDATO LİMİTİNİ KALDIRMA
-- =====================================================

CREATE OR REPLACE FUNCTION rpc_order_soldiers(p_count integer)
RETURNS TABLE(success boolean, message text) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_current_queue record;
  v_user_cash bigint;
  v_user_level integer;
  v_cost bigint;
  -- v_max_soldiers integer; -- Limit değişkeni kaldırıldı
  -- v_current_soldiers integer; -- Limit kontrolü için gereksiz
  -- v_pending_soldiers integer; -- Limit kontrolü için gereksiz
BEGIN
  SELECT cash, level INTO v_user_cash, v_user_level
  FROM player_stats WHERE id = v_user_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Kullanıcı bulunamadı!'::text;
    RETURN;
  END IF;
  
  -- user_soldiers kaydı yoksa oluştur (Sadece veri tutarlılığı için, limit için değil)
  INSERT INTO user_soldiers (user_id, soldiers) 
  VALUES (v_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Limit kontrolü TAMAMEN KALDIRILDI
  -- İstenildiği kadar asker alınabilir
  
  -- Maliyet hesabı: 100$ baz fiyat + level başına %10 artış
  v_cost := FLOOR(100 * p_count * (1 + v_user_level * 0.1));
  
  IF v_user_cash < v_cost THEN
    RETURN QUERY SELECT false, format('Yetersiz para! Gerekli: $%s', v_cost)::text;
    RETURN;
  END IF;
  
  -- Parayı düş
  UPDATE player_stats SET cash = cash - v_cost WHERE id = v_user_id;
  
  -- Kuyruğa ekle
  SELECT * INTO v_current_queue
  FROM soldier_production_queue WHERE user_id = v_user_id;
  
  IF v_current_queue IS NULL THEN
    INSERT INTO soldier_production_queue (user_id, soldiers_ordered, soldiers_completed, production_start_time, last_check_time, updated_at)
    VALUES (v_user_id, p_count, 0, now(), now(), now());
  ELSE
    UPDATE soldier_production_queue
    SET soldiers_ordered = soldiers_ordered + p_count, production_start_time = COALESCE(production_start_time, now()), updated_at = now()
    WHERE user_id = v_user_id;
  END IF;
  
  -- 60 saniye/soldato mesajı
  RETURN QUERY SELECT true, format('%s soldato siparişi verildi! Üretim süresi: %s saniye. Maliyet: $%s', 
    p_count, p_count * 60, v_cost)::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION rpc_order_soldiers(integer) TO authenticated;
