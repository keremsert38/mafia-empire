-- =====================================================
-- OYUN DENGESİ GÜNCELLEMELERİ
-- =====================================================
-- Bu SQL'i Supabase'de çalıştır

-- =====================================================
-- 1. SİLAH GÜÇLERİ VE FİYATLARI
-- =====================================================

-- Baretta 9mm: Güç 4, Fiyat 200$
UPDATE items 
SET effect_value = 4, base_price = 200 
WHERE name = 'Baretta 9mm' OR name LIKE '%Baretta%';

-- AK-47: Güç 10, Fiyat 500$
UPDATE items 
SET effect_value = 10, base_price = 500 
WHERE name = 'AK-47' OR name LIKE '%AK%47%';

-- =====================================================
-- 2. SOLDATO SÜRE AYARI (100 -> 60 saniye)
-- =====================================================

-- Üretim durumunu kontrol et (60 saniye/soldato)
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
  SELECT * INTO v_queue
  FROM soldier_production_queue
  WHERE user_id = v_user_id;
  
  IF NOT FOUND OR v_queue.soldiers_ordered <= v_queue.soldiers_completed THEN
    RETURN QUERY SELECT 0, 0, 0, 'Üretimde soldato yok.'::text;
    RETURN;
  END IF;
  
  -- Geçen süreyi hesapla
  v_elapsed_seconds := EXTRACT(EPOCH FROM (now() - v_queue.production_start_time))::integer;
  
  -- 60 saniye/soldato (eskiden 100)
  v_total_completed := LEAST(v_queue.soldiers_ordered, v_elapsed_seconds / 60);
  v_completed_now := v_total_completed - v_queue.soldiers_completed;
  v_pending := v_queue.soldiers_ordered - v_total_completed;
  
  v_seconds_for_pending := CASE WHEN v_pending > 0 THEN
    (v_total_completed + 1) * 60 - v_elapsed_seconds
  ELSE 0 END;
  
  IF v_completed_now > 0 THEN
    UPDATE user_soldiers
    SET soldiers = soldiers + v_completed_now, updated_at = now()
    WHERE user_id = v_user_id;
    
    UPDATE soldier_production_queue
    SET soldiers_completed = v_total_completed, last_check_time = now(), updated_at = now()
    WHERE user_id = v_user_id;
    
    IF v_pending = 0 THEN
      UPDATE soldier_production_queue
      SET soldiers_ordered = 0, soldiers_completed = 0, production_start_time = NULL, updated_at = now()
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

-- Mevcut üretim durumunu getir (60 saniye/soldato)
CREATE OR REPLACE FUNCTION rpc_get_soldier_production_status()
RETURNS TABLE(
  soldiers_in_production integer,
  soldiers_completed integer,
  total_seconds_elapsed integer,
  seconds_until_next integer,
  production_start_time timestamptz
) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_queue record;
  v_elapsed integer;
  v_completed integer;
  v_pending integer;
  v_next_seconds integer;
BEGIN
  SELECT * INTO v_queue
  FROM soldier_production_queue
  WHERE user_id = v_user_id;
  
  IF NOT FOUND OR v_queue.soldiers_ordered IS NULL OR v_queue.soldiers_ordered = 0 THEN
    RETURN QUERY SELECT 0, 0, 0, 0, NULL::timestamptz;
    RETURN;
  END IF;
  
  v_elapsed := EXTRACT(EPOCH FROM (now() - v_queue.production_start_time))::integer;
  -- 60 saniye/soldato
  v_completed := LEAST(v_queue.soldiers_ordered, v_elapsed / 60);
  v_pending := v_queue.soldiers_ordered - v_completed;
  v_next_seconds := CASE WHEN v_pending > 0 THEN
    (v_completed + 1) * 60 - v_elapsed
  ELSE 0 END;
  
  RETURN QUERY SELECT 
    v_pending,
    v_completed,
    v_elapsed,
    GREATEST(0, v_next_seconds),
    v_queue.production_start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sipariş mesajını güncelle (60 saniye göster)
CREATE OR REPLACE FUNCTION rpc_order_soldiers(p_count integer)
RETURNS TABLE(success boolean, message text) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_current_queue record;
  v_user_cash bigint;
  v_user_level integer;
  v_cost bigint;
  v_max_soldiers integer;
  v_current_soldiers integer;
  v_pending_soldiers integer;
BEGIN
  SELECT cash, level INTO v_user_cash, v_user_level
  FROM player_stats WHERE id = v_user_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Kullanıcı bulunamadı!'::text;
    RETURN;
  END IF;
  
  SELECT COALESCE(soldiers, 0) INTO v_current_soldiers
  FROM user_soldiers WHERE user_id = v_user_id;
  
  IF NOT FOUND THEN
    v_current_soldiers := 0;
    INSERT INTO user_soldiers (user_id, soldiers) VALUES (v_user_id, 0);
  END IF;
  
  SELECT * INTO v_current_queue
  FROM soldier_production_queue WHERE user_id = v_user_id;
  
  v_pending_soldiers := COALESCE(v_current_queue.soldiers_ordered - v_current_queue.soldiers_completed, 0);
  v_max_soldiers := v_user_level * 5;
  
  IF v_current_soldiers + v_pending_soldiers + p_count > v_max_soldiers THEN
    RETURN QUERY SELECT false, format('Maksimum asker kapasitesi aşılıyor! Mevcut: %s, Üretimde: %s, Maksimum: %s', 
      v_current_soldiers, v_pending_soldiers, v_max_soldiers)::text;
    RETURN;
  END IF;
  
  v_cost := FLOOR(100 * p_count * (1 + v_user_level * 0.1));
  
  IF v_user_cash < v_cost THEN
    RETURN QUERY SELECT false, format('Yetersiz para! Gerekli: $%s', v_cost)::text;
    RETURN;
  END IF;
  
  UPDATE player_stats SET cash = cash - v_cost WHERE id = v_user_id;
  
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

