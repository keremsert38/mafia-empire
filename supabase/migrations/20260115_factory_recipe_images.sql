-- =====================================================
-- FABRİKA TARİFLERİNE RESİM URL'Sİ EKLEME
-- =====================================================

-- get_factory_recipes fonksiyonunu output_image_url döndürecek şekilde güncelle
DROP FUNCTION IF EXISTS get_factory_recipes(TEXT);

CREATE OR REPLACE FUNCTION get_factory_recipes(factory_id TEXT)
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
  WHERE r.factory_id = factory_id::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_factory_recipes(TEXT) TO authenticated;
