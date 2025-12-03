/*
  # Aile Malikanesi Sistemi
  
  Bu migration aile malikanesi sistemini ekler:
  - Malikane seviyeleri ve özellikleri
  - Pasif gelir sistemi
  - Soldato koruması
  - İnşaat ve geliştirme sistemi
*/

-- Families tablosuna malikane alanları ekle
DO $$ 
BEGIN
    -- Malikane seviyesi (0 = yok, 1-10 = seviyeler)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'families' AND column_name = 'mansion_level') THEN
        ALTER TABLE families ADD COLUMN mansion_level INTEGER DEFAULT 0;
    END IF;
    
    -- Malikane koruması (soldato sayısı)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'families' AND column_name = 'mansion_defense') THEN
        ALTER TABLE families ADD COLUMN mansion_defense BIGINT DEFAULT 0;
    END IF;
    
    -- Son pasif gelir zamanı
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'families' AND column_name = 'last_income_time') THEN
        ALTER TABLE families ADD COLUMN last_income_time TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Toplam pasif gelir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'families' AND column_name = 'total_passive_income') THEN
        ALTER TABLE families ADD COLUMN total_passive_income BIGINT DEFAULT 0;
    END IF;
END $$;

-- Malikane seviyeleri ve maliyetleri tablosu
CREATE TABLE IF NOT EXISTS mansion_levels (
  level INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  build_cost BIGINT NOT NULL,
  upgrade_cost BIGINT NOT NULL,
  hourly_income BIGINT NOT NULL,
  required_defense BIGINT NOT NULL,
  max_defense BIGINT NOT NULL
);

-- Malikane seviyelerini ekle (varsa güncelle, yoksa ekle)
INSERT INTO mansion_levels (level, name, description, build_cost, upgrade_cost, hourly_income, required_defense, max_defense) VALUES
(1, 'Küçük Villa', 'Mütevazı bir başlangıç malikanesi', 500000, 750000, 25000, 50, 200),
(2, 'Büyük Villa', 'Daha geniş ve lüks villa', 1250000, 1500000, 60000, 100, 400),
(3, 'Köşk', 'Etkileyici bir köşk yapısı', 2750000, 3000000, 125000, 200, 600),
(4, 'Saray', 'Görkemli saray kompleksi', 5750000, 6000000, 250000, 400, 800),
(5, 'Kale', 'Sağlam savunmalı kale', 11750000, 12000000, 500000, 600, 1200),
(6, 'Citadel', 'Dev citadel kompleksi', 23750000, 24000000, 1000000, 1000, 1600),
(7, 'Fortress', 'Efsanevi kale yapısı', 47750000, 48000000, 2000000, 1500, 2400),
(8, 'Stronghold', 'Efsanevi güçte kale', 95750000, 96000000, 4000000, 2000, 3200),
(9, 'Citadel Maximus', 'Efsanevi citadel', 191750000, 192000000, 8000000, 3000, 4800),
(10, 'Imperial Palace', 'İmparatorluk sarayı', 383750000, 0, 16000000, 5000, 8000)
ON CONFLICT (level) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  build_cost = EXCLUDED.build_cost,
  upgrade_cost = EXCLUDED.upgrade_cost,
  hourly_income = EXCLUDED.hourly_income,
  required_defense = EXCLUDED.required_defense,
  max_defense = EXCLUDED.max_defense;

-- Malikane geçmişi tablosu
CREATE TABLE IF NOT EXISTS mansion_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'build', 'upgrade', 'defend', 'income'
  level_from INTEGER,
  level_to INTEGER,
  cost BIGINT,
  income_amount BIGINT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS politikaları
ALTER TABLE mansion_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE mansion_history ENABLE ROW LEVEL SECURITY;

-- Herkes malikane seviyelerini görebilir
DROP POLICY IF EXISTS "Anyone can view mansion levels" ON mansion_levels;
CREATE POLICY "Anyone can view mansion levels" ON mansion_levels
  FOR SELECT USING (true);

-- Sadece aile üyeleri malikane geçmişini görebilir
DROP POLICY IF EXISTS "Family members can view mansion history" ON mansion_history;
CREATE POLICY "Family members can view mansion history" ON mansion_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = mansion_history.family_id 
      AND family_members.player_id = auth.uid()
    )
  );

-- Sadece lider malikane geçmişi ekleyebilir
DROP POLICY IF EXISTS "Leaders can insert mansion history" ON mansion_history;
CREATE POLICY "Leaders can insert mansion history" ON mansion_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = mansion_history.family_id 
      AND family_members.player_id = auth.uid()
      AND family_members.role = 'capo'
    )
  );

