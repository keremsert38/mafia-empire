-- Market Fiyat Güncellemesi ve Otomatik Stok Yenileme
-- Silah: $200, Yiyecekler: $15-50
-- 3 saatte bir 25-100 adet rastgele stok

-- 1. Ürün Fiyatlarını Güncelle
UPDATE items SET base_price = 200 WHERE name = 'Baretta 9mm';
UPDATE items SET base_price = 15 WHERE name = 'Su';
UPDATE items SET base_price = 35 WHERE name = 'Kola';
UPDATE items SET base_price = 20 WHERE name = 'Elma';

-- 2. Mevcut sistem listelerini güncelle
UPDATE market_listings ml
SET price = i.base_price
FROM items i
WHERE ml.item_id = i.id AND ml.is_system = TRUE;

-- 3. Market stok yenileme tablosu
CREATE TABLE IF NOT EXISTS market_restock_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  last_restock_time TIMESTAMPTZ DEFAULT now(),
  restock_interval_hours INTEGER DEFAULT 3
);

-- İlk kayıt ekle
INSERT INTO market_restock_schedule (last_restock_time, restock_interval_hours)
SELECT now(), 3
WHERE NOT EXISTS (SELECT 1 FROM market_restock_schedule);

-- 4. Stok yenileme fonksiyonu
CREATE OR REPLACE FUNCTION rpc_check_market_restock()
RETURNS TABLE(restocked BOOLEAN, message TEXT) AS $$
DECLARE
  v_schedule RECORD;
  v_hours_passed INTEGER;
  v_item RECORD;
  v_new_quantity INTEGER;
BEGIN
  -- Zamanlama bilgisini al
  SELECT * INTO v_schedule FROM market_restock_schedule LIMIT 1;
  
  IF NOT FOUND THEN
    INSERT INTO market_restock_schedule (last_restock_time, restock_interval_hours)
    VALUES (now(), 3)
    RETURNING * INTO v_schedule;
  END IF;
  
  -- Geçen saat kontrolü
  v_hours_passed := EXTRACT(EPOCH FROM (now() - v_schedule.last_restock_time)) / 3600;
  
  IF v_hours_passed < v_schedule.restock_interval_hours THEN
    RETURN QUERY SELECT FALSE, format('Sonraki stok yenilemesine %s saat kaldı', 
      v_schedule.restock_interval_hours - v_hours_passed);
    RETURN;
  END IF;
  
  -- Stok yenile (25-100 arası rastgele)
  FOR v_item IN SELECT * FROM items LOOP
    v_new_quantity := 25 + floor(random() * 76)::INTEGER; -- 25-100
    
    -- Sistem listesini güncelle veya oluştur
    INSERT INTO market_listings (item_id, price, quantity, is_system)
    VALUES (v_item.id, v_item.base_price, v_new_quantity, TRUE)
    ON CONFLICT (item_id, is_system) WHERE is_system = TRUE
    DO UPDATE SET quantity = market_listings.quantity + v_new_quantity;
  END LOOP;
  
  -- Zamanlama güncelle
  UPDATE market_restock_schedule SET last_restock_time = now();
  
  RETURN QUERY SELECT TRUE, 'Market stokları yenilendi!';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Unique constraint ekle (varsa hata vermez)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'market_listings_system_unique'
  ) THEN
    -- Önce eski sistem kayıtlarını temizle (her item için sadece 1 tane kalsın)
    DELETE FROM market_listings ml1
    WHERE ml1.is_system = TRUE
    AND EXISTS (
      SELECT 1 FROM market_listings ml2
      WHERE ml2.item_id = ml1.item_id
      AND ml2.is_system = TRUE
      AND ml2.id < ml1.id
    );
    
    -- Şimdi unique index ekle
    CREATE UNIQUE INDEX market_listings_system_unique 
    ON market_listings (item_id) 
    WHERE is_system = TRUE;
  END IF;
END $$;

-- 6. İlk stok yenilemesini zorla
DO $$
DECLARE
  v_item RECORD;
  v_new_quantity INTEGER;
BEGIN
  FOR v_item IN SELECT * FROM items LOOP
    v_new_quantity := 25 + floor(random() * 76)::INTEGER;
    
    UPDATE market_listings
    SET quantity = v_new_quantity, price = v_item.base_price
    WHERE item_id = v_item.id AND is_system = TRUE;
    
    -- Yoksa oluştur
    IF NOT FOUND THEN
      INSERT INTO market_listings (item_id, price, quantity, is_system)
      VALUES (v_item.id, v_item.base_price, v_new_quantity, TRUE);
    END IF;
  END LOOP;
END $$;
