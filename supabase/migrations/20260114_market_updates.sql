-- =====================================================
-- MARKET VE ENVANTER SİSTEMİ GÜNCELLEMELERİ
-- =====================================================

-- 0. TABLO VE KOLON HAZIRLIKLARI
-- =====================================================

-- Resources tablosuna image_url ekle
ALTER TABLE resources ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Player Inventory tablosunu baştan oluştur (Fonksiyonlardan önce bulunması garanti olsun)
CREATE TABLE IF NOT EXISTS player_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES player_stats(id),
  resource_id UUID REFERENCES resources(id),
  quantity INTEGER DEFAULT 0,
  UNIQUE(user_id, resource_id)
);

-- RLS for player_inventory
ALTER TABLE player_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes kendi envanterini görebilir" ON player_inventory
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Sistem envantere ekleme yapabilir" ON player_inventory
  FOR ALL USING (true) WITH CHECK (true); -- RPC'ler SECURITY DEFINER olduğu için bu bypass edilir ama yine de dursun

-- 1. RESOURCES TABLOSUNU GÜNCELLE (RESİM URL'LERİ)
-- =====================================================
-- Not: Bu URL'ler örnek olarak Unsplash'ten alınmıştır. Kalıcı olmayabilir.
-- Production'da kendi storage'ınıza yüklemeniz önerilir.

UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1599940824399-b87987ced72a?q=80&w=200' WHERE name LIKE '%Tohum%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1627461971239-1bc0aee9e64e?q=80&w=200' WHERE name LIKE '%Gübre%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1518709779341-56cf8536e869?q=80&w=200' WHERE name LIKE '%Çelik%' OR name LIKE '%Demir%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=200' WHERE name LIKE '%Kimyasal%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?q=80&w=200' WHERE name LIKE '%AK%' OR name LIKE '%Keleş%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1584030373081-f37b7bb4faae?q=80&w=200' WHERE name LIKE '%Baretta%' OR name LIKE '%Tabanca%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1624727828489-a1e03b79bba8?q=80&w=200' WHERE name LIKE '%Mermi%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?q=80&w=200' WHERE name LIKE '%Sağlık%' OR name LIKE '%Kit%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1626808642875-0aa545482dfb?q=80&w=200' WHERE name LIKE '%Yemek%' OR name LIKE '%Paket%';

-- 2. MARKETPLACE LISTINGS TABLOSU
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES player_stats(id),
  resource_id UUID NOT NULL REFERENCES resources(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_per_unit INTEGER NOT NULL CHECK (price_per_unit > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- RLS
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes ilanları görebilir" ON marketplace_listings
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Sadece sahibi ilan ekleyebilir" ON marketplace_listings
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sadece sahibi ilanı güncelleyebilir" ON marketplace_listings
  FOR UPDATE USING (auth.uid() = seller_id);

-- 3. MARKET RPC FONKSİYONLARI (v2)
-- =====================================================

-- Olası tüm eski fonksiyonları temizlemeye çalışıyoruz (Hata oluşursa 'name not unique' yüzündendir, bu yüzden spesifik tiplerle drop ediyoruz)
DROP FUNCTION IF EXISTS create_market_listing(TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS create_market_listing(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS buy_market_item(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_my_inventory();
DROP FUNCTION IF EXISTS get_active_listings();
DROP FUNCTION IF EXISTS check_and_collect_productions();

-- v2 Fonksiyonlarını da temizle (Eğer daha önce çalıştırıldıysa)
DROP FUNCTION IF EXISTS create_market_listing_v2(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS buy_market_item_v2(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_my_inventory_v2();
DROP FUNCTION IF EXISTS get_active_listings_v2();

-- İlan Oluşturma (v2)
CREATE OR REPLACE FUNCTION create_market_listing_v2(
  p_resource_id UUID,
  p_quantity INTEGER,
  p_price_per_unit INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_resource_cost INTEGER;
  v_current_inventory INTEGER;
  v_max_price INTEGER;
  v_listing_id UUID;
BEGIN
  -- 1. Envanter kontrolü
  SELECT quantity INTO v_current_inventory
  FROM player_inventory
  WHERE user_id = v_user_id AND resource_id = p_resource_id;
  
  IF v_current_inventory IS NULL OR v_current_inventory < p_quantity THEN
    RETURN jsonb_build_object('success', false, 'message', 'Yetersiz envanter!');
  END IF;

  -- 2. Fiyat kontrolü
  SELECT base_cost INTO v_resource_cost FROM resources WHERE id = p_resource_id;
  
  IF v_resource_cost IS NULL THEN
    v_resource_cost := 100; -- Default
  END IF;
  
  v_max_price := v_resource_cost * 2;
  
  IF p_price_per_unit > v_max_price THEN
    RETURN jsonb_build_object('success', false, 'message', 
      format('Max fiyat: $%s (Üretim maliyetinin 2 katı)', v_max_price));
  END IF;
  
  -- 3. İlanı oluştur
  INSERT INTO marketplace_listings (seller_id, resource_id, quantity, price_per_unit)
  VALUES (v_user_id, p_resource_id, p_quantity, p_price_per_unit)
  RETURNING id INTO v_listing_id;
  
  -- 4. Envanterden düş
  UPDATE player_inventory
  SET quantity = quantity - p_quantity
  WHERE user_id = v_user_id AND resource_id = p_resource_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'İlan oluşturuldu!', 'listing_id', v_listing_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- İlan Satın Alma (v2)
CREATE OR REPLACE FUNCTION buy_market_item_v2(
  p_listing_id UUID,
  p_quantity INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_buyer_id UUID := auth.uid();
  v_listing RECORD;
  v_total_price INTEGER;
  v_buyer_cash BIGINT;
BEGIN
  -- İlanı bul
  SELECT * INTO v_listing FROM marketplace_listings WHERE id = p_listing_id AND is_active = TRUE;
  
  IF v_listing IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'İlan bulunamadı veya satıldı.');
  END IF;
  
  IF v_listing.seller_id = v_buyer_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Kendi ürününü satın alamazsın!');
  END IF;
  
  IF v_listing.quantity < p_quantity THEN
    RETURN jsonb_build_object('success', false, 'message', 'Yetersiz stok.');
  END IF;
  
  v_total_price := v_listing.price_per_unit * p_quantity;
  
  -- Para kontrolü
  SELECT cash INTO v_buyer_cash FROM player_stats WHERE id = v_buyer_id;
  
  IF v_buyer_cash < v_total_price THEN
    RETURN jsonb_build_object('success', false, 'message', 'Yetersiz bakiye!');
  END IF;
  
  -- Transferler
  -- 1. Alıcıdan para düş
  UPDATE player_stats SET cash = cash - v_total_price WHERE id = v_buyer_id;
  
  -- 2. Satıcıya para ekle
  UPDATE player_stats SET cash = cash + v_total_price WHERE id = v_listing.seller_id;
  
  -- 3. Alıcıya ürün ekle (player_inventory)
  INSERT INTO player_inventory (user_id, resource_id, quantity)
  VALUES (v_buyer_id, v_listing.resource_id, p_quantity)
  ON CONFLICT (user_id, resource_id) 
  DO UPDATE SET quantity = player_inventory.quantity + EXCLUDED.quantity;
  
  -- 4. İlanı güncelle
  IF v_listing.quantity = p_quantity THEN
    -- Hepsi satıldı
    UPDATE marketplace_listings SET quantity = 0, is_active = FALSE WHERE id = p_listing_id;
  ELSE
    -- Kısmi satış (kalanı güncelle)
    UPDATE marketplace_listings SET quantity = quantity - p_quantity WHERE id = p_listing_id;
  END IF;
  
  RETURN jsonb_build_object('success', true, 'message', 'Satın alma başarılı!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Envanteri Görüntüleme RPC (v2)
CREATE OR REPLACE FUNCTION get_my_inventory_v2()
RETURNS TABLE(
  resource_id UUID,
  resource_name TEXT,
  resource_image TEXT,
  quantity INTEGER,
  base_cost INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.image_url,
    pi.quantity,
    r.base_cost
  FROM player_inventory pi
  JOIN resources r ON r.id = pi.resource_id
  WHERE pi.user_id = auth.uid() AND pi.quantity > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Market İlanlarını Getirme (v2)
CREATE OR REPLACE FUNCTION get_active_listings_v2()
RETURNS TABLE(
  listing_id UUID,
  seller_name TEXT,
  resource_name TEXT,
  resource_image TEXT,
  quantity INTEGER,
  price INTEGER,
  is_mine BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ml.id,
    ps.username,
    r.name,
    r.image_url,
    ml.quantity,
    ml.price_per_unit,
    (ml.seller_id = auth.uid()) as is_mine
  FROM marketplace_listings ml
  JOIN resources r ON r.id = ml.resource_id
  JOIN player_stats ps ON ps.id = ml.seller_id
  WHERE ml.is_active = TRUE AND ml.quantity > 0
  ORDER BY ml.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT ALL ON player_inventory TO authenticated;
GRANT ALL ON marketplace_listings TO authenticated;
GRANT EXECUTE ON FUNCTION create_market_listing_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION buy_market_item_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_inventory_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_listings_v2 TO authenticated;

-- Mevcut player_stats kolonlarını player_inventory'ye taşıma MIGRATION (Opsiyonel ama temizlik için iyi)
-- Şimdilik player_stats'taki kolonlar (ak47, baretta vb.) durabilir, ama üretim artık player_inventory'ye yazmalı.

-- ÜRETİM SİSTEMİ GÜNCELLEMESİ: Üretilenler player_inventory'ye gitsin
CREATE OR REPLACE FUNCTION check_and_collect_productions()
RETURNS void AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_prod RECORD;
BEGIN
  -- Tamamlanmış ve toplanmamış üretimleri bul
  FOR v_prod IN 
    SELECT * FROM production_queue 
    WHERE user_id = v_user_id 
    AND is_collected = FALSE 
    AND completes_at <= NOW()
  LOOP
    -- Envantere ekle (Eğer production_queue.resource_id zaten UUID ise cast gereksiz, değilse ::UUID ekle)
    -- Güvenlik için CAST ekliyoruz, production_queue'da resource_id TEXT tanımlıysa bile içindeki değer UUID olmalı.
    INSERT INTO player_inventory (user_id, resource_id, quantity)
    VALUES (v_user_id, v_prod.resource_id::UUID, v_prod.quantity)
    ON CONFLICT (user_id, resource_id) 
    DO UPDATE SET quantity = player_inventory.quantity + EXCLUDED.quantity;
    
    -- Toplandı işaretle
    UPDATE production_queue 
    SET is_collected = TRUE 
    WHERE id = v_prod.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
