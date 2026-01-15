-- =====================================================
-- ESKİ FONKSİYON ADLARI İÇİN ALİAS (GERİYE UYUMLULUK)
-- =====================================================

-- get_my_inventory -> get_my_inventory_v2 yönlendir
DROP FUNCTION IF EXISTS get_my_inventory();

CREATE OR REPLACE FUNCTION get_my_inventory()
RETURNS TABLE(
  resource_id UUID,
  resource_name TEXT,
  resource_image TEXT,
  quantity INTEGER,
  base_cost INTEGER
) AS $$
BEGIN
    RETURN QUERY SELECT * FROM get_my_inventory_v2();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_my_inventory() TO authenticated;

-- get_active_listings -> get_active_listings_v2 yönlendir
DROP FUNCTION IF EXISTS get_active_listings();

CREATE OR REPLACE FUNCTION get_active_listings()
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
    RETURN QUERY SELECT * FROM get_active_listings_v2();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_active_listings() TO authenticated;

-- =====================================================
-- BİTTİ - Eski çağrılar artık v2'ye yönlendirilecek!
-- =====================================================
