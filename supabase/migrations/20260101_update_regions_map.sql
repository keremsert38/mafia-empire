-- =====================================================
-- BÖLGE HARİTA SİSTEMİ - 4 ÜLKE VE 40 ŞEHİR
-- =====================================================

-- 1. Önce mevcut fonksiyonları sil
DROP FUNCTION IF EXISTS rpc_attack_region(text, integer);
DROP FUNCTION IF EXISTS rpc_reinforce_region(text, integer);
DROP FUNCTION IF EXISTS rpc_claim_income();
DROP FUNCTION IF EXISTS ensure_user_initialized();

-- 2. Mevcut tabloları sil
DROP TABLE IF EXISTS region_state CASCADE;
DROP TABLE IF EXISTS regions CASCADE;
DROP TABLE IF EXISTS countries CASCADE;

-- 3. Countries tablosu
CREATE TABLE countries (
  id text PRIMARY KEY,
  name text NOT NULL,
  flag text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- 4. Regions tablosu
CREATE TABLE regions (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  base_income_per_min numeric DEFAULT 100,
  country_id text REFERENCES countries(id)
);

-- 5. Region state tablosu
CREATE TABLE region_state (
  region_id text PRIMARY KEY REFERENCES regions(id) ON DELETE CASCADE,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  defender_soldiers integer DEFAULT 0,
  last_income_claim timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. User soldiers tablosu
CREATE TABLE IF NOT EXISTS user_soldiers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  soldiers integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- 7. RLS etkinleştir
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE region_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_soldiers ENABLE ROW LEVEL SECURITY;

-- 8. Policies
DROP POLICY IF EXISTS "Anyone can read countries" ON countries;
DROP POLICY IF EXISTS "Anyone can read regions" ON regions;
DROP POLICY IF EXISTS "Anyone can read region state" ON region_state;
DROP POLICY IF EXISTS "Anyone can read user soldiers" ON user_soldiers;
DROP POLICY IF EXISTS "Users can update own soldiers" ON user_soldiers;

CREATE POLICY "Anyone can read countries" ON countries FOR SELECT USING (true);
CREATE POLICY "Anyone can read regions" ON regions FOR SELECT USING (true);
CREATE POLICY "Anyone can read region state" ON region_state FOR SELECT USING (true);
CREATE POLICY "Anyone can read user soldiers" ON user_soldiers FOR SELECT USING (true);
CREATE POLICY "Users can update own soldiers" ON user_soldiers FOR ALL USING (auth.uid() = user_id);

-- 9. Ülkeler
INSERT INTO countries (id, name, flag, description) VALUES
  ('turkey', 'Türkiye', '🇹🇷', 'Avrupa ve Asya köprüsü'),
  ('italy', 'İtalya', '🇮🇹', 'Mafyanın doğduğu yer'),
  ('usa', 'ABD', '🇺🇸', 'Yeraltı dünyasının merkezi'),
  ('russia', 'Rusya', '🇷🇺', 'Güçlü mafya ağları');

-- 10. Şehirler
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

-- 11. Bölge durumları
INSERT INTO region_state (region_id, owner_user_id, defender_soldiers) VALUES
('tr_istanbul', NULL, 180),
('tr_ankara', NULL, 140),
('tr_izmir', NULL, 120),
('tr_bursa', NULL, 100),
('tr_antalya', NULL, 110),
('tr_adana', NULL, 85),
('tr_gaziantep', NULL, 95),
('tr_konya', NULL, 70),
('tr_mersin', NULL, 105),
('tr_trabzon', NULL, 80),
('it_roma', NULL, 190),
('it_milano', NULL, 200),
('it_napoli', NULL, 170),
('it_torino', NULL, 140),
('it_palermo', NULL, 180),
('it_genova', NULL, 130),
('it_bologna', NULL, 110),
('it_firenze', NULL, 120),
('it_bari', NULL, 100),
('it_catania', NULL, 105),
('us_newyork', NULL, 200),
('us_losangeles', NULL, 190),
('us_chicago', NULL, 180),
('us_houston', NULL, 160),
('us_miami', NULL, 175),
('us_lasvegas', NULL, 200),
('us_sanfrancisco', NULL, 170),
('us_boston', NULL, 140),
('us_detroit', NULL, 110),
('us_atlanta', NULL, 130),
('ru_moskova', NULL, 200),
('ru_stpetersburg', NULL, 180),
('ru_novosibirsk', NULL, 110),
('ru_yekaterinburg', NULL, 130),
('ru_kazan', NULL, 100),
('ru_nizhniy', NULL, 95),
('ru_samara', NULL, 85),
('ru_chelyabinsk', NULL, 100),
('ru_omsk', NULL, 80),
('ru_rostov', NULL, 105);

-- 12. Fonksiyonlar
CREATE FUNCTION rpc_attack_region(p_region_id text, p_attackers_to_send integer)
RETURNS TABLE(success boolean, message text) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_soldiers integer;
  v_defender_soldiers integer;
  v_owner_id uuid;
BEGIN
  SELECT soldiers INTO v_user_soldiers FROM user_soldiers WHERE user_id = v_user_id;
  IF v_user_soldiers IS NULL OR v_user_soldiers < p_attackers_to_send THEN
    RETURN QUERY SELECT false, 'Yetersiz asker!'::text;
    RETURN;
  END IF;
  SELECT defender_soldiers, owner_user_id INTO v_defender_soldiers, v_owner_id FROM region_state WHERE region_id = p_region_id;
  IF v_owner_id = v_user_id THEN
    RETURN QUERY SELECT false, 'Kendi bölgenize saldıramazsınız!'::text;
    RETURN;
  END IF;
  UPDATE user_soldiers SET soldiers = soldiers - p_attackers_to_send, updated_at = now() WHERE user_id = v_user_id;
  IF p_attackers_to_send >= (COALESCE(v_defender_soldiers, 0) * 1.5) THEN
    UPDATE region_state SET owner_user_id = v_user_id, defender_soldiers = GREATEST(0, p_attackers_to_send - COALESCE(v_defender_soldiers, 0)), updated_at = now() WHERE region_id = p_region_id;
    RETURN QUERY SELECT true, 'Bölge ele geçirildi!'::text;
  ELSE
    UPDATE region_state SET defender_soldiers = GREATEST(0, COALESCE(defender_soldiers, 0) - (p_attackers_to_send / 2)), updated_at = now() WHERE region_id = p_region_id;
    RETURN QUERY SELECT false, 'Saldırı başarısız!'::text;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE FUNCTION rpc_reinforce_region(p_region_id text, p_soldiers integer)
RETURNS TABLE(success boolean, message text) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_soldiers integer;
  v_owner_id uuid;
BEGIN
  SELECT soldiers INTO v_user_soldiers FROM user_soldiers WHERE user_id = v_user_id;
  IF v_user_soldiers IS NULL OR v_user_soldiers < p_soldiers THEN
    RETURN QUERY SELECT false, 'Yetersiz asker!'::text;
    RETURN;
  END IF;
  SELECT owner_user_id INTO v_owner_id FROM region_state WHERE region_id = p_region_id;
  IF v_owner_id IS NULL OR v_owner_id != v_user_id THEN
    RETURN QUERY SELECT false, 'Bu bölge size ait değil!'::text;
    RETURN;
  END IF;
  UPDATE user_soldiers SET soldiers = soldiers - p_soldiers, updated_at = now() WHERE user_id = v_user_id;
  UPDATE region_state SET defender_soldiers = defender_soldiers + p_soldiers, updated_at = now() WHERE region_id = p_region_id;
  RETURN QUERY SELECT true, 'Asker gönderildi!'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE FUNCTION rpc_claim_income()
RETURNS TABLE(total_claimed numeric) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_total numeric := 0;
  v_region record;
BEGIN
  FOR v_region IN
    SELECT rs.region_id, rs.last_income_claim, r.base_income_per_min
    FROM region_state rs JOIN regions r ON r.id = rs.region_id
    WHERE rs.owner_user_id = v_user_id
  LOOP
    v_total := v_total + (v_region.base_income_per_min * EXTRACT(EPOCH FROM (now() - v_region.last_income_claim)) / 60);
    UPDATE region_state SET last_income_claim = now() WHERE region_id = v_region.region_id;
  END LOOP;
  RETURN QUERY SELECT v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE FUNCTION ensure_user_initialized()
RETURNS void AS $$
BEGIN
  INSERT INTO user_soldiers (user_id, soldiers) VALUES (auth.uid(), 0) ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. İzinler
GRANT EXECUTE ON FUNCTION rpc_attack_region(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_reinforce_region(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_claim_income() TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_user_initialized() TO authenticated;

-- Bitti!
SELECT '✅ Başarılı! 4 ülke, 40 şehir eklendi.' AS durum;
