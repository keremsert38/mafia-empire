-- =====================================================
-- KOLON ADI DÜZELTMELERİ
-- seller_user_id -> seller_id
-- base_cost -> base_value
-- =====================================================

-- 1. get_active_listings_v2 düzelt
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
    (ml.seller_id = v_user_id)
  FROM marketplace_listings ml
  JOIN resources r ON r.id = ml.resource_id
  LEFT JOIN player_stats ps ON ps.id = ml.seller_id
  WHERE ml.is_active = TRUE AND ml.quantity > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_active_listings_v2() TO authenticated;

-- 2. get_my_inventory_v2 düzelt (base_value kullan)
DROP FUNCTION IF EXISTS get_my_inventory_v2();

CREATE OR REPLACE FUNCTION get_my_inventory_v2()
RETURNS TABLE(
  resource_id UUID,
  resource_name TEXT,
  resource_image TEXT,
  quantity INTEGER,
  base_cost INTEGER
) AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_stats RECORD;
BEGIN
    -- Player stats'ı al
    SELECT * INTO v_stats FROM player_stats WHERE id = v_user_id;
    
    IF v_stats IS NULL THEN
        RETURN;
    END IF;
    
    -- Her ürün için ayrı satır döndür (quantity > 0 olanlar)
    RETURN QUERY
    SELECT 
        r.id,
        r.name::TEXT,
        COALESCE(r.image_url, 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=200')::TEXT,
        v_stats.demir_cevheri,
        COALESCE(r.base_value, 100)::INTEGER
    FROM resources r WHERE LOWER(r.name) LIKE '%demir cevheri%' AND v_stats.demir_cevheri > 0
    
    UNION ALL
    SELECT r.id, r.name::TEXT, COALESCE(r.image_url, 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=200')::TEXT, v_stats.kereste, COALESCE(r.base_value, 100)::INTEGER
    FROM resources r WHERE LOWER(r.name) LIKE '%kereste%' AND v_stats.kereste > 0
    
    UNION ALL
    SELECT r.id, r.name::TEXT, COALESCE(r.image_url, 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=200')::TEXT, v_stats.barut, COALESCE(r.base_value, 100)::INTEGER
    FROM resources r WHERE LOWER(r.name) LIKE '%barut%' AND v_stats.barut > 0
    
    UNION ALL
    SELECT r.id, r.name::TEXT, COALESCE(r.image_url, 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=200')::TEXT, v_stats.demir_kulce, COALESCE(r.base_value, 100)::INTEGER
    FROM resources r WHERE LOWER(r.name) LIKE '%demir külçe%' AND v_stats.demir_kulce > 0
    
    UNION ALL
    SELECT r.id, r.name::TEXT, COALESCE(r.image_url, 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=200')::TEXT, v_stats.namlu, COALESCE(r.base_value, 100)::INTEGER
    FROM resources r WHERE LOWER(r.name) LIKE '%namlu%' AND v_stats.namlu > 0
    
    UNION ALL
    SELECT r.id, r.name::TEXT, COALESCE(r.image_url, 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=200')::TEXT, v_stats.kabze, COALESCE(r.base_value, 100)::INTEGER
    FROM resources r WHERE LOWER(r.name) LIKE '%kabze%' AND v_stats.kabze > 0
    
    UNION ALL
    SELECT r.id, r.name::TEXT, COALESCE(r.image_url, 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=200')::TEXT, v_stats.tohum, COALESCE(r.base_value, 100)::INTEGER
    FROM resources r WHERE LOWER(r.name) LIKE '%tohum%' AND v_stats.tohum > 0
    
    UNION ALL
    SELECT r.id, r.name::TEXT, COALESCE(r.image_url, 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=200')::TEXT, v_stats.ilac, COALESCE(r.base_value, 100)::INTEGER
    FROM resources r WHERE (LOWER(r.name) LIKE '%ilaç%' OR LOWER(r.name) LIKE '%ilac%') AND v_stats.ilac > 0
    
    UNION ALL
    SELECT r.id, r.name::TEXT, COALESCE(r.image_url, 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=200')::TEXT, v_stats.saglik_kiti, COALESCE(r.base_value, 100)::INTEGER
    FROM resources r WHERE (LOWER(r.name) LIKE '%sağlık%' OR LOWER(r.name) LIKE '%saglik%') AND v_stats.saglik_kiti > 0
    
    UNION ALL
    SELECT r.id, r.name::TEXT, COALESCE(r.image_url, 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=200')::TEXT, v_stats.yemek, COALESCE(r.base_value, 100)::INTEGER
    FROM resources r WHERE LOWER(r.name) LIKE '%yemek%' AND v_stats.yemek > 0
    
    UNION ALL
    SELECT r.id, r.name::TEXT, COALESCE(r.image_url, 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=200')::TEXT, v_stats.baretta, COALESCE(r.base_value, 100)::INTEGER
    FROM resources r WHERE LOWER(r.name) LIKE '%baretta%' AND v_stats.baretta > 0
    
    UNION ALL
    SELECT r.id, r.name::TEXT, COALESCE(r.image_url, 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=200')::TEXT, v_stats.ak47, COALESCE(r.base_value, 100)::INTEGER
    FROM resources r WHERE (LOWER(r.name) LIKE '%ak-47%' OR LOWER(r.name) LIKE '%ak47%') AND v_stats.ak47 > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_my_inventory_v2() TO authenticated;

-- 3. Alias fonksiyonları güncelle
DROP FUNCTION IF EXISTS get_my_inventory();
DROP FUNCTION IF EXISTS get_active_listings();

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

-- 4. create_market_listing_v2 düzelt
DROP FUNCTION IF EXISTS create_market_listing_v2(UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION create_market_listing_v2(
    p_resource_id UUID,
    p_quantity INTEGER,
    p_price_per_unit INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_resource RECORD;
    v_column_name TEXT;
    v_current_qty INTEGER;
    v_max_price INTEGER;
BEGIN
    -- Kaynak bilgisini al
    SELECT * INTO v_resource FROM resources WHERE id = p_resource_id;
    
    IF v_resource IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Kaynak bulunamadı');
    END IF;
    
    -- Kolon adını belirle
    v_column_name := LOWER(REPLACE(REPLACE(REPLACE(v_resource.name, ' ', '_'), 'ı', 'i'), 'ğ', 'g'));
    v_column_name := REPLACE(REPLACE(REPLACE(v_column_name, 'ü', 'u'), 'ş', 's'), 'ö', 'o');
    v_column_name := REPLACE(REPLACE(v_column_name, 'ç', 'c'), '-', '_');
    
    -- Mevcut miktarı al
    BEGIN
        EXECUTE format('SELECT COALESCE(%I, 0) FROM player_stats WHERE id = $1', v_column_name)
        INTO v_current_qty
        USING v_user_id;
    EXCEPTION WHEN undefined_column THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Bu ürün envanterinizde yok');
    END;
    
    IF v_current_qty < p_quantity THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Yeterli ürün yok. Mevcut: ' || v_current_qty);
    END IF;
    
    -- Fiyat kontrolü
    v_max_price := COALESCE(v_resource.base_value, 100) * 2;
    IF p_price_per_unit > v_max_price THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Fiyat çok yüksek! Maksimum: $' || v_max_price);
    END IF;
    
    -- Player_stats'tan düş
    EXECUTE format('UPDATE player_stats SET %I = %I - $1 WHERE id = $2', v_column_name, v_column_name)
    USING p_quantity, v_user_id;
    
    -- Market ilanı oluştur
    INSERT INTO marketplace_listings (seller_id, resource_id, quantity, price_per_unit, is_active)
    VALUES (v_user_id, p_resource_id, p_quantity, p_price_per_unit, TRUE);
    
    RETURN jsonb_build_object('success', TRUE, 'message', 'İlan oluşturuldu!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_market_listing_v2(UUID, INTEGER, INTEGER) TO authenticated;

-- 5. buy_market_item_v2 düzelt
DROP FUNCTION IF EXISTS buy_market_item_v2(UUID, INTEGER);

CREATE OR REPLACE FUNCTION buy_market_item_v2(
    p_listing_id UUID,
    p_quantity INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_listing RECORD;
    v_resource RECORD;
    v_total_cost INTEGER;
    v_column_name TEXT;
    v_buyer_cash BIGINT;
BEGIN
    -- İlan bilgisini al
    SELECT * INTO v_listing FROM marketplace_listings WHERE id = p_listing_id AND is_active = TRUE;
    
    IF v_listing IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'İlan bulunamadı');
    END IF;
    
    IF v_listing.seller_id = v_user_id THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Kendi ilanınızı alamazsınız');
    END IF;
    
    IF v_listing.quantity < p_quantity THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Yeterli stok yok');
    END IF;
    
    -- Toplam maliyeti hesapla
    v_total_cost := v_listing.price_per_unit * p_quantity;
    
    -- Alıcının parasını kontrol et
    SELECT cash INTO v_buyer_cash FROM player_stats WHERE id = v_user_id;
    
    IF v_buyer_cash < v_total_cost THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Yeterli paranız yok. Gerekli: $' || v_total_cost);
    END IF;
    
    -- Kaynak bilgisini al
    SELECT * INTO v_resource FROM resources WHERE id = v_listing.resource_id;
    
    -- Kolon adını belirle
    v_column_name := LOWER(REPLACE(REPLACE(REPLACE(v_resource.name, ' ', '_'), 'ı', 'i'), 'ğ', 'g'));
    v_column_name := REPLACE(REPLACE(REPLACE(v_column_name, 'ü', 'u'), 'ş', 's'), 'ö', 'o');
    v_column_name := REPLACE(REPLACE(v_column_name, 'ç', 'c'), '-', '_');
    
    -- Alıcıdan para düş
    UPDATE player_stats SET cash = cash - v_total_cost WHERE id = v_user_id;
    
    -- Satıcıya para ekle
    UPDATE player_stats SET cash = cash + v_total_cost WHERE id = v_listing.seller_id;
    
    -- Alıcıya ürün ekle
    BEGIN
        EXECUTE format('UPDATE player_stats SET %I = COALESCE(%I, 0) + $1 WHERE id = $2', v_column_name, v_column_name)
        USING p_quantity, v_user_id;
    EXCEPTION WHEN undefined_column THEN
        -- Kolon yoksa player_inventory'ye ekle
        INSERT INTO player_inventory (user_id, resource_id, quantity)
        VALUES (v_user_id, v_listing.resource_id, p_quantity)
        ON CONFLICT (user_id, resource_id) 
        DO UPDATE SET quantity = player_inventory.quantity + p_quantity;
    END;
    
    -- İlan güncelle
    UPDATE marketplace_listings 
    SET quantity = quantity - p_quantity,
        is_active = (quantity - p_quantity > 0)
    WHERE id = p_listing_id;
    
    RETURN jsonb_build_object('success', TRUE, 'message', p_quantity || ' adet ' || v_resource.name || ' satın alındı!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION buy_market_item_v2(UUID, INTEGER) TO authenticated;

-- =====================================================
-- BİTTİ!
-- =====================================================
