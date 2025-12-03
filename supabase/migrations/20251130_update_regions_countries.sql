-- =====================================================
-- 50 GERÇEK ÜLKE BÖLGE SİSTEMİ - DENGELİ VERSİYON
-- =====================================================
-- Dengeli gelirler: 200-3000/saat (3.33-50/dakika)
-- Dengeli savunma: 100-500 asker
-- RPC fonksiyonları dahil
-- =====================================================

-- 1. Eski bölgeleri ve durumlarını temizle
DELETE FROM region_state;
DELETE FROM regions;

-- 2. 50 Gerçek Ülke Ekle (Dengeli Gelir)
-- base_income_per_min: dakika başına gelir
INSERT INTO regions (id, name, description, base_income_per_min) VALUES
-- Seviye 1 (200-400/saat = 3.33-6.67/dakika)
('turkiye', 'Türkiye', 'Avrupa ve Asya köprüsü', 6.0),
('yunanistan', 'Yunanistan', 'Antik medeniyetin beşiği', 5.0),
('portekiz', 'Portekiz', 'Atlantik ticaret merkezi', 4.5),
('irlanda', 'İrlanda', 'Yeşil ada', 5.5),
('yeni-zelanda', 'Yeni Zelanda', 'Pasifik cenneti', 4.0),

-- Seviye 2-3 (400-800/saat = 6.67-13.33/dakika)
('polonya', 'Polonya', 'Doğu Avrupa gücü', 10.0),
('misir', 'Mısır', 'Piramitlerin diyarı', 9.0),
('filipinler', 'Filipinler', '7000 ada', 8.0),
('vietnam', 'Vietnam', 'Güneydoğu Asya', 9.5),
('ukrayna', 'Ukrayna', 'Tahıl ambarı', 11.0),
('arjantin', 'Arjantin', 'Güney Amerika', 12.0),
('guney-afrika', 'Güney Afrika', 'Afrika incisi', 11.5),
('kolombiya', 'Kolombiya', 'Kahve diyarı', 13.0),
('nijerya', 'Nijerya', 'Afrika lideri', 10.5),
('kenya', 'Kenya', 'Safari merkezi', 10.0),

-- Seviye 4-5 (800-1400/saat = 13.33-23.33/dakika)
('tayland', 'Tayland', 'Güneydoğu Asya hub', 17.0),
('malezya', 'Malezya', 'İkiz kuleler', 19.0),
('sili', 'Şili', 'En uzun ülke', 15.0),
('peru', 'Peru', 'İnka mirası', 14.0),
('romanya', 'Romanya', 'Karpat dağları', 18.0),
('belcika', 'Belçika', 'Çikolata merkezi', 22.0),
('isvec', 'İsveç', 'İskandinavya', 23.0),
('avusturya', 'Avusturya', 'Alpler', 21.0),
('norvec', 'Norveç', 'Fiyortlar', 24.0),
('danimarka', 'Danimarka', 'Mutluluk şampiyonu', 22.5),

-- Seviye 6-7 (1400-2200/saat = 23.33-36.67/dakika)
('isvicre', 'İsviçre', 'Bankacılık merkezi', 30.0),
('singapur', 'Singapur', 'Asya kaplanı', 35.0),
('finlandiya', 'Finlandiya', 'Kuzey ışıkları', 28.0),
('israil', 'İsrael', 'Start-up ulusu', 33.0),
('cekya', 'Çekya', 'Orta Avrupa', 27.0),
('endonezya', 'Endonezya', '17,000 ada', 36.0),
('meksika', 'Meksika', 'Aztek mirası', 37.0),
('hollanda', 'Hollanda', 'Yel değirmenleri', 36.5),
('pakistan', 'Pakistan', 'Güney Asya', 34.0),
('banglades', 'Bangladeş', 'Bengal', 32.0),

-- Seviye 8 (2200-2800/saat = 36.67-46.67/dakika)
('ispanya', 'İspanya', 'İber yarımadası', 40.0),
('brezilya', 'Brezilya', 'Amazon', 43.0),
('hindistan', 'Hindistan', 'En büyük demokrasi', 45.0),
('avustralya', 'Avustralya', 'Kıta ülke', 42.0),
('venezuela', 'Venezuela', 'Petrol zengini', 38.0),

-- Seviye 9 (2800-3000/saat = 46.67-50/dakika)
('guney-kore', 'Güney Kore', 'K-pop ve teknoloji', 47.0),
('italya', 'İtalya', 'Roma mirası', 48.5),
('kanada', 'Kanada', 'Akça ağaç', 47.5),
('rusya', 'Rusya', 'En büyük ülke', 50.0),
('fransa', 'Fransa', 'Moda başkenti', 49.0),

-- Seviye 10 (3000/saat = 50/dakika) - EN GÜÇLÜLER
('ingiltere', 'İngiltere', 'Britanya', 50.0),
('almanya', 'Almanya', 'Avrupa lokomotifi', 50.0),
('japonya', 'Japonya', 'Doğu ejderhası', 50.0),
('cin', 'Çin', 'Ejderha', 50.0),
('abd', 'Amerika Birleşik Devletleri', 'Süper güç', 50.0);

-- 3. Bölge durumlarını başlat (Dengeli savunma: 100-500)
INSERT INTO region_state (region_id, owner_user_id, defender_soldiers) VALUES
-- Seviye 1 - 100-150
('turkiye', NULL, 150),
('yunanistan', NULL, 120),
('portekiz', NULL, 100),
('irlanda', NULL, 130),
('yeni-zelanda', NULL, 110),

