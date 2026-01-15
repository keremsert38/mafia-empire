-- =====================================================
-- ÜRETİM ZİNCİRİ VE FABRİKA SİSTEMİ
-- =====================================================

-- 1. KAYNAKLAR (Resources) Tablosu
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  tier INTEGER DEFAULT 1 CHECK (tier IN (1, 2, 3)),
  -- tier 1: Hammadde, tier 2: İşlenmiş, tier 3: Son Ürün
  category TEXT CHECK (category IN ('raw', 'processed', 'final')),
  icon TEXT DEFAULT '📦',
  base_value INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TARİFLER (Recipes) Tablosu
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  output_resource_id UUID REFERENCES resources(id),
  output_quantity INTEGER DEFAULT 1,
  production_time INTEGER DEFAULT 10, -- Dakika
  required_business_id TEXT, -- Hangi işletme üretebilir
  required_level INTEGER DEFAULT 1,
  cost INTEGER DEFAULT 0, -- Üretim maliyeti ($)
  is_active BOOLEAN DEFAULT TRUE
);

-- 3. TARİF MALZEMELERİ
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES resources(id),
  quantity INTEGER NOT NULL
);

-- 4. OYUNCU KAYNAKLARI (Envanter)
CREATE TABLE IF NOT EXISTS player_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES auth.users(id),
  resource_id UUID REFERENCES resources(id),
  quantity INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, resource_id)
);

-- 5. ÜRETİM KUYRUĞU
CREATE TABLE IF NOT EXISTS production_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES auth.users(id),
  business_id TEXT NOT NULL,
  recipe_id UUID REFERENCES recipes(id),
  quantity INTEGER DEFAULT 1,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completes_at TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT FALSE,
  is_collected BOOLEAN DEFAULT FALSE
);

-- RLS Policies
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_queue ENABLE ROW LEVEL SECURITY;

-- Herkes kaynakları ve tarifleri görebilir
CREATE POLICY "Resources viewable by all" ON resources FOR SELECT USING (true);
CREATE POLICY "Recipes viewable by all" ON recipes FOR SELECT USING (true);
CREATE POLICY "Recipe ingredients viewable by all" ON recipe_ingredients FOR SELECT USING (true);

-- Oyuncular kendi envanterlerini görebilir
CREATE POLICY "Players view own resources" ON player_resources 
  FOR SELECT USING (player_id = auth.uid());
CREATE POLICY "Players insert own resources" ON player_resources 
  FOR INSERT WITH CHECK (player_id = auth.uid());
CREATE POLICY "Players update own resources" ON player_resources 
  FOR UPDATE USING (player_id = auth.uid());

-- Üretim kuyruğu
CREATE POLICY "Players view own queue" ON production_queue 
  FOR SELECT USING (player_id = auth.uid());
CREATE POLICY "Players insert own queue" ON production_queue 
  FOR INSERT WITH CHECK (player_id = auth.uid());
CREATE POLICY "Players update own queue" ON production_queue 
  FOR UPDATE USING (player_id = auth.uid());

-- =====================================================
-- HAMMADDELER (Tier 1)
-- =====================================================
INSERT INTO resources (name, name_en, description, tier, category, icon, base_value) VALUES
('Tohum', 'Seed', 'Tarım için temel hammadde', 1, 'raw', '🌱', 50),
('Demir Cevheri', 'Iron Ore', 'Madenlerden çıkarılan ham demir', 1, 'raw', '🪨', 100),
('Barut', 'Gunpowder', 'Patlayıcı madde', 1, 'raw', '🧪', 150),
('Kereste', 'Lumber', 'Ham ahşap malzeme', 1, 'raw', '🪵', 75),
('Kimyasal', 'Chemical', 'İlaç üretimi için', 1, 'raw', '🧬', 200),
('Bakır Cevheri', 'Copper Ore', 'Elektrik için gerekli', 1, 'raw', '🟤', 120),
('Kauçuk', 'Rubber', 'Esnek malzeme', 1, 'raw', '⚫', 90),
('Cam', 'Glass', 'Şeffaf malzeme', 1, 'raw', '🔷', 80);

