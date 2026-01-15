-- =====================================================
-- KAPSAMLI DÜZELTME: Chat, Görseller ve Envanter
-- =====================================================

-- =====================================================
-- 1. CHAT MESAJ LİMİT TRİGGER'I KALDIR (varsa)
-- =====================================================
DROP TRIGGER IF EXISTS trigger_cleanup_old_messages ON chat_messages;
DROP FUNCTION IF EXISTS cleanup_old_chat_messages();

-- =====================================================
-- 2. RESOURCES TABLOSUNA IMAGE_URL EKLE
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='resources' AND column_name='image_url') THEN
        ALTER TABLE resources ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Görsel URL'leri güncelle
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=200' WHERE LOWER(name) LIKE '%baretta%' OR LOWER(name) LIKE '%tabanca%' OR LOWER(name) LIKE '%pistol%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=200' WHERE LOWER(name) LIKE '%ak-47%' OR LOWER(name) LIKE '%ak47%' OR LOWER(name) LIKE '%tüfek%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=200' WHERE LOWER(name) LIKE '%yemek%' OR LOWER(name) LIKE '%food%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1585842378054-ee2e52f94ba2?w=200' WHERE LOWER(name) LIKE '%sağlık%' OR LOWER(name) LIKE '%health%' OR LOWER(name) LIKE '%kit%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200' WHERE LOWER(name) LIKE '%elma%' OR LOWER(name) LIKE '%apple%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=200' WHERE LOWER(name) LIKE '%kola%' OR LOWER(name) LIKE '%cola%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=200' WHERE LOWER(name) LIKE '%su%' OR LOWER(name) LIKE '%water%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200' WHERE LOWER(name) LIKE '%çip%' OR LOWER(name) LIKE '%chip%' OR LOWER(name) LIKE '%elektronik%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=200' WHERE LOWER(name) LIKE '%plastik%' OR LOWER(name) LIKE '%plastic%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200' WHERE LOWER(name) LIKE '%metal%' OR LOWER(name) LIKE '%steel%' OR LOWER(name) LIKE '%çelik%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1617634456373-c3fae91c62a9?w=200' WHERE LOWER(name) LIKE '%ilaç%' OR LOWER(name) LIKE '%medicine%' OR LOWER(name) LIKE '%drug%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1556742521-9713bf272865?w=200' WHERE LOWER(name) LIKE '%barut%' OR LOWER(name) LIKE '%powder%' OR LOWER(name) LIKE '%gunpowder%';
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=200' WHERE image_url IS NULL;

-- =====================================================
-- 3. FABRİKA TARİFLERİ (p_business_id parametreli)
-- =====================================================
DROP FUNCTION IF EXISTS get_factory_recipes(TEXT);
DROP FUNCTION IF EXISTS get_factory_recipes(UUID);

CREATE OR REPLACE FUNCTION get_factory_recipes(p_business_id TEXT)
RETURNS TABLE(
  recipe_id UUID,
  recipe_name TEXT,
  output_resource_name TEXT,
  output_icon TEXT,
  output_image_url TEXT,
  output_quantity INTEGER,
  production_time NUMERIC,
  cost INTEGER,
  ingredients JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name::TEXT,
    res.name::TEXT,
    COALESCE(res.icon, '📦')::TEXT,
    COALESCE(res.image_url, 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=200')::TEXT,
    COALESCE(r.output_quantity, 1)::INTEGER,
    r.production_time,
    COALESCE(r.cost, 0)::INTEGER,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'resource_id', ri.resource_id,
        'resource_name', ing_res.name,
        'icon', COALESCE(ing_res.icon, '📦'),
        'image_url', COALESCE(ing_res.image_url, 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=200'),
        'quantity', ri.quantity
      ))
      FROM recipe_ingredients ri
      JOIN resources ing_res ON ing_res.id = ri.resource_id
      WHERE ri.recipe_id = r.id
    )
  FROM recipes r
  JOIN resources res ON res.id = r.output_resource_id
  WHERE r.required_business_id = p_business_id AND r.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_factory_recipes(TEXT) TO authenticated;

-- =====================================================
-- 4. PLAYER_INVENTORY TABLOSU (varsa pas geç)
-- =====================================================
CREATE TABLE IF NOT EXISTS player_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, resource_id)
);

ALTER TABLE player_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_inventory_select" ON player_inventory;
DROP POLICY IF EXISTS "player_inventory_insert" ON player_inventory;
DROP POLICY IF EXISTS "player_inventory_update" ON player_inventory;

CREATE POLICY "player_inventory_select" ON player_inventory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "player_inventory_insert" ON player_inventory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "player_inventory_update" ON player_inventory FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- 5. ÜRETİM TAMAMLANINCA ENVANTERE EKLEME
-- =====================================================
DROP FUNCTION IF EXISTS check_and_collect_productions();

CREATE OR REPLACE FUNCTION check_and_collect_productions()
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_queue RECORD;
  v_recipe RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_total_collected INTEGER := 0;
  v_output_resource_id UUID;
  v_output_qty INTEGER;
BEGIN
  -- Tamamlanan üretimleri bul (production_queue tablosundan)
  FOR v_queue IN 
    SELECT * FROM production_queue 
    WHERE user_id = v_user_id 
      AND is_collected = FALSE 
      AND completes_at <= v_now
  LOOP
    -- Tarif bilgisini al
    SELECT * INTO v_recipe FROM recipes WHERE id = v_queue.recipe_id;
    
    IF v_recipe IS NOT NULL THEN
      v_output_resource_id := v_recipe.output_resource_id;
      v_output_qty := COALESCE(v_recipe.output_quantity, 1) * v_queue.quantity;
      
      -- Envantere ekle
      INSERT INTO player_inventory (user_id, resource_id, quantity)
      VALUES (v_user_id, v_output_resource_id, v_output_qty)
      ON CONFLICT (user_id, resource_id) 
      DO UPDATE SET quantity = player_inventory.quantity + v_output_qty;
      
      -- Üretimi toplandı olarak işaretle
      UPDATE production_queue SET is_collected = TRUE WHERE id = v_queue.id;
      
      v_total_collected := v_total_collected + v_output_qty;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'total_collected', v_total_collected
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_and_collect_productions() TO authenticated;

-- =====================================================
-- 6. ENVANTER GÖRÜNTÜLEME (get_player_inventory)
-- =====================================================
DROP FUNCTION IF EXISTS get_player_inventory();

CREATE OR REPLACE FUNCTION get_player_inventory()
RETURNS TABLE(
  resource_id UUID,
  resource_name TEXT,
  icon TEXT,
  quantity INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pi.resource_id,
    r.name::TEXT,
    COALESCE(r.icon, '📦')::TEXT,
    pi.quantity
  FROM player_inventory pi
  JOIN resources r ON r.id = pi.resource_id
  WHERE pi.user_id = auth.uid() AND pi.quantity > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_player_inventory() TO authenticated;

-- =====================================================
-- 7. MARKET FONKSİYONLARI (v2)
-- =====================================================
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
    COALESCE(ps.username, 'Sistem')::TEXT,
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

-- =====================================================
-- BİTTİ!
-- =====================================================
