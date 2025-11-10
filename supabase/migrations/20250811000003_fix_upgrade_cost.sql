/*
  # İşletme Yükseltme Hatası Düzeltmesi
  
  Sorun: v_user_business.upgrade_cost kullanılıyor ama bu alan user_businesses tablosunda yok
  Çözüm: v_business.upgrade_cost kullanılmalı (businesses tablosundan)
*/

-- rpc_upgrade_business fonksiyonunu düzelt
CREATE OR REPLACE FUNCTION rpc_upgrade_business(
  p_business_id text
)
RETURNS TABLE(success boolean, message text) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_business record;
  v_business record;
  v_user_cash numeric;
  v_current_upgrade_cost numeric;
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
  
  -- Mevcut seviye için upgrade maliyetini hesapla
  -- Her seviye için maliyet 1.5x artar
  v_current_upgrade_cost := v_business.upgrade_cost * POWER(1.5, v_user_business.level - 1);
  
  IF v_user_cash < v_current_upgrade_cost THEN
    RETURN QUERY SELECT false, format('Yetersiz para! Gerekli: $%s', v_current_upgrade_cost::text);
    RETURN;
  END IF;

  -- Geliştirmeyi başlat
  UPDATE user_businesses 
  SET is_upgrading = true, upgrade_start_time = now()
  WHERE user_id = v_user_id AND business_id = p_business_id;

  -- Parayı düş
  UPDATE player_stats SET cash = cash - v_current_upgrade_cost WHERE id = v_user_id;

  RETURN QUERY SELECT true, format('İşletme geliştirmesi başlatıldı! Maliyet: $%s', v_current_upgrade_cost::text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- rpc_complete_upgrade fonksiyonunu da düzelt
CREATE OR REPLACE FUNCTION rpc_complete_upgrade(
  p_business_id text
)
RETURNS TABLE(success boolean, message text) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_business record;
  v_business record;
  v_new_income numeric;
  v_new_level integer;
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

  -- Yeni seviye
  v_new_level := v_user_business.level + 1;
  
  -- Yeni geliri hesapla (her seviye %20 artış)
  v_new_income := v_business.base_income * (1 + (v_new_level - 1) * 0.2);

  -- Geliştirmeyi tamamla
  UPDATE user_businesses 
  SET is_upgrading = false, 
      upgrade_start_time = NULL,
      level = v_new_level,
      current_income = v_new_income
  WHERE user_id = v_user_id AND business_id = p_business_id;

  RETURN QUERY SELECT true, format('İşletme %s. seviyeye yükseltildi! Yeni gelir: $%s/saat', v_new_level::text, v_new_income::text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log
SELECT 'Upgrade cost fix applied successfully' as message;