-- =====================================================
-- İŞLENMİŞ ÜRÜNLER (Tier 2)
-- =====================================================
INSERT INTO resources (name, name_en, description, tier, category, icon, base_value) VALUES
('Elma', 'Apple', 'Taze meyve', 2, 'processed', '🍎', 120),
('Demir Külçe', 'Iron Ingot', 'İşlenmiş demir', 2, 'processed', '⚙️', 350),
('Namlu', 'Barrel', 'Silah parçası', 2, 'processed', '🔧', 600),
('Ahşap Kabza', 'Wooden Grip', 'Silah parçası', 2, 'processed', '🪑', 250),
('İlaç', 'Medicine', 'Sağlık ürünü', 2, 'processed', '💊', 400),
('Bakır Tel', 'Copper Wire', 'Elektrik için', 2, 'processed', '🔌', 300),
('Şarjör', 'Magazine', 'Mermi deposu', 2, 'processed', '📦', 450),
('Dürbün', 'Scope', 'Nişangah parçası', 2, 'processed', '🔭', 500);

-- =====================================================
-- SON ÜRÜNLER (Tier 3)
-- =====================================================
INSERT INTO resources (name, name_en, description, tier, category, icon, base_value) VALUES
('Baretta 9mm', 'Baretta 9mm', 'Temel tabanca', 3, 'final', '🔫', 800),
('AK-47', 'AK-47', 'Saldırı tüfeği', 3, 'final', '🔫', 2500),
('Keskin Nişancı', 'Sniper Rifle', 'Uzun menzil', 3, 'final', '🎯', 4000),
('Yemek Paketi', 'Meal Pack', '+20 Enerji', 3, 'final', '🍔', 300),
('Sağlık Kiti', 'Health Kit', '+50 HP', 3, 'final', '🏥', 600),
('Premium Yemek', 'Premium Meal', '+50 Enerji', 3, 'final', '🍖', 800);

-- =====================================================
-- YENİ FABRİKALAR (businesses tablosuna eklenecek)
-- =====================================================

-- Mevcut businesses tablosuna category kolonu ekle
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'business';
-- business_type: 'business' (normal işletme), 'factory' (fabrika)

-- Fabrikaları ekle (type, upgrade_cost, upgrade_time dahil)
INSERT INTO businesses (id, name, type, category, description, base_income, build_cost, upgrade_cost, build_time, upgrade_time, required_level, risk_level, legal_status, defense, max_level, business_type) VALUES
-- Hammadde Fabrikaları (Pahalı!)
('fab_sera', 'Sera', 'factory', 'Üretim', 'Tohum üretimi yapar', 0, 50000, 25000, 120, 60, 5, 'low', 'legal', 10, 10, 'factory'),
('fab_maden', 'Demir Madeni', 'factory', 'Üretim', 'Demir cevheri çıkarır', 0, 100000, 50000, 180, 90, 8, 'medium', 'illegal', 20, 10, 'factory'),
('fab_orman', 'Kereste Fabrikası', 'factory', 'Üretim', 'Kereste üretir', 0, 75000, 37500, 150, 75, 6, 'low', 'legal', 15, 10, 'factory'),
('fab_kimya', 'Kimya Fabrikası', 'factory', 'Üretim', 'Barut ve kimyasal üretir', 0, 150000, 75000, 240, 120, 10, 'high', 'illegal', 30, 10, 'factory'),

-- İşleme Fabrikaları
('fab_demir', 'Demir İşleme', 'factory', 'İşleme', 'Demir külçe ve namlu üretir', 0, 200000, 100000, 300, 150, 12, 'medium', 'legal', 25, 10, 'factory'),
('fab_marangoz', 'Marangoz Atölyesi', 'factory', 'İşleme', 'Ahşap parçalar üretir', 0, 80000, 40000, 120, 60, 7, 'low', 'legal', 10, 10, 'factory'),
('fab_ilac', 'İlaç Fabrikası', 'factory', 'İşleme', 'İlaç üretir', 0, 180000, 90000, 240, 120, 11, 'medium', 'illegal', 20, 10, 'factory'),

