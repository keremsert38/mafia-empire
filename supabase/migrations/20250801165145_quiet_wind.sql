/*
  # Authentication Sistemi Düzeltmeleri - confirmed_at hatası olmadan

  1. Yeni Tablolar ve Trigger'lar
    - Kullanıcı oluşturulduğunda otomatik profile ve stats oluştur
    - confirmed_at sütununa dokunmuyoruz (generated column)
    
  2. Güvenlik
    - Basit RLS politikaları
    - Test aşaması için geniş izinler
    
  3. Authentication
    - Dashboard'dan manuel olarak ayarlanacak
    - confirmed_at'i güncellemeye çalışmıyoruz
*/

-- 1. Sadece email_confirmed_at'i güncelle (confirmed_at'e dokunma)
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;

-- 2. Profiles tablosu için basit politikalar
DROP POLICY IF EXISTS "Allow all operations" ON profiles;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users full access" ON profiles;

-- Profiles için tek basit politika
CREATE POLICY "Allow all operations on profiles" ON profiles
  FOR ALL USING (true);

-- 3. Player stats için basit politikalar
DROP POLICY IF EXISTS "Allow all operations" ON player_stats;
DROP POLICY IF EXISTS "Enable all for player stats" ON player_stats;

-- Player stats için tek basit politika
CREATE POLICY "Allow all operations on player_stats" ON player_stats
  FOR ALL USING (true);

-- 4. Chat messages için basit politikalar
DROP POLICY IF EXISTS "Allow all operations" ON chat_messages;
DROP POLICY IF EXISTS "Enable all for chat messages" ON chat_messages;

-- Chat messages için tek basit politika
CREATE POLICY "Allow all operations on chat_messages" ON chat_messages
  FOR ALL USING (true);

-- 5. Trigger'ları yeniden oluştur
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_player_stats();

CREATE OR REPLACE FUNCTION create_player_stats()
RETURNS TRIGGER AS $$
DECLARE
  user_username text;
BEGIN
  -- Username'i al
  user_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'Oyuncu');
  
  BEGIN
    -- Profile oluştur
    INSERT INTO profiles (id, username, email)
    VALUES (NEW.id, user_username, NEW.email)
    ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username,
      email = EXCLUDED.email;
    
    RAISE LOG 'Profile created for user: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  END;
  
  BEGIN
    -- Player stats oluştur - başlangıç parası 1000$
    INSERT INTO player_stats (id, username, cash, level, energy, soldiers, respect, reputation)
    VALUES (NEW.id, user_username, 1000, 1, 100, 0, 0, 0)
    ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username;
    
    RAISE LOG 'Player stats created for user: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error creating player stats for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_player_stats();

-- 6. Permissions'ları düzelt
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO anon;
GRANT ALL ON player_stats TO authenticated;
GRANT ALL ON player_stats TO anon;
GRANT ALL ON chat_messages TO authenticated;
GRANT ALL ON chat_messages TO anon;

-- 7. Real-time subscription'ları etkinleştir
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE player_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- 8. Test kullanıcıları ekle (sadece yoksa)
INSERT INTO player_stats (id, username, cash, level, soldiers, respect, reputation) 
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'TestOyuncu1', 5000, 3, 5, 150, 150),
  ('00000000-0000-0000-0000-000000000002', 'TestOyuncu2', 8000, 5, 8, 300, 300),
  ('00000000-0000-0000-0000-000000000003', 'TestOyuncu3', 12000, 7, 12, 500, 500)
ON CONFLICT (id) DO NOTHING;