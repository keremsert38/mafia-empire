-- Supabase Authentication ve RLS Ayarları
-- Bu komutları Supabase Dashboard > SQL Editor'da çalıştırın

-- 1. Email confirmation'ı kapat
UPDATE auth.config 
SET enable_signup = true, 
    enable_confirmations = false;

-- 2. Mevcut kullanıcıları confirm et (email doğrulaması olmadan aktif et)
UPDATE auth.users 
SET email_confirmed_at = NOW(), 
    confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;

-- 3. Profiles tablosunu oluştur (eğer yoksa)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- 4. RLS'yi etkinleştir
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 5. Mevcut politikaları sil
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable select for users based on user_id" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON profiles;

-- 6. Yeni basit politikalar oluştur
CREATE POLICY "Allow authenticated users full access" ON profiles
  FOR ALL USING (auth.uid() IS NOT NULL);

-- 7. Public schema'da profiles tablosuna erişim ver
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO anon;

-- Bu komutları çalıştırdıktan sonra artık email doğrulaması olmadan 
-- kayıt olup giriş yapabileceksiniz!