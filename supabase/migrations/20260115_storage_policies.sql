-- =====================================================
-- STORAGE BUCKET RLS POLİTİKALARI
-- =====================================================

-- avatars bucket için RLS politikaları
-- Supabase Dashboard > Storage > Policies'den de ekleyebilirsin

-- 1. Herkes dosyaları görebilsin (public bucket için)
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

-- 2. Authenticated kullanıcılar dosya yükleyebilsin
CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- 3. Authenticated kullanıcılar kendi dosyalarını güncelleyebilsin
CREATE POLICY "Users can update own files" ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

-- 4. Authenticated kullanıcılar dosya silebilsin
CREATE POLICY "Users can delete files" ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');
