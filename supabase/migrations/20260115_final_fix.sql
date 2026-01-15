-- =====================================================
-- KESİN DÜZELTME: Fabrika ve Chat
-- Bu dosyayı çalıştırın!
-- =====================================================

-- =====================================================
-- 1. CHAT MESAJ TRİGGER/FONKSİYON TEMİZLİĞİ
-- =====================================================
DROP TRIGGER IF EXISTS trigger_cleanup_old_messages ON chat_messages;
DROP FUNCTION IF EXISTS cleanup_old_chat_messages() CASCADE;

-- =====================================================
-- 2. FABRİKA TARİFLERİ FONKSİYONU (ORİJİNAL YAPI)
-- =====================================================
-- Tüm eski versiyonları sil
DROP FUNCTION IF EXISTS get_factory_recipes(TEXT);
DROP FUNCTION IF EXISTS get_factory_recipes(UUID);
DROP FUNCTION IF EXISTS get_factory_recipes(text);

-- Orijinal yapıya sadık kalarak yeniden oluştur
CREATE FUNCTION get_factory_recipes(p_business_id TEXT)
RETURNS TABLE(
  recipe_id UUID,
  recipe_name TEXT,
  output_resource_name TEXT,
  output_icon TEXT,
  output_image_url TEXT,
  output_quantity INTEGER,
  production_time INTEGER,
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
    r.output_quantity,
    r.production_time::INTEGER,
    COALESCE(r.cost, 0),
    (
      SELECT jsonb_agg(jsonb_build_object(
        'resource_id', ri.resource_id,
        'resource_name', res2.name,
        'icon', COALESCE(res2.icon, '📦'),
        'image_url', COALESCE(res2.image_url, 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=200'),
        'quantity', ri.quantity
      ))
      FROM recipe_ingredients ri
      JOIN resources res2 ON res2.id = ri.resource_id
      WHERE ri.recipe_id = r.id
    )
  FROM recipes r
  JOIN resources res ON res.id = r.output_resource_id
  WHERE r.required_business_id = p_business_id 
    AND r.is_active = TRUE
  ORDER BY r.cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_factory_recipes(TEXT) TO authenticated;

-- =====================================================
-- 3. MEVCUT TARİFLERİ KONTROL
-- =====================================================
-- Eğer tarifler yanlış business_id'ye atanmışsa düzelt
-- Örnek fabrika ID'leri: fab_sera, fab_demir_madeni, fab_kereste vb.

-- Tüm tarifleri görmek için bu sorguyu çalıştırabilirsiniz:
-- SELECT id, name, required_business_id FROM recipes;

-- =====================================================
-- 4. RESOURCES TABLOSUNA IMAGE_URL KOLONU (VARSA PAS GEÇ)
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='resources' AND column_name='image_url') THEN
        ALTER TABLE resources ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Örnek görsel URL'leri
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200' WHERE LOWER(name) LIKE '%demir%' OR LOWER(name) LIKE '%iron%' AND image_url IS NULL;
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1542621334-a254cf47733d?w=200' WHERE LOWER(name) LIKE '%tohum%' OR LOWER(name) LIKE '%seed%' AND image_url IS NULL;
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1520262494112-9fe481d36ec3?w=200' WHERE LOWER(name) LIKE '%kereste%' OR LOWER(name) LIKE '%wood%' AND image_url IS NULL;
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=200' WHERE LOWER(name) LIKE '%silah%' OR LOWER(name) LIKE '%gun%' AND image_url IS NULL;
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1585842378054-ee2e52f94ba2?w=200' WHERE LOWER(name) LIKE '%sağlık%' OR LOWER(name) LIKE '%health%' AND image_url IS NULL;
UPDATE resources SET image_url = 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=200' WHERE image_url IS NULL;

-- =====================================================
-- BİTTİ - Her fabrika şimdi kendi tariflerini gösterecek!
-- =====================================================
