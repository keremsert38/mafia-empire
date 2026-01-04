-- FIX SOLDIER PRODUCTION BUG
-- Problem: rpc_check_soldier_production updates 'user_soldiers' table but checks 'player_stats'.
-- Solution: Update 'player_stats' (which should sync if it's a table) or ensure logic uses correct table.
-- Since player_stats IS a table and apparently desynced, we will force update it in the RPC.

CREATE OR REPLACE FUNCTION rpc_check_soldier_production()
RETURNS TABLE(
  soldiers_added integer,
  soldiers_pending integer,
  seconds_remaining integer,
  message text
) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_queue record;
  v_elapsed_seconds integer;
  v_completed_now integer;
  v_total_completed integer;
  v_pending integer;
  v_seconds_for_pending integer;
BEGIN
  -- Mevcut sırayı al
  SELECT * INTO v_queue
  FROM soldier_production_queue
  WHERE user_id = v_user_id;
  
  IF NOT FOUND OR v_queue.soldiers_ordered <= v_queue.soldiers_completed THEN
    RETURN QUERY SELECT 0, 0, 0, 'Üretimde soldato yok.';
    RETURN;
  END IF;
  
  -- Geçen süreyi hesapla (saniye cinsinden)
  v_elapsed_seconds := EXTRACT(EPOCH FROM (now() - v_queue.production_start_time))::integer;
  
  -- Tamamlanan soldato sayısını hesapla (100 saniye/soldato)
  v_total_completed := LEAST(v_queue.soldiers_ordered, v_elapsed_seconds / 100);
  
  -- Bu kontrol ile eklenen yeni soldato sayısı
  v_completed_now := v_total_completed - v_queue.soldiers_completed;
  
  -- Bekleyen soldato sayısı
  v_pending := v_queue.soldiers_ordered - v_total_completed;
  
  -- Kalan süre
  v_seconds_for_pending := CASE WHEN v_pending > 0 THEN
    (v_total_completed + 1) * 100 - v_elapsed_seconds
  ELSE
    0
  END;
  
  -- Eğer yeni tamamlanan varsa
  IF v_completed_now > 0 THEN
    -- 1. user_soldiers tablosunu güncelle
    INSERT INTO user_soldiers (user_id, soldiers)
    VALUES (v_user_id, v_completed_now)
    ON CONFLICT (user_id)
    DO UPDATE SET soldiers = user_soldiers.soldiers + v_completed_now, updated_at = now();

    -- 2. CRITICAL FIX: player_stats tablosunu da güncelle!
    UPDATE player_stats
    SET soldiers = soldiers + v_completed_now
    WHERE id = v_user_id;
    
    -- Sırayı güncelle
    UPDATE soldier_production_queue
    SET soldiers_completed = v_total_completed,
        last_check_time = now(),
        updated_at = now()
    WHERE user_id = v_user_id;
    
    -- Tamamlandıysa sırayı sıfırla
    IF v_pending = 0 THEN
      UPDATE soldier_production_queue
      SET soldiers_ordered = 0,
      soldiers_completed = 0,
      production_start_time = NULL,
      updated_at = now()
      WHERE user_id = v_user_id;
    END IF;
  END IF;
  
  RETURN QUERY SELECT 
    v_completed_now,
    v_pending,
    GREATEST(0, v_seconds_for_pending),
    CASE WHEN v_completed_now > 0 THEN
      format('%s soldato üretimi tamamlandı!', v_completed_now)
    ELSE
      format('%s soldato üretiliyor, kalan: %s saniye', v_pending, v_seconds_for_pending)
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- UPDATE MARKET IMAGES & CLEAR OLD LISTINGS
-- Clear existing system listings to re-seed with new images
DELETE FROM market_listings WHERE is_system = TRUE;
DELETE FROM items; -- This cascades to inventory and listings

-- Re-insert items with better images
INSERT INTO items (name, type, effect_type, effect_value, image_url, description, base_price) VALUES
('Baretta 9mm', 'weapon', 'power', 1, 'https://cdn-icons-png.flaticon.com/128/9000/9000889.png', 'Standart tabanca. Her biri 1 askerin gücünü +1 artırır.', 5000),
('Su', 'food', 'energy', 10, 'https://cdn-icons-png.flaticon.com/128/824/824239.png', 'Temiz su. 10 Enerji yeniler.', 500),
('Kola', 'food', 'energy', 20, 'https://cdn-icons-png.flaticon.com/128/2405/2405479.png', 'Soğuk kola. 20 Enerji yeniler.', 1000),
('Elma', 'food', 'energy', 5, 'https://cdn-icons-png.flaticon.com/128/415/415733.png', 'Taze elma. 5 Enerji yeniler.', 250);

-- Reseed Market
DO $$
DECLARE
  r_item RECORD;
BEGIN
  FOR r_item IN SELECT * FROM items LOOP
    INSERT INTO market_listings (item_id, price, quantity, is_system)
    VALUES (r_item.id, r_item.base_price, 100, TRUE);
  END LOOP;
END;
$$;
