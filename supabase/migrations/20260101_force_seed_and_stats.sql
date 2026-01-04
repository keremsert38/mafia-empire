-- FORCE SEED + PLAYER STATS INVENTORY UPDATE
-- 1. Add columns to player_stats
-- 2. Force Clean & Seed Market/Regions
-- 3. Update buy logic to use new columns

-- 1. ADD COLUMNS
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS cola INT DEFAULT 0;
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS water INT DEFAULT 0;
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS apple INT DEFAULT 0;
ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS weapon INT DEFAULT 0;

-- 2. FORCE CLEAN (TRUNCATE) & SEED
TRUNCATE market_listings, items, regions, countries, region_state CASCADE;

-- Countries
INSERT INTO countries (id, name, flag, description) VALUES
  ('turkey', 'Türkiye', '🇹🇷', 'Avrupa ve Asya köprüsü'),
  ('italy', 'İtalya', '🇮🇹', 'Mafyanın doğduğu yer'),
  ('usa', 'ABD', '🇺🇸', 'Yeraltı dünyasının merkezi'),
  ('russia', 'Rusya', '🇷🇺', 'Güçlü mafya ağları');

-- Regions
INSERT INTO regions (id, name, description, base_income_per_min, country_id) VALUES
('tr_istanbul', 'İstanbul', 'İki kıtanın buluştuğu şehir', 45.0, 'turkey'),
('tr_ankara', 'Ankara', 'Başkent', 35.0, 'turkey'),
('tr_izmir', 'İzmir', 'Ege incisi', 30.0, 'turkey'),
('tr_bursa', 'Bursa', 'Sanayi kenti', 25.0, 'turkey'),
('tr_antalya', 'Antalya', 'Turizm cenneti', 28.0, 'turkey'),
('tr_adana', 'Adana', 'Güneyin kalbi', 22.0, 'turkey'),
('tr_gaziantep', 'Gaziantep', 'Sınır ticareti', 24.0, 'turkey'),
('tr_konya', 'Konya', 'Orta Anadolu', 18.0, 'turkey'),
('tr_mersin', 'Mersin', 'Liman şehri', 26.0, 'turkey'),
('tr_trabzon', 'Trabzon', 'Karadeniz', 20.0, 'turkey'),
('it_roma', 'Roma', 'Ebedi şehir', 48.0, 'italy'),
('it_milano', 'Milano', 'Finans başkenti', 50.0, 'italy'),
('it_napoli', 'Napoli', 'Camorra merkezi', 42.0, 'italy'),
('it_torino', 'Torino', 'Otomotiv', 35.0, 'italy'),
('it_palermo', 'Palermo', 'Sicilya başkenti', 45.0, 'italy'),
('it_genova', 'Genova', 'Liman şehri', 32.0, 'italy'),
('it_bologna', 'Bologna', 'Kuzey İtalya', 28.0, 'italy'),
('it_firenze', 'Firenze', 'Sanat şehri', 30.0, 'italy'),
('it_bari', 'Bari', 'Adriyatik kapısı', 25.0, 'italy'),
('it_catania', 'Catania', 'Sicilya', 27.0, 'italy'),
('us_newyork', 'New York', 'Beş aile', 50.0, 'usa'),
('us_losangeles', 'Los Angeles', 'Hollywood', 48.0, 'usa'),
('us_chicago', 'Chicago', 'Al Capone şehri', 45.0, 'usa'),
('us_houston', 'Houston', 'Petrol', 40.0, 'usa'),
('us_miami', 'Miami', 'Latin bağlantıları', 44.0, 'usa'),
('us_lasvegas', 'Las Vegas', 'Kumarhane', 50.0, 'usa'),
('us_sanfrancisco', 'San Francisco', 'Teknoloji', 42.0, 'usa'),
('us_boston', 'Boston', 'İrlanda mafyası', 35.0, 'usa'),
('us_detroit', 'Detroit', 'Otomotiv', 28.0, 'usa'),
('us_atlanta', 'Atlanta', 'Güneyin merkezi', 32.0, 'usa'),
('ru_moskova', 'Moskova', 'Oligarklar', 50.0, 'russia'),
('ru_stpetersburg', 'St. Petersburg', 'Kuzey Venedik', 45.0, 'russia'),
('ru_novosibirsk', 'Novosibirsk', 'Sibirya kalbi', 28.0, 'russia'),
('ru_yekaterinburg', 'Yekaterinburg', 'Ural dağları', 32.0, 'russia'),
('ru_kazan', 'Kazan', 'Tatar başkenti', 26.0, 'russia'),
('ru_nizhniy', 'Nizhny Novgorod', 'Volga incisi', 24.0, 'russia'),
('ru_samara', 'Samara', 'Uzay endüstrisi', 22.0, 'russia'),
('ru_chelyabinsk', 'Chelyabinsk', 'Ağır sanayi', 25.0, 'russia'),
('ru_omsk', 'Omsk', 'Trans-Sibirya', 20.0, 'russia'),
('ru_rostov', 'Rostov', 'Don nehri', 27.0, 'russia');

