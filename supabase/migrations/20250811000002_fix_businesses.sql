/*
  # İşletme Sistemi Düzeltmeleri

  1. SQL Hatalarını Düzelt
    - rpc_upgrade_business fonksiyonundaki INTO hatası düzeltildi
    - Kullanıcı işletmeleri sırayla inşa edilecek
    
  2. Yeni Özellikler
    - İşletme inşaat durumu kontrolü
    - Gelir hesaplama sistemi
    - Seviye çarpanı sistemi
*/

-- Mevcut rpc_upgrade_business fonksiyonunu düzelt
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

-- İşletme inşaat tamamlama RPC
CREATE OR REPLACE FUNCTION rpc_complete_building(
  p_business_id text
)
RETURNS TABLE(success boolean, message text) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_business record;
  v_business record;
BEGIN
  -- Kullanıcının işletmesini al
  SELECT * INTO v_user_business
  FROM user_businesses
  WHERE user_id = v_user_id AND business_id = p_business_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'İşletme bulunamadı!';
    RETURN;
  END IF;

  IF NOT v_user_business.is_building THEN
    RETURN QUERY SELECT false, 'İşletme inşa edilmiyor!';
    RETURN;
  END IF;

  -- İnşaatı tamamla
  UPDATE user_businesses 
  SET is_building = false, 
      build_start_time = NULL,
      last_income_collection = now()
  WHERE user_id = v_user_id AND business_id = p_business_id;

  RETURN QUERY SELECT true, 'İşletme inşaatı tamamlandı!';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- İşletme geliştirme tamamlama RPC
CREATE OR REPLACE FUNCTION rpc_complete_upgrade(
  p_business_id text
)
RETURNS TABLE(success boolean, message text) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_business record;
  v_business record;
  v_new_income numeric;
BEGIN
  -- Kullanıcının işletmesini al
  SELECT * INTO v_user_business
  FROM user_businesses
  WHERE user_id = v_user_id AND business_id = p_business_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'İşletme bulunamadı!';
    RETURN;
  END IF;

  IF NOT v_user_business.is_upgrading THEN
    RETURN QUERY SELECT false, 'İşletme geliştirilmiyor!';
    RETURN;
  END IF;

  -- İşletme bilgilerini al
  SELECT * INTO v_business
  FROM businesses
  WHERE id = p_business_id;

  -- Yeni geliri hesapla (seviye çarpanı)
  v_new_income := v_business.base_income * (1 + (v_user_business.level) * 0.5);

  -- Geliştirmeyi tamamla
  UPDATE user_businesses 
  SET is_upgrading = false, 
      upgrade_start_time = NULL,
      level = level + 1,
      current_income = v_new_income,
      upgrade_cost = upgrade_cost * 1.5
  WHERE user_id = v_user_id AND business_id = p_business_id;

  RETURN QUERY SELECT true, 'İşletme geliştirmesi tamamlandı!';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- İşletme durumu kontrol RPC
CREATE OR REPLACE FUNCTION rpc_check_business_status(
  p_business_id text
)
RETURNS TABLE(
  is_building boolean,
  is_upgrading boolean,
  build_time_remaining integer,
  upgrade_time_remaining integer,
  can_collect boolean
) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_business record;
  v_business record;
  v_build_remaining integer := 0;
  v_upgrade_remaining integer := 0;
  v_can_collect boolean := false;
BEGIN
  -- Kullanıcının işletmesini al
  SELECT * INTO v_user_business
  FROM user_businesses
  WHERE user_id = v_user_id AND business_id = p_business_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false, 0, 0, false;
    RETURN;
  END IF;

  -- İşletme bilgilerini al
  SELECT * INTO v_business
  FROM businesses
  WHERE id = p_business_id;

  -- İnşaat süresi hesapla
  IF v_user_business.is_building AND v_user_business.build_start_time IS NOT NULL THEN
    v_build_remaining := GREATEST(0, v_business.build_time - 
      EXTRACT(EPOCH FROM (now() - v_user_business.build_start_time)) / 60);
    
    -- İnşaat tamamlandıysa otomatik tamamla
    IF v_build_remaining <= 0 THEN
      PERFORM rpc_complete_building(p_business_id);
      v_user_business.is_building := false;
    END IF;
  END IF;

  -- Geliştirme süresi hesapla
  IF v_user_business.is_upgrading AND v_user_business.upgrade_start_time IS NOT NULL THEN
    v_upgrade_remaining := GREATEST(0, v_business.upgrade_time - 
      EXTRACT(EPOCH FROM (now() - v_user_business.upgrade_start_time)) / 60);
    
    -- Geliştirme tamamlandıysa otomatik tamamla
    IF v_upgrade_remaining <= 0 THEN
      PERFORM rpc_complete_upgrade(p_business_id);
      v_user_business.is_upgrading := false;
    END IF;
  END IF;

  -- Gelir toplanabilir mi kontrol et
  v_can_collect := NOT v_user_business.is_building AND 
                   EXTRACT(EPOCH FROM (now() - v_user_business.last_income_collection)) / 3600 >= 1;

  RETURN QUERY SELECT 
    v_user_business.is_building,
    v_user_business.is_upgrading,
    v_build_remaining::integer,
    v_upgrade_remaining::integer,
    v_can_collect;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log
SELECT 'Business system fixes applied successfully' as message;
