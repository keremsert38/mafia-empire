-- SAFE SEED MIGRATION
-- Populates Countries, Regions, Items, and Market Listings if they are missing.

-- 1. COUNTRIES
INSERT INTO countries (id, name, flag, description) VALUES
  ('turkey', 'Türkiye', '🇹🇷', 'Avrupa ve Asya köprüsü'),
  ('italy', 'İtalya', '🇮🇹', 'Mafyanın doğduğu yer'),
  ('usa', 'ABD', '🇺🇸', 'Yeraltı dünyasının merkezi'),
  ('russia', 'Rusya', '🇷🇺', 'Güçlü mafya ağları')
ON CONFLICT (id) DO NOTHING;

-- 2. REGIONS
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
('ru_rostov', 'Rostov', 'Don nehri', 27.0, 'russia')
ON CONFLICT (id) DO NOTHING;

-- 3. REGION STATE
INSERT INTO region_state (region_id, defender_soldiers) VALUES
('tr_istanbul', 180), ('tr_ankara', 140), ('tr_izmir', 120), ('tr_bursa', 100), ('tr_antalya', 110),
('tr_adana', 85), ('tr_gaziantep', 95), ('tr_konya', 70), ('tr_mersin', 105), ('tr_trabzon', 80),
('it_roma', 190), ('it_milano', 200), ('it_napoli', 170), ('it_torino', 140), ('it_palermo', 180),
('it_genova', 130), ('it_bologna', 110), ('it_firenze', 120), ('it_bari', 100), ('it_catania', 105),
('us_newyork', 200), ('us_losangeles', 190), ('us_chicago', 180), ('us_houston', 160), ('us_miami', 175),
('us_lasvegas', 200), ('us_sanfrancisco', 170), ('us_boston', 140), ('us_detroit', 110), ('us_atlanta', 130),
('ru_moskova', 200), ('ru_stpetersburg', 180), ('ru_novosibirsk', 110), ('ru_yekaterinburg', 130), ('ru_kazan', 100),
('ru_nizhniy', 95), ('ru_samara', 85), ('ru_chelyabinsk', 100), ('ru_omsk', 80), ('ru_rostov', 105)
ON CONFLICT (region_id) DO NOTHING;

-- 4. ITEMS (MARKET)
INSERT INTO items (name, type, effect_type, effect_value, image_url, description, base_price)
SELECT 'Baretta 9mm', 'weapon', 'power', 1, 'https://cdn-icons-png.flaticon.com/128/1529/1529117.png', 'Standart tabanca. Her biri 1 askerin gücünü +1 artırır.', 5000
WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'Baretta 9mm');

INSERT INTO items (name, type, effect_type, effect_value, image_url, description, base_price)
SELECT 'Su', 'food', 'energy', 10, 'https://cdn-icons-png.flaticon.com/512/3105/3105807.png', 'Temiz su. 10 Enerji yeniler.', 500
WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'Su');

INSERT INTO items (name, type, effect_type, effect_value, image_url, description, base_price)
SELECT 'Kola', 'food', 'energy', 20, 'https://cdn-icons-png.flaticon.com/512/2722/2722527.png', 'Soğuk kola. 20 Enerji yeniler.', 1000
WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'Kola');

INSERT INTO items (name, type, effect_type, effect_value, image_url, description, base_price)
SELECT 'Elma', 'food', 'energy', 5, 'https://cdn-icons-png.flaticon.com/512/415/415733.png', 'Taze elma. 5 Enerji yeniler.', 250
WHERE NOT EXISTS (SELECT 1 FROM items WHERE name = 'Elma');

-- 5. SEED MARKET LISTINGS (100x each item)
DO $$
DECLARE
  r_item RECORD;
BEGIN
  FOR r_item IN SELECT * FROM items LOOP
    -- Check if system listing exists for this item
    IF NOT EXISTS (SELECT 1 FROM market_listings WHERE item_id = r_item.id AND is_system = TRUE) THEN
      INSERT INTO market_listings (item_id, price, quantity, is_system)
      VALUES (r_item.id, r_item.base_price, 100, TRUE);
    END IF;
  END LOOP;
END;
$$;
