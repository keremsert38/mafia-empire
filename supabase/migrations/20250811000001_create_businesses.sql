/*
  # İşletme (Business) Sistemi

  1. Yeni Tablolar
    - `businesses` - İşletme verileri
    - `user_businesses` - Kullanıcıların sahip olduğu işletmeler
    - `business_income` - İşletme gelir kayıtları
    
  2. Güvenlik
    - RLS etkin
    - Herkes işletmeleri okuyabilir
    - Sadece kendi işletmelerini yönetebilir
    
  3. RPC Fonksiyonlar
    - rpc_build_business - İşletme inşa et
    - rpc_upgrade_business - İşletme geliştir
    - rpc_collect_business_income - Gelir topla
*/

-- Businesses tablosu (sabit işletme verileri)
CREATE TABLE IF NOT EXISTS businesses (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL,
  category text NOT NULL,
  description text,
  base_income numeric NOT NULL,
  build_cost numeric NOT NULL,
  upgrade_cost numeric NOT NULL,
  build_time integer NOT NULL, -- dakika cinsinden
  upgrade_time integer NOT NULL, -- dakika cinsinden
  required_level integer NOT NULL,
  risk_level text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  legal_status text NOT NULL CHECK (legal_status IN ('legal', 'illegal')),
  defense integer DEFAULT 0,
  max_level integer DEFAULT 10
);

-- User businesses tablosu (kullanıcı işletmeleri)
CREATE TABLE IF NOT EXISTS user_businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_id text REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  level integer DEFAULT 1,
  current_income numeric DEFAULT 0,
  is_building boolean DEFAULT false,
  is_upgrading boolean DEFAULT false,
  build_start_time timestamptz,
  upgrade_start_time timestamptz,
  last_income_collection timestamptz DEFAULT now(),
  total_earnings numeric DEFAULT 0,
  efficiency integer DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, business_id)
);

-- Business income tablosu (gelir kayıtları)
CREATE TABLE IF NOT EXISTS business_income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_business_id uuid REFERENCES user_businesses(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  collected_at timestamptz DEFAULT now()
);

-- RLS'yi etkinleştir
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_income ENABLE ROW LEVEL SECURITY;

-- Policies - herkes işletmeleri okuyabilir
CREATE POLICY "Anyone can read businesses" ON businesses
  FOR SELECT USING (true);

-- Users can manage own businesses
CREATE POLICY "Users can manage own businesses" ON user_businesses
  FOR ALL USING (auth.uid() = user_id);

-- Business income policies
CREATE POLICY "Users can read own business income" ON business_income
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_businesses ub 
      WHERE ub.id = business_income.user_business_id 
      AND ub.user_id = auth.uid()
    )
  );

-- Başlangıç işletmelerini ekle
INSERT INTO businesses (id, name, type, category, description, base_income, build_cost, upgrade_cost, build_time, upgrade_time, required_level, risk_level, legal_status, defense, max_level) VALUES
  -- Sokak İşletmeleri
  ('small_shop', 'Küçük Dükkan', 'street', 'Sokak İşletmeleri', 'Basit bir dükkan işletmek', 50, 1000, 2000, 120, 180, 1, 'low', 'legal', 5, 10),
  ('gambling_den', 'Kumarhane', 'street', 'Sokak İşletmeleri', 'Gizli kumar oyunları', 120, 5000, 10000, 240, 360, 3, 'medium', 'illegal', 15, 10),
  
  -- Ticaret İşletmeleri
  ('transport_company', 'Nakliye Şirketi', 'trade', 'Ticaret İşletmeleri', 'Kargo ve nakliye hizmetleri', 200, 15000, 30000, 360, 540, 5, 'low', 'legal', 10, 10),
  ('import_company', 'İthalat Firması', 'trade', 'Ticaret İşletmeleri', 'Uluslararası ticaret', 300, 25000, 50000, 480, 720, 7, 'medium', 'legal', 20, 10),
  
  -- Eğlence İşletmeleri
  ('nightclub', 'Gece Kulübü', 'entertainment', 'Eğlence İşletmeleri', 'Gece eğlence merkezi', 600, 50000, 100000, 480, 720, 8, 'medium', 'legal', 25, 10),
  ('casino', 'Casino', 'entertainment', 'Eğlence İşletmeleri', 'Lüks kumar salonu', 800, 100000, 200000, 720, 1080, 10, 'high', 'illegal', 50, 10),
  
  -- Teknoloji İşletmeleri
  ('software_company', 'Yazılım Şirketi', 'technology', 'Teknoloji İşletmeleri', 'Yazılım geliştirme ve teknoloji', 1000, 200000, 400000, 960, 1440, 12, 'low', 'legal', 30, 10),
  
  -- Finans İşletmeleri
  ('private_bank', 'Özel Banka', 'finance', 'Finans İşletmeleri', 'Özel bankacılık hizmetleri', 2000, 500000, 1000000, 1200, 1800, 15, 'medium', 'legal', 100, 10)
ON CONFLICT (id) DO NOTHING;

