-- =====================================================
-- ÜRETİM SİSTEMİ GÜNCELLEMELERİ
-- =====================================================
-- - Max 1000 üretim limiti
-- - Otomatik envantere ekleme (collect_production yerine auto)
-- - Arka planda üretim devam eder (Supabase server-side)

-- =====================================================
-- 1. ÜRETİM FONKSİYONLARINI GÜNCELLE
-- =====================================================

-- Önce mevcut fonksiyonları sil
DROP FUNCTION IF EXISTS start_production(TEXT, UUID, INTEGER);
DROP FUNCTION IF EXISTS collect_production(UUID);

-- Üretim başlat (max 1000 limit)
CREATE OR REPLACE FUNCTION start_production(
  p_business_id TEXT,
  p_recipe_id UUID,
  p_quantity INTEGER DEFAULT 1
) RETURNS JSONB AS $$
DECLARE
  v_recipe RECORD;
  v_ingredient RECORD;
  v_player_resource INTEGER;
  v_total_cost INTEGER;
  v_player_cash INTEGER;
  v_completes_at TIMESTAMPTZ;
  v_current_in_queue INTEGER;
BEGIN
  -- Max 1000 kontrol
  IF p_quantity > 1000 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Tek seferde maksimum 1000 adet üretilebilir');
  END IF;

  -- Mevcut üretim kuyruğundaki toplam miktar
  SELECT COALESCE(SUM(quantity), 0) INTO v_current_in_queue
  FROM production_queue
  WHERE player_id = auth.uid() AND is_collected = FALSE;

  IF v_current_in_queue + p_quantity > 1000 THEN
    RETURN jsonb_build_object('success', false, 'message', 
      format('Üretim kuyruğunda maksimum 1000 ürün olabilir. Mevcut: %s', v_current_in_queue));
  END IF;

  -- Tarif bilgisini al
  SELECT * INTO v_recipe FROM recipes WHERE id = p_recipe_id AND is_active = TRUE;
  IF v_recipe IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Tarif bulunamadı');
  END IF;

  -- İşletme kontrolü
  IF v_recipe.required_business_id != p_business_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Bu işletmede bu tarif üretilemez');
  END IF;

  -- Maliyet kontrolü
  v_total_cost := v_recipe.cost * p_quantity;
  SELECT cash INTO v_player_cash FROM player_stats WHERE id = auth.uid();
  IF v_player_cash < v_total_cost THEN
    RETURN jsonb_build_object('success', false, 'message', 'Yeterli paranız yok');
  END IF;

  -- Malzeme kontrolü ve düşürme
  FOR v_ingredient IN SELECT * FROM recipe_ingredients WHERE recipe_id = p_recipe_id LOOP
    SELECT COALESCE(quantity, 0) INTO v_player_resource
    FROM player_resources
    WHERE player_id = auth.uid() AND resource_id = v_ingredient.resource_id;

    IF v_player_resource < (v_ingredient.quantity * p_quantity) THEN
      RETURN jsonb_build_object('success', false, 'message', 'Yeterli malzeme yok');
    END IF;
  END LOOP;

  -- Malzemeleri düş
  FOR v_ingredient IN SELECT * FROM recipe_ingredients WHERE recipe_id = p_recipe_id LOOP
    UPDATE player_resources
    SET quantity = quantity - (v_ingredient.quantity * p_quantity), updated_at = NOW()
    WHERE player_id = auth.uid() AND resource_id = v_ingredient.resource_id;
  END LOOP;

  -- Parayı düş
  UPDATE player_stats SET cash = cash - v_total_cost WHERE id = auth.uid();

  -- Üretim kuyruğuna ekle
  v_completes_at := NOW() + (v_recipe.production_time * p_quantity || ' minutes')::INTERVAL;

  INSERT INTO production_queue (player_id, business_id, recipe_id, quantity, completes_at)
  VALUES (auth.uid(), p_business_id, p_recipe_id, p_quantity, v_completes_at);

  RETURN jsonb_build_object(
    'success', true,
    'message', format('%sx üretim başladı! Tamamlanma: %s dakika', p_quantity, v_recipe.production_time * p_quantity),
    'completes_at', v_completes_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tamamlanan üretimleri otomatik topla
CREATE OR REPLACE FUNCTION check_and_collect_productions()
RETURNS JSONB AS $$
DECLARE
  v_queue RECORD;
  v_recipe RECORD;
  v_total_collected INTEGER := 0;
BEGIN
  -- Tamamlanmış ama toplanmamış üretimleri bul
  FOR v_queue IN 
    SELECT * FROM production_queue
    WHERE player_id = auth.uid() 
    AND completes_at <= NOW() 
    AND is_collected = FALSE
  LOOP
    SELECT * INTO v_recipe FROM recipes WHERE id = v_queue.recipe_id;
    
    -- Ürünü envantere ekle
    INSERT INTO player_resources (player_id, resource_id, quantity)
    VALUES (auth.uid(), v_recipe.output_resource_id, v_recipe.output_quantity * v_queue.quantity)
    ON CONFLICT (player_id, resource_id)
    DO UPDATE SET quantity = player_resources.quantity + EXCLUDED.quantity, updated_at = NOW();

    -- Kuyruğu işaretle
    UPDATE production_queue 
    SET is_collected = TRUE, is_completed = TRUE 
    WHERE id = v_queue.id;

    v_total_collected := v_total_collected + (v_recipe.output_quantity * v_queue.quantity);
  END LOOP;

  IF v_total_collected > 0 THEN
    RETURN jsonb_build_object('success', true, 'collected', v_total_collected, 'message', format('%s ürün envantere eklendi!', v_total_collected));
  ELSE
    RETURN jsonb_build_object('success', true, 'collected', 0, 'message', 'Toplanacak ürün yok');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Üretim durumunu getir (aktif üretimler)
CREATE OR REPLACE FUNCTION get_production_status()
RETURNS TABLE(
  queue_id UUID,
  recipe_name TEXT,
  output_icon TEXT,
  quantity INTEGER,
  started_at TIMESTAMPTZ,
  completes_at TIMESTAMPTZ,
  is_ready BOOLEAN,
  seconds_remaining INTEGER
) AS $$
BEGIN
  -- Önce tamamlananları otomatik topla
  PERFORM check_and_collect_productions();

  RETURN QUERY
  SELECT 
    pq.id,
    r.name,
    res.icon,
    pq.quantity,
    pq.started_at,
    pq.completes_at,
    pq.completes_at <= NOW() as is_ready,
    GREATEST(0, EXTRACT(EPOCH FROM (pq.completes_at - NOW()))::INTEGER) as seconds_remaining
  FROM production_queue pq
  JOIN recipes r ON r.id = pq.recipe_id
  JOIN resources res ON res.id = r.output_resource_id
  WHERE pq.player_id = auth.uid() AND pq.is_collected = FALSE
  ORDER BY pq.completes_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonksiyon izinleri
GRANT EXECUTE ON FUNCTION start_production(TEXT, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_collect_productions() TO authenticated;
GRANT EXECUTE ON FUNCTION get_production_status() TO authenticated;