-- =====================================================
-- 3. OTOMATİK SİLAH DÜŞÜRME (3 saatte bir)
-- =====================================================

-- Silahları markete ekle fonksiyonu
CREATE OR REPLACE FUNCTION rpc_restock_weapons()
RETURNS VOID AS $$
DECLARE
  v_baretta_id UUID;
  v_ak47_id UUID;
  v_random_baretta INTEGER;
  v_random_ak47 INTEGER;
BEGIN
  -- Item ID'lerini bul
  SELECT id INTO v_baretta_id FROM items WHERE name ILIKE '%Baretta%' LIMIT 1;
  SELECT id INTO v_ak47_id FROM items WHERE name ILIKE '%AK%47%' OR name ILIKE '%AK47%' LIMIT 1;

  -- Rastgele miktarlar (5-15 arası)
  v_random_baretta := 5 + floor(random() * 11)::INTEGER;
  v_random_ak47 := 3 + floor(random() * 8)::INTEGER;

  -- Baretta ekle
  IF v_baretta_id IS NOT NULL THEN
    INSERT INTO market_listings (item_id, seller_id, price, quantity, is_system)
    VALUES (v_baretta_id, NULL, 200, v_random_baretta, TRUE)
    ON CONFLICT DO NOTHING;
  END IF;

  -- AK-47 ekle
  IF v_ak47_id IS NOT NULL THEN
    INSERT INTO market_listings (item_id, seller_id, price, quantity, is_system)
    VALUES (v_ak47_id, NULL, 500, v_random_ak47, TRUE)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Market stok yenileme fonksiyonunu güncelle (silahları da dahil et)
-- Önce mevcut fonksiyonu sil (return type değiştirmek için gerekli)
DROP FUNCTION IF EXISTS rpc_check_market_restock();

-- game_settings tablosunu oluştur (yoksa)
CREATE TABLE IF NOT EXISTS game_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- İlk stok zamanını ekle
INSERT INTO game_settings (key, value)
VALUES ('last_market_restock', NOW()::TEXT)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION rpc_check_market_restock()
RETURNS JSONB AS $$
DECLARE
  v_last_restock TIMESTAMPTZ;
  v_hours_passed NUMERIC;
  v_item RECORD;
  v_random_qty INTEGER;
BEGIN
  -- Son stok yenileme zamanını al
  SELECT value::TIMESTAMPTZ INTO v_last_restock 
  FROM game_settings 
  WHERE key = 'last_market_restock';

  -- Eğer kayıt yoksa oluştur
  IF v_last_restock IS NULL THEN
    INSERT INTO game_settings (key, value)
    VALUES ('last_market_restock', NOW()::TEXT)
    ON CONFLICT (key) DO UPDATE SET value = NOW()::TEXT;
    v_last_restock := NOW();
  END IF;

  -- Kaç saat geçti?
  v_hours_passed := EXTRACT(EPOCH FROM (NOW() - v_last_restock)) / 3600;

  -- 3 saat geçtiyse stok yenile
  IF v_hours_passed >= 3 THEN
    -- Mevcut sistem stoklarını temizle
    DELETE FROM market_listings WHERE is_system = TRUE;

    -- Tüm itemleri yeniden stokla
    FOR v_item IN SELECT * FROM items WHERE is_active = TRUE LOOP
      -- Silahlar için farklı miktar
      IF v_item.type = 'weapon' THEN
        v_random_qty := 3 + floor(random() * 13)::INTEGER; -- 3-15
      ELSE
        v_random_qty := 50 + floor(random() * 151)::INTEGER; -- 50-200
      END IF;

      INSERT INTO market_listings (item_id, seller_id, price, quantity, is_system)
      VALUES (v_item.id, NULL, v_item.base_price, v_random_qty, TRUE);
    END LOOP;

    -- Zamanı güncelle
    UPDATE game_settings SET value = NOW()::TEXT WHERE key = 'last_market_restock';

    RETURN jsonb_build_object('success', true, 'message', 'Market stokları yenilendi');
  END IF;

  RETURN jsonb_build_object('success', false, 'message', 'Henüz stok yenileme zamanı gelmedi');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. ENERJİ YENİLEME DEĞİŞİKLİĞİ
-- =====================================================
-- Not: Otomatik enerji yenilenmesi gameService.ts'de 
-- zaten devre dışı bırakılmıştı. Bu SQL ile yiyecek/içecek
-- enerji değerleri ayarlanıyor.

-- Yiyecek/içecek enerji değerleri
UPDATE items SET effect_value = 10 WHERE name = 'Elma';
UPDATE items SET effect_value = 15 WHERE name = 'Kola';
UPDATE items SET effect_value = 10 WHERE name = 'Su';
UPDATE items SET effect_value = 20 WHERE name = 'Yemek Paketi';
UPDATE items SET effect_value = 50 WHERE name = 'Premium Yemek';
UPDATE items SET effect_value = 30 WHERE name = 'Sağlık Kiti';

-- =====================================================
-- ÖZET:
-- 1. Baretta 9mm: Güç 4, Fiyat 200$
-- 2. AK-47: Güç 10, Fiyat 500$
-- 3. Soldato kiralama: 60 saniye
-- 4. Silahlar 3 saatte bir markete düşüyor (3-15 arası rastgele)
-- 5. Enerji sadece yiyecek/içecekle yenileniyor
-- =====================================================

-- İlk stoğu hemen ekle
SELECT rpc_check_market_restock();