-- İşletme inşa et RPC
CREATE OR REPLACE FUNCTION rpc_build_business(
  p_business_id text
)
RETURNS TABLE(success boolean, message text) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_business record;
  v_user_cash numeric;
  v_business_exists boolean;
BEGIN
  -- İşletme bilgilerini al
  SELECT * INTO v_business FROM businesses WHERE id = p_business_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'İşletme bulunamadı!';
    RETURN;
  END IF;

  -- Kullanıcının parasını kontrol et
  SELECT cash INTO v_user_cash FROM player_stats WHERE id = v_user_id;
  
  IF v_user_cash < v_business.build_cost THEN
    RETURN QUERY SELECT false, 'Yetersiz para!';
    RETURN;
  END IF;

  -- Zaten sahip mi kontrol et
  SELECT EXISTS(
    SELECT 1 FROM user_businesses 
    WHERE user_id = v_user_id AND business_id = p_business_id
  ) INTO v_business_exists;
  
  IF v_business_exists THEN
    RETURN QUERY SELECT false, 'Bu işletmeye zaten sahipsiniz!';
    RETURN;
  END IF;

  -- İşletmeyi inşa et
  INSERT INTO user_businesses (user_id, business_id, level, current_income, is_building, build_start_time)
  VALUES (v_user_id, p_business_id, 1, v_business.base_income, true, now());

  -- Parayı düş
  UPDATE player_stats SET cash = cash - v_business.build_cost WHERE id = v_user_id;

  RETURN QUERY SELECT true, 'İşletme inşaatı başlatıldı!';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- İşletme geliştir RPC
CREATE OR REPLACE FUNCTION rpc_upgrade_business(
  p_business_id text
)
RETURNS TABLE(success boolean, message text) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_business record;
  v_business record;
  v_user_cash numeric;
BEGIN
  -- Kullanıcının işletmesini al
  SELECT * INTO v_user_business
  FROM user_businesses
  WHERE user_id = v_user_id AND business_id = p_business_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'İşletme bulunamadı!';
    RETURN;
  END IF;

  -- İşletme bilgilerini al
  SELECT * INTO v_business
  FROM businesses
  WHERE id = p_business_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'İşletme bilgisi bulunamadı!';
    RETURN;
  END IF;

  IF v_user_business.is_building THEN
    RETURN QUERY SELECT false, 'İşletme henüz inşa ediliyor!';
    RETURN;
  END IF;

  IF v_user_business.is_upgrading THEN
    RETURN QUERY SELECT false, 'İşletme zaten geliştiriliyor!';
    RETURN;
  END IF;

  IF v_user_business.level >= v_business.max_level THEN
    RETURN QUERY SELECT false, 'İşletme maksimum seviyeye ulaştı!';
    RETURN;
  END IF;

  -- Kullanıcının parasını kontrol et
  SELECT cash INTO v_user_cash FROM player_stats WHERE id = v_user_id;
  
  IF v_user_cash < v_user_business.upgrade_cost THEN
    RETURN QUERY SELECT false, 'Yetersiz para!';
    RETURN;
  END IF;

  -- Geliştirmeyi başlat
  UPDATE user_businesses 
  SET is_upgrading = true, upgrade_start_time = now()
  WHERE user_id = v_user_id AND business_id = p_business_id;

  -- Parayı düş
  UPDATE player_stats SET cash = cash - v_user_business.upgrade_cost WHERE id = v_user_id;

  RETURN QUERY SELECT true, 'İşletme geliştirmesi başlatıldı!';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- İşletme gelirini topla RPC
CREATE OR REPLACE FUNCTION rpc_collect_business_income(
  p_business_id text
)
RETURNS TABLE(success boolean, message text, amount numeric) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_business record;
  v_hours_passed numeric;
  v_income numeric;
BEGIN
  -- Kullanıcının işletmesini al
  SELECT * INTO v_user_business
  FROM user_businesses
  WHERE user_id = v_user_id AND business_id = p_business_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'İşletme bulunamadı!', 0;
    RETURN;
  END IF;

  IF v_user_business.is_building THEN
    RETURN QUERY SELECT false, 'İşletme henüz inşa ediliyor!', 0;
    RETURN;
  END IF;

  -- Geçen süreyi hesapla
  v_hours_passed := EXTRACT(EPOCH FROM (now() - v_user_business.last_income_collection)) / 3600;
  v_income := v_user_business.current_income * v_hours_passed;

  IF v_income <= 0 THEN
    RETURN QUERY SELECT false, 'Henüz toplanacak gelir yok!', 0;
    RETURN;
  END IF;

  -- Geliri topla
  UPDATE user_businesses 
  SET last_income_collection = now(), total_earnings = total_earnings + v_income
  WHERE user_id = v_user_id AND business_id = p_business_id;

  UPDATE player_stats 
  SET cash = cash + v_income, total_earnings = total_earnings + v_income
  WHERE id = v_user_id;

  -- Gelir kaydı ekle
  INSERT INTO business_income (user_business_id, amount)
  VALUES (v_user_business.id, v_income);

  RETURN QUERY SELECT true, 'Gelir toplandı!', v_income;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log
SELECT 'Business system created successfully' as message;
