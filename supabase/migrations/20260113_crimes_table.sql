-- Suçlar Tablosu - Supabase'den Yönetilebilir Suç Sistemi
-- Bu SQL'i Supabase Dashboard > SQL Editor'de çalıştırın

-- 1. Crimes tablosunu oluştur
CREATE TABLE IF NOT EXISTS crimes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  energy_cost INTEGER NOT NULL DEFAULT 10,
  duration INTEGER NOT NULL DEFAULT 60,
  success_rate INTEGER NOT NULL DEFAULT 50,
  base_reward INTEGER NOT NULL DEFAULT 100,
  base_xp INTEGER NOT NULL DEFAULT 10,
  required_level INTEGER NOT NULL DEFAULT 1,
  cooldown INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'street',
  risk_level TEXT NOT NULL DEFAULT 'low',
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS Politikası (Herkes okuyabilir)
ALTER TABLE crimes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Crimes are viewable by everyone" ON crimes;
CREATE POLICY "Crimes are viewable by everyone" ON crimes
  FOR SELECT USING (true);

-- 3. Tüm Suçları Ekle (20 suç)
-- Önce varolan verileri temizle
DELETE FROM crimes;

-- Sokak Suçları (Level 1-10)
INSERT INTO crimes (id, name, description, energy_cost, duration, success_rate, base_reward, base_xp, required_level, cooldown, category, risk_level, image_url, sort_order) VALUES
('street_1', 'Duvara Grafiti Yapma', 'Çete sembolünü duvara çiz.', 5, 10, 95, 50, 5, 1, 0, 'street', 'low', 'https://images.unsplash.com/photo-1567095761054-7a02e69e5c43?w=400', 1),
('street_2', 'Cep Telefonu Çalma', 'Kalabalık bir yerde telefon çal.', 10, 20, 85, 150, 8, 2, 0, 'street', 'low', 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=400', 2),
('street_3', 'Market Soygunu', 'Küçük bir marketi soy.', 15, 30, 75, 350, 12, 4, 0, 'street', 'medium', 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400', 3),
('street_4', 'Araba Çalma', 'Park halindeki bir arabayı çal.', 20, 40, 65, 800, 18, 6, 0, 'street', 'medium', 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=400', 4),
('street_5', 'Evden Hırsızlık', 'Boş bir eve gir ve değerli eşyaları çal.', 25, 50, 55, 1500, 25, 8, 0, 'street', 'high', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', 5),

-- İş Suçları (Level 10-20)
('business_1', 'Sahte Evrak', 'Sahte kimlik ve belgeler hazırla.', 30, 60, 70, 2000, 35, 10, 0, 'business', 'medium', 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400', 6),
('business_2', 'Kaçak Mal Ticareti', 'Kaçak malları sat.', 35, 70, 60, 3500, 45, 12, 0, 'business', 'medium', 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400', 7),
('business_3', 'Kara Para Aklama', 'Kirli parayı temiz göster.', 40, 80, 50, 5000, 60, 15, 0, 'business', 'high', 'https://images.unsplash.com/photo-1554672408-17407e0322ce?w=400', 8),
('business_4', 'Kumarhane İşletme', 'Yasadışı kumarhane aç.', 45, 90, 45, 7500, 80, 17, 0, 'business', 'high', 'https://images.unsplash.com/photo-1596838132731-3301c3fd4317?w=400', 9),
('business_5', 'Banka Soygunu', 'Büyük bir banka soy.', 50, 100, 35, 12000, 100, 20, 0, 'business', 'high', 'https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?w=400', 10),

-- Politik Suçlar (Level 20-30)
('political_1', 'Belediye Rüşveti', 'Belediye görevlilerine rüşvet ver.', 55, 110, 60, 15000, 120, 22, 0, 'political', 'high', 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400', 11),
('political_2', 'Seçim Manipülasyonu', 'Yerel seçimleri manipüle et.', 60, 120, 50, 20000, 150, 24, 0, 'political', 'high', 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=400', 12),
('political_3', 'Yargıç Satın Alma', 'Bir yargıcı satın al.', 65, 130, 45, 25000, 180, 26, 0, 'political', 'high', 'https://images.unsplash.com/photo-1589391886645-d51941baf7fb?w=400', 13),
('political_4', 'Polis Şefi Tehdidi', 'Polis şefini tehdit et.', 70, 140, 40, 30000, 220, 28, 0, 'political', 'high', 'https://images.unsplash.com/photo-1453873531674-2151bcd01707?w=400', 14),
('political_5', 'Milletvekili Kontrolü', 'Bir milletvekilini kontrol altına al.', 75, 150, 30, 40000, 250, 30, 0, 'political', 'high', 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=400', 15),

-- Uluslararası Suçlar (Level 30-40)
('international_1', 'Silah Kaçakçılığı', 'Uluslararası silah kaçakçılığı yap.', 80, 160, 50, 50000, 300, 32, 0, 'international', 'high', 'https://images.unsplash.com/photo-1584281722920-7c2d9e1bf1dc?w=400', 16),
('international_2', 'Uyuşturucu Karteli', 'Uyuşturucu kartelini yönet.', 85, 170, 45, 65000, 350, 34, 0, 'international', 'high', 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400', 17),
('international_3', 'İnsan Kaçakçılığı', 'İnsan kaçakçılığı ağını işlet.', 90, 180, 40, 80000, 400, 36, 0, 'international', 'high', 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=400', 18),
('international_4', 'Siber Saldırı', 'Uluslararası bankalara siber saldırı düzenle.', 95, 190, 35, 100000, 500, 38, 0, 'international', 'high', 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400', 19),
('international_5', 'Küresel İmparatorluk', 'Global suç imparatorluğunu yönet.', 100, 200, 25, 150000, 600, 40, 0, 'international', 'high', 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=400', 20);

-- 4. RPC Fonksiyonu: Aktif suçları getir
CREATE OR REPLACE FUNCTION get_active_crimes()
RETURNS SETOF crimes AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM crimes
  WHERE is_active = TRUE
  ORDER BY sort_order ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- KULLANIM:
-- Supabase Dashboard > SQL Editor'de bu dosyayı çalıştırın.
-- Artık suçları ve resimlerini doğrudan veritabanından yönetebilirsiniz!
-- 
-- Resim değiştirmek için:
-- UPDATE crimes SET image_url = 'yeni_url' WHERE id = 'street_1';
--
-- Suç eklemek için:
-- INSERT INTO crimes (...) VALUES (...);
-- =====================================================