-- Son Ürün Fabrikaları (Çok Pahalı!)
('fab_silah', 'Silah Fabrikası', 'factory', 'Silah', 'Silah üretir', 0, 500000, 250000, 480, 240, 15, 'high', 'illegal', 50, 10, 'factory'),
('fab_restoran', 'Lüks Restoran', 'factory', 'Gıda', 'Yemek paketi üretir', 0, 120000, 60000, 180, 90, 9, 'low', 'legal', 15, 10, 'factory'),
('fab_hastane', 'Özel Hastane', 'factory', 'Sağlık', 'Sağlık kiti üretir', 0, 250000, 125000, 300, 150, 13, 'low', 'legal', 30, 10, 'factory')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- TARİFLER (Recipes)
-- =====================================================

-- Hammadde Tarifleri (Tier 1)
INSERT INTO recipes (name, output_resource_id, output_quantity, production_time, required_business_id, cost) VALUES
('Tohum Üret', (SELECT id FROM resources WHERE name = 'Tohum'), 5, 10, 'fab_sera', 100),
('Demir Cevheri Çıkar', (SELECT id FROM resources WHERE name = 'Demir Cevheri'), 3, 15, 'fab_maden', 200),
('Kereste Kes', (SELECT id FROM resources WHERE name = 'Kereste'), 4, 12, 'fab_orman', 150),
('Barut Üret', (SELECT id FROM resources WHERE name = 'Barut'), 2, 20, 'fab_kimya', 300),
('Kimyasal Üret', (SELECT id FROM resources WHERE name = 'Kimyasal'), 2, 25, 'fab_kimya', 400);

-- İşlenmiş Ürün Tarifleri (Tier 2) - bunlar ingredient gerektirir
INSERT INTO recipes (name, output_resource_id, output_quantity, production_time, required_business_id, cost) VALUES
('Elma Yetiştir', (SELECT id FROM resources WHERE name = 'Elma'), 3, 15, 'fab_sera', 50),
('Demir Külçe Dök', (SELECT id FROM resources WHERE name = 'Demir Külçe'), 1, 20, 'fab_demir', 100),
('Namlu Üret', (SELECT id FROM resources WHERE name = 'Namlu'), 1, 25, 'fab_demir', 200),
('Ahşap Kabza Yap', (SELECT id FROM resources WHERE name = 'Ahşap Kabza'), 1, 15, 'fab_marangoz', 100),
('İlaç Üret', (SELECT id FROM resources WHERE name = 'İlaç'), 1, 20, 'fab_ilac', 150),
('Şarjör Üret', (SELECT id FROM resources WHERE name = 'Şarjör'), 1, 18, 'fab_demir', 180);

-- Son Ürün Tarifleri (Tier 3)
INSERT INTO recipes (name, output_resource_id, output_quantity, production_time, required_business_id, cost) VALUES
('Baretta 9mm Monte Et', (SELECT id FROM resources WHERE name = 'Baretta 9mm'), 1, 30, 'fab_silah', 300),
('AK-47 Monte Et', (SELECT id FROM resources WHERE name = 'AK-47'), 1, 60, 'fab_silah', 500),
('Keskin Nişancı Üret', (SELECT id FROM resources WHERE name = 'Keskin Nişancı'), 1, 90, 'fab_silah', 800),
('Yemek Paketi Hazırla', (SELECT id FROM resources WHERE name = 'Yemek Paketi'), 2, 20, 'fab_restoran', 100),
('Premium Yemek Hazırla', (SELECT id FROM resources WHERE name = 'Premium Yemek'), 1, 30, 'fab_restoran', 200),
('Sağlık Kiti Hazırla', (SELECT id FROM resources WHERE name = 'Sağlık Kiti'), 1, 25, 'fab_hastane', 250);

