/*
  # Pasif Gelir Persist Sistemi
  
  Uygulama kapalıyken de pasif gelir biriksin:
  - last_income_collection timestamp saklanır
  - Uygulama açıldığında geçen süreye göre gelir hesaplanır
  - Hem işletme hem bölge gelirleri dahil
*/

-- player_stats tablosuna last_income_collection kolonu ekle (eğer yoksa)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'player_stats' 
    AND column_name = 'last_income_collection'
  ) THEN
    ALTER TABLE player_stats 
    ADD COLUMN last_income_collection timestamptz DEFAULT now();
  END IF;
END $$;

-- Pasif geliri hesapla ve topla (uygulama açıldığında çağrılır)
CREATE OR REPLACE FUNCTION rpc_calculate_accumulated_income()
RETURNS TABLE(
  accumulated_amount numeric,
  seconds_elapsed integer,
  hourly_rate numeric,
  business_income numeric,
  territory_income numeric
) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_last_collection timestamptz;
  v_seconds integer;
  v_business_income numeric := 0;
  v_territory_income numeric := 0;
  v_hourly_rate numeric := 0;
  v_accumulated numeric := 0;
BEGIN
  -- Son toplama zamanını al
  SELECT last_income_collection INTO v_last_collection
  FROM player_stats
  WHERE id = v_user_id;
  
  IF v_last_collection IS NULL THEN
    v_last_collection := now() - interval '1 hour';
    UPDATE player_stats SET last_income_collection = v_last_collection WHERE id = v_user_id;
  END IF;
  
  -- Geçen süreyi hesapla (saniye)
  v_seconds := EXTRACT(EPOCH FROM (now() - v_last_collection))::integer;
  
  -- Maksimum 24 saat gelir birikebilir
  IF v_seconds > 86400 THEN
    v_seconds := 86400;
  END IF;
  
  -- İşletme gelirlerini hesapla (aktif, inşaatta olmayan)
  SELECT COALESCE(SUM(ub.current_income), 0) INTO v_business_income
  FROM user_businesses ub
  JOIN businesses b ON b.id = ub.business_id
  WHERE ub.user_id = v_user_id
    AND ub.level > 0
    AND ub.is_building = false;
  
  -- Bölge gelirlerini hesapla
  SELECT COALESCE(SUM(r.base_income_per_min * 60), 0) INTO v_territory_income
  FROM region_state rs
  JOIN regions r ON r.id = rs.region_id
  WHERE rs.owner_user_id = v_user_id;
  
  -- Toplam saatlik gelir
  v_hourly_rate := v_business_income + v_territory_income;
  
  -- Biriken gelir = (saatlik gelir / 3600) * saniye
  IF v_hourly_rate > 0 AND v_seconds > 0 THEN
    v_accumulated := (v_hourly_rate / 3600) * v_seconds;
  END IF;
  
  RETURN QUERY SELECT 
    ROUND(v_accumulated, 2),
    v_seconds,
    ROUND(v_hourly_rate, 2),
    ROUND(v_business_income, 2),
    ROUND(v_territory_income, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Geliri topla ve son toplama zamanını güncelle
CREATE OR REPLACE FUNCTION rpc_collect_accumulated_income()
RETURNS TABLE(
  success boolean,
  amount_collected numeric,
  message text
) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_accumulated numeric;
  v_seconds integer;
BEGIN
  -- Biriken geliri hesapla
  SELECT accumulated_amount, seconds_elapsed INTO v_accumulated, v_seconds
  FROM rpc_calculate_accumulated_income();
  
  IF v_accumulated IS NULL OR v_accumulated < 1 THEN
    RETURN QUERY SELECT false, 0::numeric, 'Toplanacak gelir yok.';
    RETURN;
  END IF;
  
  -- Oyuncunun parasına ekle
  UPDATE player_stats
  SET cash = cash + FLOOR(v_accumulated),
      last_income_collection = now(),
      total_earnings = total_earnings + FLOOR(v_accumulated)
  WHERE id = v_user_id;
  
  RETURN QUERY SELECT 
    true, 
    FLOOR(v_accumulated)::numeric, 
    format('$%s gelir toplandı!', FLOOR(v_accumulated)::text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sadece son toplama zamanını güncelle (uygulama açıkken periyodik güncelleme için)
CREATE OR REPLACE FUNCTION rpc_update_income_timestamp()
RETURNS void AS $$
BEGIN
  UPDATE player_stats
  SET last_income_collection = now()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- İzinler
GRANT EXECUTE ON FUNCTION rpc_calculate_accumulated_income() TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_collect_accumulated_income() TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_update_income_timestamp() TO authenticated;