-- Malikane inşa/geliştirme fonksiyonu (güvenli - CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION build_upgrade_mansion(
  p_action TEXT, -- 'build' veya 'upgrade'
  p_defense_soldiers BIGINT DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_family_id UUID;
  v_user_role TEXT;
  v_current_level INTEGER;
  v_target_level INTEGER;
  v_cost BIGINT;
  v_current_cash BIGINT;
  v_required_defense BIGINT;
  v_current_treasury BIGINT;
  v_mansion_info RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Kullanıcı bulunamadı');
  END IF;

  -- Kullanıcının aile bilgilerini al
  SELECT fm.family_id, fm.role, f.mansion_level, f.cash_treasury, f.treasury
  INTO v_family_id, v_user_role, v_current_level, v_current_cash, v_current_treasury
  FROM family_members fm
  JOIN families f ON f.id = fm.family_id
  WHERE fm.player_id = v_user_id;

  IF v_family_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Aile bulunamadı');
  END IF;

  IF v_user_role != 'capo' THEN
    RETURN json_build_object('success', false, 'message', 'Sadece lider (capo) malikane inşa/geliştirme yapabilir');
  END IF;

  -- Hedef seviyeyi belirle
  IF p_action = 'build' THEN
    IF v_current_level > 0 THEN
      RETURN json_build_object('success', false, 'message', 'Malikane zaten mevcut');
    END IF;
    v_target_level := 1;
  ELSIF p_action = 'upgrade' THEN
    IF v_current_level = 0 THEN
      RETURN json_build_object('success', false, 'message', 'Önce malikane inşa edilmeli');
    END IF;
    IF v_current_level >= 10 THEN
      RETURN json_build_object('success', false, 'message', 'Malikane maksimum seviyede');
    END IF;
    v_target_level := v_current_level + 1;
  ELSE
    RETURN json_build_object('success', false, 'message', 'Geçersiz işlem');
  END IF;

  -- Malikane bilgilerini al
  SELECT * INTO v_mansion_info
  FROM mansion_levels
  WHERE level = v_target_level;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Malikane seviyesi bulunamadı');
  END IF;

  -- Maliyeti belirle
  IF p_action = 'build' THEN
    v_cost := v_mansion_info.build_cost;
  ELSE
    v_cost := v_mansion_info.upgrade_cost;
  END IF;

  -- Para kontrolü
  IF v_current_cash < v_cost THEN
    RETURN json_build_object(
      'success', false, 
      'message', format('Yetersiz para! Gerekli: %s, Mevcut: %s', 
        v_cost::TEXT, v_current_cash::TEXT)
    );
  END IF;

  -- Savunma kontrolü
  v_required_defense := v_mansion_info.required_defense;
  IF v_current_treasury < v_required_defense THEN
    RETURN json_build_object(
      'success', false, 
      'message', format('Yetersiz soldato! Gerekli: %s, Mevcut: %s', 
        v_required_defense::TEXT, v_current_treasury::TEXT)
    );
  END IF;

  -- İşlemi gerçekleştir
  UPDATE families 
  SET 
    mansion_level = v_target_level,
    cash_treasury = cash_treasury - v_cost,
    mansion_defense = LEAST(p_defense_soldiers, v_mansion_info.max_defense),
    treasury = treasury - p_defense_soldiers,
    last_income_time = NOW()
  WHERE id = v_family_id;

  -- Geçmişe kaydet
  INSERT INTO mansion_history (family_id, action_type, level_from, level_to, cost, description)
  VALUES (
    v_family_id, 
    p_action, 
    v_current_level, 
    v_target_level, 
    v_cost,
    format('%s seviyesi %s tamamlandı', v_mansion_info.name, p_action)
  );

  RETURN json_build_object(
    'success', true, 
    'message', format('%s başarıyla %s edildi!', v_mansion_info.name, 
      CASE WHEN p_action = 'build' THEN 'inşa' ELSE 'geliştirme' END),
    'level', v_target_level,
    'name', v_mansion_info.name,
    'hourly_income', v_mansion_info.hourly_income
  );
END;
$$;

-- Pasif gelir toplama fonksiyonu (güvenli - CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION collect_mansion_income()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_family_id UUID;
  v_user_role TEXT;
  v_mansion_level INTEGER;
  v_last_income TIMESTAMP WITH TIME ZONE;
  v_hourly_income BIGINT;
  v_hours_passed NUMERIC;
  v_income_amount BIGINT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Kullanıcı bulunamadı');
  END IF;

  -- Kullanıcının aile bilgilerini al
  SELECT fm.family_id, fm.role, f.mansion_level, f.last_income_time
  INTO v_family_id, v_user_role, v_mansion_level, v_last_income
  FROM family_members fm
  JOIN families f ON f.id = fm.family_id
  WHERE fm.player_id = v_user_id;

  IF v_family_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Aile bulunamadı');
  END IF;

  IF v_user_role != 'capo' THEN
    RETURN json_build_object('success', false, 'message', 'Sadece lider (capo) gelir toplayabilir');
  END IF;

  IF v_mansion_level = 0 THEN
    RETURN json_build_object('success', false, 'message', 'Malikane bulunmuyor');
  END IF;

  -- Saatlik geliri al
  SELECT hourly_income INTO v_hourly_income
  FROM mansion_levels
  WHERE level = v_mansion_level;

  -- Geçen saatleri hesapla
  v_hours_passed := EXTRACT(EPOCH FROM (NOW() - v_last_income)) / 3600;
  
  IF v_hours_passed < 1 THEN
    RETURN json_build_object('success', false, 'message', 'Henüz gelir toplanacak kadar zaman geçmedi');
  END IF;

  -- Maksimum 24 saat gelir
  v_hours_passed := LEAST(v_hours_passed, 24);
  v_income_amount := FLOOR(v_hourly_income * v_hours_passed);

  -- Geliri ekle
  UPDATE families 
  SET 
    cash_treasury = cash_treasury + v_income_amount,
    total_passive_income = total_passive_income + v_income_amount,
    last_income_time = NOW()
  WHERE id = v_family_id;

  -- Geçmişe kaydet
  INSERT INTO mansion_history (family_id, action_type, income_amount, description)
  VALUES (
    v_family_id, 
    'income', 
    v_income_amount,
    format('%.1f saat pasif gelir toplandı', v_hours_passed)
  );

  RETURN json_build_object(
    'success', true, 
    'message', format('%.1f saat gelir toplandı!', v_hours_passed),
    'income_amount', v_income_amount,
    'hours', v_hours_passed
  );
END;
$$;