-- =====================================================
-- TARİF MALZEMELERİ (Recipe Ingredients)
-- =====================================================

-- Elma: 2x Tohum
INSERT INTO recipe_ingredients (recipe_id, resource_id, quantity)
SELECT r.id, res.id, 2
FROM recipes r, resources res
WHERE r.name = 'Elma Yetiştir' AND res.name = 'Tohum';

-- Demir Külçe: 3x Demir Cevheri
INSERT INTO recipe_ingredients (recipe_id, resource_id, quantity)
SELECT r.id, res.id, 3
FROM recipes r, resources res
WHERE r.name = 'Demir Külçe Dök' AND res.name = 'Demir Cevheri';

-- Namlu: 2x Demir Külçe
INSERT INTO recipe_ingredients (recipe_id, resource_id, quantity)
SELECT r.id, res.id, 2
FROM recipes r, resources res
WHERE r.name = 'Namlu Üret' AND res.name = 'Demir Külçe';

-- Ahşap Kabza: 2x Kereste
INSERT INTO recipe_ingredients (recipe_id, resource_id, quantity)
SELECT r.id, res.id, 2
FROM recipes r, resources res
WHERE r.name = 'Ahşap Kabza Yap' AND res.name = 'Kereste';

-- İlaç: 2x Kimyasal
INSERT INTO recipe_ingredients (recipe_id, resource_id, quantity)
SELECT r.id, res.id, 2
FROM recipes r, resources res
WHERE r.name = 'İlaç Üret' AND res.name = 'Kimyasal';

-- Şarjör: 1x Demir Külçe + 1x Bakır Tel
INSERT INTO recipe_ingredients (recipe_id, resource_id, quantity)
SELECT r.id, res.id, 1
FROM recipes r, resources res
WHERE r.name = 'Şarjör Üret' AND res.name = 'Demir Külçe';

-- Baretta 9mm: 1x Namlu + 1x Ahşap Kabza
INSERT INTO recipe_ingredients (recipe_id, resource_id, quantity)
SELECT r.id, res.id, 1
FROM recipes r, resources res
WHERE r.name = 'Baretta 9mm Monte Et' AND res.name = 'Namlu';

INSERT INTO recipe_ingredients (recipe_id, resource_id, quantity)
SELECT r.id, res.id, 1
FROM recipes r, resources res
WHERE r.name = 'Baretta 9mm Monte Et' AND res.name = 'Ahşap Kabza';

-- AK-47: 2x Namlu + 1x Ahşap Kabza + 2x Barut + 1x Şarjör
INSERT INTO recipe_ingredients (recipe_id, resource_id, quantity)
SELECT r.id, res.id, 2
FROM recipes r, resources res
WHERE r.name = 'AK-47 Monte Et' AND res.name = 'Namlu';

INSERT INTO recipe_ingredients (recipe_id, resource_id, quantity)
SELECT r.id, res.id, 1
FROM recipes r, resources res
WHERE r.name = 'AK-47 Monte Et' AND res.name = 'Ahşap Kabza';

INSERT INTO recipe_ingredients (recipe_id, resource_id, quantity)
SELECT r.id, res.id, 2
FROM recipes r, resources res
WHERE r.name = 'AK-47 Monte Et' AND res.name = 'Barut';

INSERT INTO recipe_ingredients (recipe_id, resource_id, quantity)
SELECT r.id, res.id, 1
FROM recipes r, resources res
WHERE r.name = 'AK-47 Monte Et' AND res.name = 'Şarjör';

-- Keskin Nişancı: 3x Namlu + 1x Ahşap Kabza + 1x Dürbün + 2x Barut
INSERT INTO recipe_ingredients (recipe_id, resource_id, quantity)
SELECT r.id, res.id, 3
FROM recipes r, resources res
WHERE r.name = 'Keskin Nişancı Üret' AND res.name = 'Namlu';

