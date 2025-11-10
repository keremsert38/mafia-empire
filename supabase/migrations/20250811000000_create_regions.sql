/*
  # Bölge (Regions) Sistemi

  1. Yeni Tablolar
    - `regions` - Oyun bölgeleri (harita)
    - `region_state` - Bölgelerin mevcut durumu (sahip, asker sayısı)
    - `user_soldiers` - Kullanıcıların asker sayısı
    
  2. Güvenlik
    - RLS etkin
    - Herkes bölgeleri okuyabilir
    - Sadece sistem bölge durumunu güncelleyebilir
    
  3. RPC Fonksiyonlar
    - rpc_attack_region - Bölgeye saldırı
    - rpc_claim_income - Pasif gelir toplama
    - ensure_user_initialized - Kullanıcı başlangıç verilerini oluştur
*/

-- Regions tablosu (sabit bölge verileri)
CREATE TABLE IF NOT EXISTS regions (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  base_income_per_min numeric DEFAULT 100
);

-- Region state tablosu (dinamik bölge durumu)
CREATE TABLE IF NOT EXISTS region_state (
  region_id text PRIMARY KEY REFERENCES regions(id) ON DELETE CASCADE,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  defender_soldiers integer DEFAULT 0,
  last_income_claim timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User soldiers tablosu (kullanıcı asker sayısı)
CREATE TABLE IF NOT EXISTS user_soldiers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  soldiers integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- RLS'yi etkinleştir
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE region_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_soldiers ENABLE ROW LEVEL SECURITY;

-- Policies - herkes okuyabilir
CREATE POLICY "Anyone can read regions" ON regions
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read region state" ON region_state
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read user soldiers" ON user_soldiers
  FOR SELECT USING (true);

-- Users can update own soldiers
CREATE POLICY "Users can update own soldiers" ON user_soldiers
  FOR ALL USING (auth.uid() = user_id);

-- Başlangıç bölgelerini ekle
INSERT INTO regions (id, name, description, base_income_per_min) VALUES
  ('downtown', 'Şehir Merkezi', 'Şehrin kalbi, yüksek gelir potansiyeli', 200),
  ('docks', 'Liman Bölgesi', 'Kaçakçılık için ideal', 300),
  ('industrial', 'Sanayi Bölgesi', 'Fabrikalar ve depolar', 250),
  ('residential', 'Konut Bölgesi', 'Haraç toplama için uygun', 150),
  ('casino', 'Kumarhane Bölgesi', 'Yüksek gelir, yüksek risk', 400),
  ('warehouse', 'Depo Bölgesi', 'Gizli operasyonlar için ideal', 180),
  ('nightclub', 'Gece Kulübü Bölgesi', 'Eğlence ve kara para', 350),
  ('market', 'Pazar Bölgesi', 'Ticaret merkezi', 220)
ON CONFLICT (id) DO NOTHING;

-- Başlangıç bölge durumlarını ekle (hepsi boş)
INSERT INTO region_state (region_id, owner_user_id, defender_soldiers)
SELECT id, NULL, 0 FROM regions
ON CONFLICT (region_id) DO NOTHING;

-- Kullanıcı başlangıç verilerini oluştur
CREATE OR REPLACE FUNCTION ensure_user_initialized()
RETURNS void AS $$
BEGIN
  -- User soldiers kaydı oluştur
  INSERT INTO user_soldiers (user_id, soldiers)
  VALUES (auth.uid(), 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bölgeye saldırı RPC
CREATE OR REPLACE FUNCTION rpc_attack_region(
  p_region_id text,
  p_attackers_to_send integer
)
RETURNS TABLE(success boolean, message text) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_soldiers integer;
  v_defender_soldiers integer;
  v_owner_id uuid;
BEGIN
  -- Kullanıcının asker sayısını al
  SELECT soldiers INTO v_user_soldiers
  FROM user_soldiers
  WHERE user_id = v_user_id;

  -- Yeterli asker var mı?
  IF v_user_soldiers < p_attackers_to_send THEN
    RETURN QUERY SELECT false, 'Yetersiz asker!';
    RETURN;
  END IF;

  -- Bölge durumunu al
  SELECT defender_soldiers, owner_user_id INTO v_defender_soldiers, v_owner_id
  FROM region_state
  WHERE region_id = p_region_id;

  -- Kendi bölgesine saldıramasın
  IF v_owner_id = v_user_id THEN
    RETURN QUERY SELECT false, 'Kendi bölgenize saldıramazsınız!';
    RETURN;
  END IF;

  -- Askerleri düş
  UPDATE user_soldiers
  SET soldiers = soldiers - p_attackers_to_send
  WHERE user_id = v_user_id;

  -- Saldırı sonucu
  IF p_attackers_to_send >= v_defender_soldiers THEN
    -- Başarılı! Bölgeyi ele geçir
    UPDATE region_state
    SET owner_user_id = v_user_id,
        defender_soldiers = p_attackers_to_send - v_defender_soldiers,
        updated_at = now()
    WHERE region_id = p_region_id;

    RETURN QUERY SELECT true, 'Bölge ele geçirildi!';
  ELSE
    -- Başarısız, sadece savunmayı düşür
    UPDATE region_state
    SET defender_soldiers = defender_soldiers - p_attackers_to_send,
        updated_at = now()
    WHERE region_id = p_region_id;

    RETURN QUERY SELECT false, 'Saldırı başarısız, savunma düşürüldü.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pasif gelir toplama RPC
CREATE OR REPLACE FUNCTION rpc_claim_income()
RETURNS TABLE(total_claimed numeric) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_total numeric := 0;
  v_region record;
  v_minutes_elapsed numeric;
BEGIN
  -- Kullanıcının sahip olduğu bölgeleri bul
  FOR v_region IN
    SELECT rs.region_id, rs.last_income_claim, r.base_income_per_min
    FROM region_state rs
    JOIN regions r ON r.id = rs.region_id
    WHERE rs.owner_user_id = v_user_id
  LOOP
    -- Geçen süreyi hesapla (dakika cinsinden)
    v_minutes_elapsed := EXTRACT(EPOCH FROM (now() - v_region.last_income_claim)) / 60;
    
    -- Geliri hesapla
    v_total := v_total + (v_region.base_income_per_min * v_minutes_elapsed);
    
    -- Son talep zamanını güncelle
    UPDATE region_state
    SET last_income_claim = now()
    WHERE region_id = v_region.region_id;
  END LOOP;

  RETURN QUERY SELECT v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log
SELECT 'Regions system created successfully' as message;

