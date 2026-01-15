-- =====================================================
-- SUÇ RESİMLERİ İÇİN SUPABASE STORAGE KURULUMU
-- =====================================================
-- Bu SQL'i Supabase Dashboard > SQL Editor'de çalıştırın

-- 1. crime-images bucket'ı oluştur (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'crime-images',
  'crime-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Public erişim politikaları
DROP POLICY IF EXISTS "Crime images are publicly accessible" ON storage.objects;
CREATE POLICY "Crime images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'crime-images');

DROP POLICY IF EXISTS "Authenticated users can upload crime images" ON storage.objects;
CREATE POLICY "Authenticated users can upload crime images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'crime-images');

DROP POLICY IF EXISTS "Authenticated users can update crime images" ON storage.objects;
CREATE POLICY "Authenticated users can update crime images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'crime-images');

DROP POLICY IF EXISTS "Authenticated users can delete crime images" ON storage.objects;
CREATE POLICY "Authenticated users can delete crime images"
ON storage.objects FOR DELETE
USING (bucket_id = 'crime-images');

-- 3. Crimes tablosu (sadece resim URL'leri için - oyun kodu crime verilerini tutar)
DROP TABLE IF EXISTS crime_images CASCADE;
CREATE TABLE crime_images (
  crime_id TEXT PRIMARY KEY,
  image_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS aktif, herkes okuyabilir
ALTER TABLE crime_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Crime images are viewable by everyone" ON crime_images
  FOR SELECT USING (true);

CREATE POLICY "Authenticated can update crime images" ON crime_images
  FOR UPDATE USING (true);

CREATE POLICY "Authenticated can insert crime images" ON crime_images
  FOR INSERT WITH CHECK (true);

-- 4. Varsayılan resim URL'lerini ekle (placeholder - sonra değiştireceksiniz)
INSERT INTO crime_images (crime_id, image_url) VALUES
-- Sokak Suçları
('street_1', NULL),
('street_2', NULL),
('street_3', NULL),
('street_4', NULL),
('street_5', NULL),
-- İş Suçları
('business_1', NULL),
('business_2', NULL),
('business_3', NULL),
('business_4', NULL),
('business_5', NULL),
-- Politik Suçlar
('political_1', NULL),
('political_2', NULL),
('political_3', NULL),
('political_4', NULL),
('political_5', NULL),
-- Uluslararası Suçlar
('international_1', NULL),
('international_2', NULL),
('international_3', NULL),
('international_4', NULL),
('international_5', NULL)
ON CONFLICT (crime_id) DO NOTHING;

-- 5. Resim URL'sini güncelleme fonksiyonu (admin panel için)
CREATE OR REPLACE FUNCTION update_crime_image(
  p_crime_id TEXT,
  p_image_url TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE crime_images 
  SET image_url = p_image_url, updated_at = NOW()
  WHERE crime_id = p_crime_id;
  
  IF NOT FOUND THEN
    INSERT INTO crime_images (crime_id, image_url)
    VALUES (p_crime_id, p_image_url);
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- KULLANIM TALİMATLARI:
-- =====================================================
-- 1. Bu SQL'i çalıştırın
-- 2. Supabase Dashboard > Storage > crime-images bucket'ına gidin
-- 3. Resimleri yükleyin (street_1.png, business_1.png vs.)
-- 4. Her resim için URL'yi kopyalayın
-- 5. crime_images tablosunda image_url'i güncelleyin:
--    UPDATE crime_images SET image_url = 'https://xxx.supabase.co/storage/v1/object/public/crime-images/street_1.png' WHERE crime_id = 'street_1';
-- =====================================================