INSERT INTO recipe_ingredients (recipe_id, resource_id, quantity)
SELECT r.id, res.id, 1
FROM recipes r, resources res
WHERE r.name = 'Keskin Nişancı Üret' AND res.name = 'Ahşap Kabza';

INSERT INTO recipe_ingredients (recipe_id, resource_id, quantity)
SELECT r.id, res.id, 2
FROM recipes r, resources res
WHERE r.name = 'Keskin Nişancı Üret' AND res.name = 'Barut';

-- Yemek Paketi: 3x Elma
INSERT INTO recipe_ingredients (recipe_id, resource_id, quantity)
SELECT r.id, res.id, 3
FROM recipes r, resources res
WHERE r.name = 'Yemek Paketi Hazırla' AND res.name = 'Elma';

-- Premium Yemek: 5x Elma + 2x Kimyasal
INSERT INTO recipe_ingredients (recipe_id, resource_id, quantity)
SELECT r.id, res.id, 5
FROM recipes r, resources res
WHERE r.name = 'Premium Yemek Hazırla' AND res.name = 'Elma';

-- Sağlık Kiti: 3x İlaç
INSERT INTO recipe_ingredients (recipe_id, resource_id, quantity)
SELECT r.id, res.id, 3
FROM recipes r, resources res
WHERE r.name = 'Sağlık Kiti Hazırla' AND res.name = 'İlaç';

-- =====================================================
-- ÜRETİM FONKSİYONLARI
-- =====================================================

-- Üretim başlat
CREATE OR REPLACE FUNCTION start_production(
  p_business_id TEXT,
  p_recipe_id UUID,
  p_quantity INTEGER DEFAULT 1
) RETURNS JSONB AS $$
DECLARE
  v_recipe RECORD;
  v_ingredient RECORD;
  v_player_resource INTEGER;
  v_total_cost INTEGER;
  v_player_cash INTEGER;
  v_completes_at TIMESTAMPTZ;
BEGIN
  -- Tarif bilgisini al
  SELECT * INTO v_recipe FROM recipes WHERE id = p_recipe_id AND is_active = TRUE;
  IF v_recipe IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Tarif bulunamadı');
  END IF;

  -- İşletme kontrolü
  IF v_recipe.required_business_id != p_business_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Bu işletmede bu tarif üretilemez');
  END IF;

  -- Maliyet kontrolü
  v_total_cost := v_recipe.cost * p_quantity;
  SELECT cash INTO v_player_cash FROM player_stats WHERE id = auth.uid();
  IF v_player_cash < v_total_cost THEN
    RETURN jsonb_build_object('success', false, 'message', 'Yeterli paranız yok');
  END IF;

  -- Malzeme kontrolü
  FOR v_ingredient IN SELECT * FROM recipe_ingredients WHERE recipe_id = p_recipe_id LOOP
    SELECT COALESCE(quantity, 0) INTO v_player_resource
    FROM player_resources
    WHERE player_id = auth.uid() AND resource_id = v_ingredient.resource_id;

    IF v_player_resource < (v_ingredient.quantity * p_quantity) THEN
      RETURN jsonb_build_object('success', false, 'message', 'Yeterli malzeme yok');
    END IF;
  END LOOP;

  -- Malzemeleri düş
  FOR v_ingredient IN SELECT * FROM recipe_ingredients WHERE recipe_id = p_recipe_id LOOP
    UPDATE player_resources
    SET quantity = quantity - (v_ingredient.quantity * p_quantity),
        updated_at = NOW()
    WHERE player_id = auth.uid() AND resource_id = v_ingredient.resource_id;
  END LOOP;

  -- Parayı düş
  UPDATE player_stats SET cash = cash - v_total_cost WHERE id = auth.uid();

  -- Üretim kuyruğuna ekle
  v_completes_at := NOW() + (v_recipe.production_time * p_quantity || ' minutes')::INTERVAL;

  INSERT INTO production_queue (player_id, business_id, recipe_id, quantity, completes_at)
  VALUES (auth.uid(), p_business_id, p_recipe_id, p_quantity, v_completes_at);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Üretim başladı!',
    'completes_at', v_completes_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Üretimi topla