-- Seviye 2-3 - 150-250
('polonya', NULL, 200),
('misir', NULL, 180),
('filipinler', NULL, 160),
('vietnam', NULL, 190),
('ukrayna', NULL, 220),
('arjantin', NULL, 240),
('guney-afrika', NULL, 230),
('kolombiya', NULL, 250),
('nijerya', NULL, 210),
('kenya', NULL, 200),

-- Seviye 4-5 - 250-350
('tayland', NULL, 280),
('malezya', NULL, 310),
('sili', NULL, 260),
('peru', NULL, 250),
('romanya', NULL, 300),
('belcika', NULL, 340),
('isvec', NULL, 350),
('avusturya', NULL, 330),
('norvec', NULL, 350),
('danimarka', NULL, 345),

-- Seviye 6-7 - 350-450
('isvicre', NULL, 380),
('singapur', NULL, 420),
('finlandiya', NULL, 370),
('israil', NULL, 410),
('cekya', NULL, 360),
('endonezya', NULL, 430),
('meksika', NULL, 450),
('hollanda', NULL, 440),
('pakistan', NULL, 425),
('banglades', NULL, 415),

-- Seviye 8 - 450-480
('ispanya', NULL, 460),
('brezilya', NULL, 470),
('hindistan', NULL, 480),
('avustralya', NULL, 465),
('venezuela', NULL, 455),

-- Seviye 9-10 - 480-500
('guney-kore', NULL, 485),
('italya', NULL, 490),
('kanada', NULL, 488),
('rusya', NULL, 500),
('fransa', NULL, 495),
('ingiltere', NULL, 500),
('almanya', NULL, 500),
('japonya', NULL, 500),
('cin', NULL, 500),
('abd', NULL, 500);

-- =====================================================
-- RPC FONKSİYONLARI - BÖLGE SALDIRI SİSTEMİ
-- =====================================================

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
    RETURN QUERY SELECT false, 'Yetersiz asker!'::text;
    RETURN;
  END IF;

  -- Bölge durumunu al
  SELECT defender_soldiers, owner_user_id INTO v_defender_soldiers, v_owner_id
  FROM region_state
  WHERE region_id = p_region_id;

  -- Kendi bölgesine saldıramasın
  IF v_owner_id = v_user_id THEN
    RETURN QUERY SELECT false, 'Kendi bölgenize saldıramazsınız!'::text;
    RETURN;
  END IF;

  -- Askerleri düş
  UPDATE user_soldiers
  SET soldiers = soldiers - p_attackers_to_send,
      updated_at = now()
  WHERE user_id = v_user_id;

  -- Saldırı sonucu (SAVUNMA 1.5x BONUS)
  IF p_attackers_to_send >= (v_defender_soldiers * 1.5) THEN
    -- Başarılı! Bölgeyi ele geçir
    UPDATE region_state
    SET owner_user_id = v_user_id,
        defender_soldiers = GREATEST(0, p_attackers_to_send - v_defender_soldiers),
        updated_at = now()
    WHERE region_id = p_region_id;

    RETURN QUERY SELECT true, 'Bölge ele geçirildi!'::text;
  ELSE
    -- Başarısız, savunmayı düşür
    UPDATE region_state
    SET defender_soldiers = GREATEST(0, defender_soldiers - (p_attackers_to_send / 2)),
        updated_at = now()
    WHERE region_id = p_region_id;

    RETURN QUERY SELECT false, 'Saldırı başarısız, savunma zayıflatıldı.'::text;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bölgeye asker gönderme (Güçlendirme)
CREATE OR REPLACE FUNCTION rpc_reinforce_region(
  p_region_id text,
  p_soldiers integer
)
RETURNS TABLE(success boolean, message text) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_soldiers integer;
  v_owner_id uuid;
BEGIN
  -- Kullanıcının asker sayısını al
  SELECT soldiers INTO v_user_soldiers
  FROM user_soldiers
  WHERE user_id = v_user_id;

  -- Yeterli asker var mı?
  IF v_user_soldiers < p_soldiers THEN
    RETURN QUERY SELECT false, 'Yetersiz asker!'::text;
    RETURN;
  END IF;

  -- Bölgenin sahibini kontrol et
  SELECT owner_user_id INTO v_owner_id
  FROM region_state
  WHERE region_id = p_region_id;

  -- Sadece kendi bölgesine asker gönderebilir
  IF v_owner_id != v_user_id THEN
    RETURN QUERY SELECT false, 'Bu bölge size ait değil!'::text;
    RETURN;
  END IF;

  -- Askerleri transfer et
  UPDATE user_soldiers
  SET soldiers = soldiers - p_soldiers,
      updated_at = now()
  WHERE user_id = v_user_id;

  UPDATE region_state
  SET defender_soldiers = defender_soldiers + p_soldiers,
      updated_at = now()
  WHERE region_id = p_region_id;

  RETURN QUERY SELECT true, format('Bölgeye %s asker gönderildi!', p_soldiers)::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- İzinleri ver
GRANT EXECUTE ON FUNCTION rpc_attack_region TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_reinforce_region TO authenticated;

-- Başarı mesajı
SELECT 
    '✅ 50 ülke + RPC fonksiyonları eklendi!' AS status,
    COUNT(*) as total_regions,
    ROUND(AVG(base_income_per_min) * 60) as avg_income_per_hour,
    ROUND(AVG(defender_soldiers)) as avg_defenders
FROM regions r
LEFT JOIN region_state rs ON r.id = rs.region_id;
