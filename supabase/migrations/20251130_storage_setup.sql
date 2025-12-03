-- =====================================================
-- STORAGE BUCKET VE POLİTİKALAR
-- =====================================================

-- 1. 'profile-photos' bucket'ını oluştur (eğer yoksa)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS Politikaları (Güvenlik)

-- Önce eski politikaları temizle (çakışmayı önlemek için)
DROP POLICY IF EXISTS "Users can upload own photo" ON storage.objects;
DROP POLICY IF EXISTS "Public photos are viewable" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own photo" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own photo" ON storage.objects;

-- Politika 1: Herkes fotoğrafları görebilir (Public Access)
CREATE POLICY "Public photos are viewable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-photos');

-- Politika 2: Kullanıcılar SADECE kendi klasörlerine yükleme yapabilir
-- Klasör yapısı: profile-photos/{user_id}/{filename}
CREATE POLICY "Users can upload own photo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'profile-photos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Politika 3: Kullanıcılar kendi fotoğraflarını güncelleyebilir
CREATE POLICY "Users can update own photo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'profile-photos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Politika 4: Kullanıcılar kendi fotoğraflarını silebilir
CREATE POLICY "Users can delete own photo"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'profile-photos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Başarı mesajı
SELECT '✅ Storage bucket ve politikalar oluşturuldu!' as status;