CREATE OR REPLACE FUNCTION collect_production(
  p_queue_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_queue RECORD;
  v_recipe RECORD;
BEGIN
  SELECT * INTO v_queue FROM production_queue
  WHERE id = p_queue_id AND player_id = auth.uid();

  IF v_queue IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Üretim bulunamadı');
  END IF;

  IF v_queue.completes_at > NOW() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Üretim henüz tamamlanmadı');
  END IF;

  IF v_queue.is_collected THEN
    RETURN jsonb_build_object('success', false, 'message', 'Zaten toplandı');
  END IF;

  SELECT * INTO v_recipe FROM recipes WHERE id = v_queue.recipe_id;

  -- Ürünü envantere ekle
  INSERT INTO player_resources (player_id, resource_id, quantity)
  VALUES (auth.uid(), v_recipe.output_resource_id, v_recipe.output_quantity * v_queue.quantity)
  ON CONFLICT (player_id, resource_id)
  DO UPDATE SET quantity = player_resources.quantity + EXCLUDED.quantity, updated_at = NOW();

  -- Kuyruğu işaretle
  UPDATE production_queue SET is_collected = TRUE, is_completed = TRUE WHERE id = p_queue_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Üretim toplandı!',
    'quantity', v_recipe.output_quantity * v_queue.quantity
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Oyuncu envanterini getir
CREATE OR REPLACE FUNCTION get_player_inventory()
RETURNS TABLE(
  resource_id UUID,
  resource_name TEXT,
  icon TEXT,
  tier INTEGER,
  quantity INTEGER,
  base_value INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.icon,
    r.tier,
    COALESCE(pr.quantity, 0)::INTEGER,
    r.base_value
  FROM resources r
  LEFT JOIN player_resources pr ON pr.resource_id = r.id AND pr.player_id = auth.uid()
  WHERE r.is_active = TRUE AND COALESCE(pr.quantity, 0) > 0
  ORDER BY r.tier, r.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fabrika tariflerini getir
CREATE OR REPLACE FUNCTION get_factory_recipes(p_business_id TEXT)
RETURNS TABLE(
  recipe_id UUID,
  recipe_name TEXT,
  output_resource_name TEXT,
  output_icon TEXT,
  output_quantity INTEGER,
  production_time INTEGER,
  cost INTEGER,
  ingredients JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    res.name,
    res.icon,
    r.output_quantity,
    r.production_time,
    r.cost,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'resource_id', ri.resource_id,
        'resource_name', res2.name,
        'icon', res2.icon,
        'quantity', ri.quantity
      ))
      FROM recipe_ingredients ri
      JOIN resources res2 ON res2.id = ri.resource_id
      WHERE ri.recipe_id = r.id
    )
  FROM recipes r
  JOIN resources res ON res.id = r.output_resource_id
  WHERE r.required_business_id = p_business_id AND r.is_active = TRUE
  ORDER BY r.cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ÖZET:
-- FABRİKALAR:
-- - Sera ($50,000) - Tohum üretir
-- - Demir Madeni ($100,000) - Demir cevheri çıkarır
-- - Kereste Fabrikası ($75,000) - Kereste üretir
-- - Kimya Fabrikası ($150,000) - Barut ve kimyasal üretir
-- - Demir İşleme ($200,000) - Demir külçe, namlu üretir
-- - Marangoz ($80,000) - Ahşap parçalar üretir
-- - İlaç Fabrikası ($180,000) - İlaç üretir
-- - Silah Fabrikası ($500,000) - Silah üretir
-- - Lüks Restoran ($120,000) - Yemek üretir
-- - Özel Hastane ($250,000) - Sağlık kiti üretir
-- =====================================================
