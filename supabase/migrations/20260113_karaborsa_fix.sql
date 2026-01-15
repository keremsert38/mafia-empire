-- Karaborsa (Black Market) Düzeltmesi
-- 3 saatte bir 100-200 arası rastgele 4 ürün yenileme
-- Baretta: 200 dolar, Yiyecekler: Enerji bazlı fiyatlandırma (max 300 dolar)

-- =====================================================
-- 1. Ürün Fiyatlarını ve Silah Gücünü Güncelle
-- =====================================================
-- Baretta: 200 dolar sabit, güç: 4 (her silah askerlere +4 güç verir)
UPDATE items SET base_price = 200, effect_value = 4 WHERE name = 'Baretta 9mm';

-- Yiyecekler: Enerji bazlı fiyatlandırma
-- Kola: 20 enerji = 300 dolar (en pahalı)
-- Su: 10 enerji = 200 dolar
-- Elma: 5 enerji = 100 dolar
UPDATE items SET base_price = 300 WHERE name = 'Kola';
UPDATE items SET base_price = 200 WHERE name = 'Su';
UPDATE items SET base_price = 100 WHERE name = 'Elma';

-- =====================================================
-- 2. Mevcut market listelerini yeni fiyatlarla güncelle
-- =====================================================
UPDATE market_listings ml
SET price = i.base_price
FROM items i
WHERE ml.item_id = i.id AND ml.is_system = TRUE;

-- =====================================================
-- 3. Stok yenileme fonksiyonunu güncelle (100-200 arası)
-- =====================================================
CREATE OR REPLACE FUNCTION rpc_check_market_restock()
RETURNS TABLE(restocked BOOLEAN, message TEXT) AS $$
DECLARE
  v_schedule RECORD;
  v_hours_passed NUMERIC;
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
  
  -- Geçen saat kontrolü (NUMERIC kullanarak hassas hesaplama)
  v_hours_passed := EXTRACT(EPOCH FROM (now() - v_schedule.last_restock_time)) / 3600.0;
  
  IF v_hours_passed < v_schedule.restock_interval_hours THEN
    RETURN QUERY SELECT FALSE, format('Sonraki stok yenilemesine %.1f saat kaldı', 
      (v_schedule.restock_interval_hours - v_hours_passed)::NUMERIC);
    RETURN;
  END IF;
  
  -- Stok yenile (100-200 arası rastgele, tüm 4 ürün için)
  FOR v_item IN SELECT * FROM items LOOP
    v_new_quantity := 100 + floor(random() * 101)::INTEGER; -- 100-200 arası
    
    -- Sistem listesini güncelle veya oluştur
    INSERT INTO market_listings (item_id, price, quantity, is_system)
    VALUES (v_item.id, v_item.base_price, v_new_quantity, TRUE)
    ON CONFLICT (item_id, is_system) WHERE is_system = TRUE
    DO UPDATE SET quantity = v_new_quantity; -- Mevcut stoğu SIIFIRLA ve yeni değeri ata
  END LOOP;
  
  -- Zamanlama güncelle
  UPDATE market_restock_schedule SET last_restock_time = now();
  
  RETURN QUERY SELECT TRUE, 'Karaborsa stokları yenilendi! (100-200 arası her ürün)';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. Zamanlama tablosunun varlığını kontrol et
-- =====================================================
CREATE TABLE IF NOT EXISTS market_restock_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  last_restock_time TIMESTAMPTZ DEFAULT now(),
  restock_interval_hours INTEGER DEFAULT 3
);

-- İlk kayıt ekle (yoksa)
INSERT INTO market_restock_schedule (last_restock_time, restock_interval_hours)
SELECT now() - INTERVAL '4 hours', 3  -- 4 saat önce olarak ayarla, böylece ilk çağrıda hemen yenilesin
WHERE NOT EXISTS (SELECT 1 FROM market_restock_schedule);

-- =====================================================
-- 5. Mevcut zamanlamayı sıfırla (hemen yenileme yapılsın)
-- =====================================================
UPDATE market_restock_schedule 
SET last_restock_time = now() - INTERVAL '4 hours';

-- =====================================================
-- 6. Şimdi stok yenilemesini manuel olarak tetikle
-- =====================================================
DO $$
DECLARE
  v_item RECORD;
  v_new_quantity INTEGER;
BEGIN
  -- Tüm 4 ürün için 100-200 arası rastgele stok
  FOR v_item IN SELECT * FROM items LOOP
    v_new_quantity := 100 + floor(random() * 101)::INTEGER; -- 100-200
    
    -- Varsa güncelle
    UPDATE market_listings
    SET quantity = v_new_quantity, price = v_item.base_price
    WHERE item_id = v_item.id AND is_system = TRUE;
    
    -- Yoksa oluştur
    IF NOT FOUND THEN
      INSERT INTO market_listings (item_id, price, quantity, is_system)
      VALUES (v_item.id, v_item.base_price, v_new_quantity, TRUE);
    END IF;
  END LOOP;
  
  -- Zamanlamayı şimdiki zamana güncelle
  UPDATE market_restock_schedule SET last_restock_time = now();
END $$;

-- =====================================================
-- Sonuç Özeti:
-- =====================================================
-- Baretta 9mm: 200 dolar, 4 power (her silah askerlere +4 güç)
-- Kola: 300 dolar (20 enerji - en pahalı)
-- Su: 200 dolar (10 enerji)
-- Elma: 100 dolar (5 enerji - en ucuz)
-- Her 3 saatte bir 100-200 arası rastgele stok yenilenir
-- =====================================================
