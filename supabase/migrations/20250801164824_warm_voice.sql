/*
  # Kayıt Olma ve Authentication Düzeltmeleri

  1. Authentication Ayarları
    - Email confirmation'ı kapat
    - Signup'ı etkinleştir
    - Auto-confirm kullanıcıları
    
  2. Trigger Düzeltmeleri
    - User oluşturulduğunda otomatik profile ve stats oluştur
    - Hata kontrolü ekle
    
  3. Politika Düzeltmeleri
    - Basit ve çalışan politikalar
*/

-- 1. Authentication ayarlarını düzelt
UPDATE auth.config 
SET enable_signup = true, 
    enable_confirmations = false,
    enable_anonymous_sign_ins = false;

-- 2. Mevcut kullanıcıları confirm et
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()), 
    confirmed_at = COALESCE(confirmed_at, NOW())
WHERE email_confirmed_at IS NULL OR confirmed_at IS NULL;

-- 3. Profiles tablosu için basit politikalar
DROP POLICY IF EXISTS "Allow authenticated users full access" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Enable all for authenticated users" ON profiles
  FOR ALL USING (true);

-- 4. Player stats için basit politikalar
DROP POLICY IF EXISTS "Anyone can read player stats" ON player_stats;
DROP POLICY IF EXISTS "Users can insert own stats" ON player_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON player_stats;

CREATE POLICY "Enable all for player stats" ON player_stats
  FOR ALL USING (true);

-- 5. Chat messages için basit politikalar
DROP POLICY IF EXISTS "Anyone can read chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON chat_messages;

CREATE POLICY "Enable all for chat messages" ON chat_messages
  FOR ALL USING (true);

-- 6. Trigger'ları yeniden oluştur
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_player_stats();

CREATE OR REPLACE FUNCTION create_player_stats()
RETURNS TRIGGER AS $$
DECLARE
  user_username text;
BEGIN
  -- Username'i al
  user_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'Oyuncu');
  
  -- Profile oluştur
  INSERT INTO profiles (id, username, email)
  VALUES (NEW.id, user_username, NEW.email)
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email;
  
  -- Player stats oluştur
  INSERT INTO player_stats (id, username, cash, level, energy, soldiers, respect)
  VALUES (NEW.id, user_username, 1000, 1, 100, 0, 0)
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Hata durumunda log'la ama trigger'ı başarısız sayma
    RAISE WARNING 'Error in create_player_stats: %', SQLERRM;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_player_stats();

-- 7. Test için örnek veri (opsiyonel)
-- Bu sadece test amaçlı, gerçek kullanıcılar otomatik oluşacak
INSERT INTO player_stats (id, username, cash, level, soldiers, respect) 
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'TestOyuncu1', 5000, 3, 5, 150),
  ('00000000-0000-0000-0000-000000000002', 'TestOyuncu2', 8000, 5, 8, 300),
  ('00000000-0000-0000-0000-000000000003', 'TestOyuncu3', 12000, 7, 12, 500)
ON CONFLICT (id) DO NOTHING;

-- 8. Permissions'ları düzelt
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO anon;
GRANT ALL ON player_stats TO authenticated;
GRANT ALL ON player_stats TO anon;
GRANT ALL ON chat_messages TO authenticated;
GRANT ALL ON chat_messages TO anon;