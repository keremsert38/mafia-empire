/*
  # Soldato Üretim Sırası Sistemi
  
  1. Yeni Tablolar
    - `soldier_production_queue` - Soldato üretim sırası
    
  2. Özellikler
    - Her soldato 100 saniye (100000ms) üretim süresi
    - Uygulama kapalıyken de üretim devam eder
    - Doğrulama zamanı geçtikçe tamamlanan askerleri ekler
    
  3. RPC Fonksiyonlar
    - rpc_order_soldiers - Soldato siparişi ver
    - rpc_check_soldier_production - Üretim durumunu kontrol et
    - rpc_get_soldier_production_status - Mevcut üretim durumunu getir
*/

-- Soldato üretim sırası tablosu
CREATE TABLE IF NOT EXISTS soldier_production_queue (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  soldiers_ordered integer DEFAULT 0,         -- Toplam sipariş edilen
  soldiers_completed integer DEFAULT 0,       -- Tamamlanan (henüz alınmamış)
  production_start_time timestamptz,          -- Üretim başlangıç zamanı
  last_check_time timestamptz DEFAULT now(),  -- Son kontrol zamanı
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS etkinleştir
ALTER TABLE soldier_production_queue ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can read own production queue" ON soldier_production_queue;
CREATE POLICY "Users can read own production queue" ON soldier_production_queue
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own production queue" ON soldier_production_queue;
CREATE POLICY "Users can update own production queue" ON soldier_production_queue
  FOR ALL USING (auth.uid() = user_id);

-- Soldato siparişi ver
CREATE OR REPLACE FUNCTION rpc_order_soldiers(
  p_count integer
)
RETURNS TABLE(success boolean, message text) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_current_queue record;
  v_user_cash bigint;
  v_user_level integer;
  v_cost bigint;
  v_max_soldiers integer;
  v_current_soldiers integer;
  v_pending_soldiers integer;
BEGIN
  -- Kullanıcı bilgilerini al
  SELECT cash, level INTO v_user_cash, v_user_level
  FROM player_stats
  WHERE id = v_user_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Kullanıcı bulunamadı!';
    RETURN;
  END IF;
  
  -- Mevcut asker sayısını al
  SELECT COALESCE(soldiers, 0) INTO v_current_soldiers
  FROM user_soldiers
  WHERE user_id = v_user_id;
  
  IF NOT FOUND THEN
    v_current_soldiers := 0;
    INSERT INTO user_soldiers (user_id, soldiers) VALUES (v_user_id, 0);
  END IF;
  
  -- Mevcut sıradaki askerleri al
  SELECT * INTO v_current_queue
  FROM soldier_production_queue
  WHERE user_id = v_user_id;
  
  v_pending_soldiers := COALESCE(v_current_queue.soldiers_ordered - v_current_queue.soldiers_completed, 0);
  
  -- Maksimum asker kontrolü (level * 5)
  v_max_soldiers := v_user_level * 5;
  
  IF v_current_soldiers + v_pending_soldiers + p_count > v_max_soldiers THEN
    RETURN QUERY SELECT false, format('Maksimum asker kapasitesi aşılıyor! Mevcut: %s, Üretimde: %s, Maksimum: %s', 
      v_current_soldiers, v_pending_soldiers, v_max_soldiers);
    RETURN;
  END IF;
  
  -- Maliyet hesapla (100 * count * level multiplier)
  v_cost := FLOOR(100 * p_count * (1 + v_user_level * 0.1));
  
  IF v_user_cash < v_cost THEN
    RETURN QUERY SELECT false, format('Yetersiz para! Gerekli: $%s', v_cost);
    RETURN;
  END IF;
  
  -- Parayı düş
  UPDATE player_stats
  SET cash = cash - v_cost
  WHERE id = v_user_id;
  
  -- Üretim sırasına ekle veya güncelle
  IF v_current_queue IS NULL THEN
    -- Yeni sıra oluştur
    INSERT INTO soldier_production_queue (
      user_id, 
      soldiers_ordered, 
      soldiers_completed, 
      production_start_time,
      last_check_time,
      updated_at
    )
    VALUES (
      v_user_id, 
      p_count, 
      0, 
      now(),
      now(),
      now()
    );
  ELSE
    -- Mevcut sıraya ekle
    UPDATE soldier_production_queue
    SET soldiers_ordered = soldiers_ordered + p_count,
        production_start_time = COALESCE(production_start_time, now()),
        updated_at = now()
    WHERE user_id = v_user_id;
  END IF;
  
  RETURN QUERY SELECT true, format('%s soldato siparişi verildi! Üretim süresi: %s saniye. Maliyet: $%s', 
    p_count, p_count * 100, v_cost);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Üretim durumunu kontrol et ve tamamlananları ekle
CREATE OR REPLACE FUNCTION rpc_check_soldier_production()
RETURNS TABLE(
  soldiers_added integer,
  soldiers_pending integer,
  seconds_remaining integer,
  message text
) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_queue record;
  v_elapsed_seconds integer;
  v_completed_now integer;
  v_total_completed integer;
  v_pending integer;
  v_seconds_for_pending integer;
BEGIN
  -- Mevcut sırayı al
  SELECT * INTO v_queue
  FROM soldier_production_queue
  WHERE user_id = v_user_id;
  
  IF NOT FOUND OR v_queue.soldiers_ordered <= v_queue.soldiers_completed THEN
    RETURN QUERY SELECT 0, 0, 0, 'Üretimde soldato yok.';
    RETURN;
  END IF;
  
  -- Geçen süreyi hesapla (saniye cinsinden)
  v_elapsed_seconds := EXTRACT(EPOCH FROM (now() - v_queue.production_start_time))::integer;
  
  -- Tamamlanan soldato sayısını hesapla (100 saniye/soldato)
  v_total_completed := LEAST(v_queue.soldiers_ordered, v_elapsed_seconds / 100);
  
  -- Bu kontrol ile eklenen yeni soldato sayısı
  v_completed_now := v_total_completed - v_queue.soldiers_completed;
  
  -- Bekleyen soldato sayısı
  v_pending := v_queue.soldiers_ordered - v_total_completed;
  
  -- Kalan süre
  v_seconds_for_pending := CASE WHEN v_pending > 0 THEN
    (v_total_completed + 1) * 100 - v_elapsed_seconds
  ELSE
    0
  END;
  
  -- Eğer yeni tamamlanan varsa
  IF v_completed_now > 0 THEN
    -- user_soldiers'a ekle
    UPDATE user_soldiers
    SET soldiers = soldiers + v_completed_now,
        updated_at = now()
    WHERE user_id = v_user_id;
    
    -- Sırayı güncelle
    UPDATE soldier_production_queue
    SET soldiers_completed = v_total_completed,
        last_check_time = now(),
        updated_at = now()
    WHERE user_id = v_user_id;
    
    -- Tamamlandıysa sırayı sıfırla
    IF v_pending = 0 THEN
      UPDATE soldier_production_queue
      SET soldiers_ordered = 0,
          soldiers_completed = 0,
          production_start_time = NULL,
          updated_at = now()
      WHERE user_id = v_user_id;
    END IF;
  END IF;
  
  RETURN QUERY SELECT 
    v_completed_now,
    v_pending,
    GREATEST(0, v_seconds_for_pending),
    CASE WHEN v_completed_now > 0 THEN
      format('%s soldato üretimi tamamlandı!', v_completed_now)
    ELSE
      format('%s soldato üretiliyor, kalan: %s saniye', v_pending, v_seconds_for_pending)
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mevcut üretim durumunu getir (UI için)
CREATE OR REPLACE FUNCTION rpc_get_soldier_production_status()
RETURNS TABLE(
  soldiers_in_production integer,
  soldiers_completed integer,
  total_seconds_elapsed integer,
  seconds_until_next integer,
  production_start_time timestamptz
) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_queue record;
  v_elapsed integer;
  v_completed integer;
  v_pending integer;
  v_next_seconds integer;
BEGIN
  SELECT * INTO v_queue
  FROM soldier_production_queue
  WHERE user_id = v_user_id;
  
  IF NOT FOUND OR v_queue.soldiers_ordered IS NULL OR v_queue.soldiers_ordered = 0 THEN
    RETURN QUERY SELECT 0, 0, 0, 0, NULL::timestamptz;
    RETURN;
  END IF;
  
  v_elapsed := EXTRACT(EPOCH FROM (now() - v_queue.production_start_time))::integer;
  v_completed := LEAST(v_queue.soldiers_ordered, v_elapsed / 100);
  v_pending := v_queue.soldiers_ordered - v_completed;
  v_next_seconds := CASE WHEN v_pending > 0 THEN
    (v_completed + 1) * 100 - v_elapsed
  ELSE
    0
  END;
  
  RETURN QUERY SELECT 
    v_pending,
    v_completed,
    v_elapsed,
    GREATEST(0, v_next_seconds),
    v_queue.production_start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonksiyon izinleri
GRANT EXECUTE ON FUNCTION rpc_order_soldiers(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_check_soldier_production() TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_soldier_production_status() TO authenticated;

-- Tablo izinleri
GRANT ALL ON soldier_production_queue TO authenticated;
