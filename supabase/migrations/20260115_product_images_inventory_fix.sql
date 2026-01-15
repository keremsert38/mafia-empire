-- =====================================================
-- ÜRÜN GÖRSELLERİ VE ÜRETİM ENVANTER DÜZELTME
-- =====================================================

-- 1. ÜRÜN GÖRSELLERİ EKLEMESİ
-- resources tablosuna image_url kolonu ekle (yoksa)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='resources' AND column_name='image_url') THEN
        ALTER TABLE resources ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Ürün görsellerini güncelle (gerçek resim URL'leri)
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=200' WHERE name ILIKE '%baretta%' OR name ILIKE '%tabanca%' OR name ILIKE '%pistol%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=200' WHERE name ILIKE '%ak-47%' OR name ILIKE '%ak47%' OR name ILIKE '%tüfek%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=200' WHERE name ILIKE '%yemek%' OR name ILIKE '%food%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1585842378054-ee2e52f94ba2?w=200' WHERE name ILIKE '%sağlık%' OR name ILIKE '%health%' OR name ILIKE '%kit%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200' WHERE name ILIKE '%elma%' OR name ILIKE '%apple%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=200' WHERE name ILIKE '%kola%' OR name ILIKE '%cola%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=200' WHERE name ILIKE '%su%' OR name ILIKE '%water%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200' WHERE name ILIKE '%çip%' OR name ILIKE '%chip%' OR name ILIKE '%elektronik%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=200' WHERE name ILIKE '%plastik%' OR name ILIKE '%plastic%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200' WHERE name ILIKE '%meyve%' OR name ILIKE '%fruit%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200' WHERE name ILIKE '%metal%' OR name ILIKE '%steel%' OR name ILIKE '%çelik%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1535090467336-9501f96eef89?w=200' WHERE name ILIKE '%kumaş%' OR name ILIKE '%fabric%' OR name ILIKE '%cloth%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1617634456373-c3fae91c62a9?w=200' WHERE name ILIKE '%ilaç%' OR name ILIKE '%medicine%' OR name ILIKE '%drug%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1556742521-9713bf272865?w=200' WHERE name ILIKE '%barut%' OR name ILIKE '%powder%' OR name ILIKE '%gunpowder%';

-- Varsayılan görsel (NULL olanlar için)
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=200' WHERE image_url IS NULL;

-- =====================================================
-- 2. ÜRETİM TAMAMLANINCA ENVANTERE EKLEME DÜZELTMESİ
-- =====================================================

-- Önce mevcut fonksiyonu sil (return type değişikliği için gerekli)
DROP FUNCTION IF EXISTS check_and_collect_productions();

-- check_and_collect_productions fonksiyonunu güncelle (envantere gitsin)
CREATE OR REPLACE FUNCTION check_and_collect_productions()
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_production RECORD;
  v_recipe RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_elapsed_time NUMERIC;
  v_completed_qty INTEGER;
  v_total_collected INTEGER := 0;
  v_collected_items JSONB := '[]'::JSONB;
BEGIN
  -- Aktif üretimleri bul
  FOR v_production IN 
    SELECT * FROM player_productions 
    WHERE user_id = v_user_id AND is_completed = FALSE
  LOOP
    -- Tarif bilgisini al
    SELECT * INTO v_recipe FROM recipes WHERE id = v_production.recipe_id;
    
    IF v_recipe IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Geçen süreyi hesapla (dakika cinsinden)
    v_elapsed_time := EXTRACT(EPOCH FROM (v_now - v_production.started_at)) / 60;
    
    -- Tamamlanan miktar
    v_completed_qty := LEAST(
      FLOOR(v_elapsed_time / v_recipe.production_time)::INTEGER,
      v_production.quantity
    );
    
    IF v_completed_qty > 0 THEN
      -- Envantere ekle (player_inventory)
      INSERT INTO player_inventory (user_id, resource_id, quantity)
      VALUES (v_user_id, v_recipe.output_resource_id, v_completed_qty)
      ON CONFLICT (user_id, resource_id) 
      DO UPDATE SET quantity = player_inventory.quantity + v_completed_qty;
      
      -- Toplam toplanan sayısını güncelle
      UPDATE player_productions 
      SET collected_quantity = COALESCE(collected_quantity, 0) + v_completed_qty,
          is_completed = (COALESCE(collected_quantity, 0) + v_completed_qty >= quantity)
      WHERE id = v_production.id;
      
      v_total_collected := v_total_collected + v_completed_qty;
      
      -- Toplanan ürünü listeye ekle
      v_collected_items := v_collected_items || jsonb_build_object(
        'recipe_name', v_recipe.name,
        'quantity', v_completed_qty
      );
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'total_collected', v_total_collected,
    'items', v_collected_items
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_and_collect_productions() TO authenticated;

-- =====================================================
-- 3. ENVANTER VE MARKET FONKSİYONLARINI GÜNCELLE
-- =====================================================

-- Envanter görüntüleme (image_url dahil)
DROP FUNCTION IF EXISTS get_my_inventory_v2();
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
    pi.resource_id,
    r.name::TEXT,
    COALESCE(r.image_url, 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=200')::TEXT,
    pi.quantity,
    COALESCE(r.base_cost, 100)::INTEGER
  FROM player_inventory pi
  JOIN resources r ON r.id = pi.resource_id
  WHERE pi.user_id = auth.uid() AND pi.quantity > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_my_inventory_v2() TO authenticated;

-- Market ilanları (image_url dahil)
DROP FUNCTION IF EXISTS get_active_listings_v2();
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
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT 
    ml.id,
    COALESCE(ps.username, 'Anonim')::TEXT,
    r.name::TEXT,
    COALESCE(r.image_url, 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=200')::TEXT,
    ml.quantity,
    ml.price_per_unit,
    (ml.seller_user_id = v_user_id)
  FROM marketplace_listings ml
  JOIN resources r ON r.id = ml.resource_id
  LEFT JOIN player_stats ps ON ps.id = ml.seller_user_id
  WHERE ml.is_active = TRUE AND ml.quantity > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_active_listings_v2() TO authenticated;