-- Region State
INSERT INTO region_state (region_id, defender_soldiers) VALUES
('tr_istanbul', 180), ('tr_ankara', 140), ('tr_izmir', 120), ('tr_bursa', 100), ('tr_antalya', 110),
('tr_adana', 85), ('tr_gaziantep', 95), ('tr_konya', 70), ('tr_mersin', 105), ('tr_trabzon', 80),
('it_roma', 190), ('it_milano', 200), ('it_napoli', 170), ('it_torino', 140), ('it_palermo', 180),
('it_genova', 130), ('it_bologna', 110), ('it_firenze', 120), ('it_bari', 100), ('it_catania', 105),
('us_newyork', 200), ('us_losangeles', 190), ('us_chicago', 180), ('us_houston', 160), ('us_miami', 175),
('us_lasvegas', 200), ('us_sanfrancisco', 170), ('us_boston', 140), ('us_detroit', 110), ('us_atlanta', 130),
('ru_moskova', 200), ('ru_stpetersburg', 180), ('ru_novosibirsk', 110), ('ru_yekaterinburg', 130), ('ru_kazan', 100),
('ru_nizhniy', 95), ('ru_samara', 85), ('ru_chelyabinsk', 100), ('ru_omsk', 80), ('ru_rostov', 105)
ON CONFLICT (region_id) DO UPDATE SET defender_soldiers = EXCLUDED.defender_soldiers;

-- Items (Market)
INSERT INTO items (name, type, effect_type, effect_value, image_url, description, base_price) VALUES
('Baretta 9mm', 'weapon', 'power', 1, 'https://cdn-icons-png.flaticon.com/128/1529/1529117.png', 'Standart tabanca. Her biri 1 askerin gücünü +1 artırır.', 5000),
('Su', 'food', 'energy', 10, 'https://cdn-icons-png.flaticon.com/512/3105/3105807.png', 'Temiz su. 10 Enerji yeniler.', 500),
('Kola', 'food', 'energy', 20, 'https://cdn-icons-png.flaticon.com/512/2722/2722527.png', 'Soğuk kola. 20 Enerji yeniler.', 1000),
('Elma', 'food', 'energy', 5, 'https://cdn-icons-png.flaticon.com/512/415/415733.png', 'Taze elma. 5 Enerji yeniler.', 250);

-- Market Listings
INSERT INTO market_listings (item_id, price, quantity, is_system)
SELECT id, base_price, 100, TRUE FROM items;

-- 3. UPDATE BUY FUNCTION
CREATE OR REPLACE FUNCTION buy_market_item(
  p_listing_id UUID,
  p_buyer_id UUID,
  p_quantity INTEGER
) RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
  v_listing record;
  v_item record;
  v_buyer_stats record;
  v_total_price INTEGER;
BEGIN
  -- Listing info with item name
  SELECT m.*, i.name as item_name 
  INTO v_listing 
  FROM market_listings m 
  JOIN items i ON m.item_id = i.id 
  WHERE m.id = p_listing_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'İlan bulunamadı.'::TEXT;
    RETURN;
  END IF;

  IF v_listing.quantity < p_quantity THEN
    RETURN QUERY SELECT FALSE, 'Yetersiz stok.'::TEXT;
    RETURN;
  END IF;

  v_total_price := v_listing.price * p_quantity;

  -- Buyer info
  SELECT * INTO v_buyer_stats FROM player_stats WHERE id = p_buyer_id;
  IF v_buyer_stats.cash < v_total_price THEN
    RETURN QUERY SELECT FALSE, 'Yetersiz para.'::TEXT;
    RETURN;
  END IF;

  -- TRANSACTION
  -- 1. Deduct Cash
  UPDATE player_stats SET cash = cash - v_total_price WHERE id = p_buyer_id;

  -- 2. Seller Cash (if not system)
  IF NOT v_listing.is_system AND v_listing.seller_id IS NOT NULL THEN
    UPDATE player_stats SET cash = cash + v_total_price WHERE id = v_listing.seller_id;
  END IF;

  -- 3. Update Inventory Columns (DIRECT MAPPING)
  IF v_listing.item_name = 'Su' THEN
    UPDATE player_stats SET water = COALESCE(water, 0) + p_quantity WHERE id = p_buyer_id;
  ELSIF v_listing.item_name = 'Kola' THEN
    UPDATE player_stats SET cola = COALESCE(cola, 0) + p_quantity WHERE id = p_buyer_id;
  ELSIF v_listing.item_name = 'Elma' THEN
    UPDATE player_stats SET apple = COALESCE(apple, 0) + p_quantity WHERE id = p_buyer_id;
  ELSIF v_listing.item_name = 'Baretta 9mm' THEN
    UPDATE player_stats SET weapon = COALESCE(weapon, 0) + p_quantity WHERE id = p_buyer_id;
  ELSE
    -- Fallback for unmapped items: still use player_inventory for safety?
    -- User specifically asked for these 4 to be in stats.
    -- We can skip player_inventory insert for these 4, or do both? 
    -- Doing both duplicates data. User wants "player statsa kaydedilsin".
    -- I will ONLY do player_stats for these.
    NULL;
  END IF;
  
  -- 4. Update Listing
  IF v_listing.quantity = p_quantity THEN
    DELETE FROM market_listings WHERE id = p_listing_id;
  ELSE
    UPDATE market_listings SET quantity = quantity - p_quantity WHERE id = p_listing_id;
  END IF;

  RETURN QUERY SELECT TRUE, 'Satın alma başarılı.'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
