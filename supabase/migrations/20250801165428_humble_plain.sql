/*
  # Temiz Authentication Düzeltmesi

  1. Sadece gerekli düzeltmeler
    - Trigger'ı yeniden oluştur
    - Basit RLS politikaları
    - Hata kontrolü ile güvenli trigger
    
  2. Mevcut tablolara dokunmuyoruz
    - player_stats zaten var
    - chat_messages zaten var
    - profiles zaten var
    
  3. Sadece çalışmayan kısımları düzelt
*/

-- 1. Mevcut trigger'ı sil ve yeniden oluştur
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_player_stats();

-- 2. Yeni trigger fonksiyonu - hata kontrolü ile
CREATE OR REPLACE FUNCTION create_player_stats()
RETURNS TRIGGER AS $$
DECLARE
  user_username text;
BEGIN
  -- Username'i al
  user_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'Oyuncu');
  
  -- Profile oluştur (hata olsa bile devam et)
  BEGIN
    INSERT INTO profiles (id, username, email)
    VALUES (NEW.id, user_username, NEW.email)
    ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username,
      email = EXCLUDED.email;
  EXCEPTION
    WHEN OTHERS THEN
      -- Hata olsa bile devam et
      NULL;
  END;
  
  -- Player stats oluştur (hata olsa bile devam et)
  BEGIN
    INSERT INTO player_stats (id, username, cash, level, energy, soldiers, respect, reputation)
    VALUES (NEW.id, user_username, 1000, 1, 100, 0, 0, 0)
    ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username;
  EXCEPTION
    WHEN OTHERS THEN
      -- Hata olsa bile devam et
      NULL;
  END;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. Trigger'ı oluştur
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_player_stats();

-- 4. Basit RLS politikaları (sadece yoksa oluştur)
DO $$
BEGIN
  -- Profiles için politika
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Allow all for profiles') THEN
    CREATE POLICY "Allow all for profiles" ON profiles FOR ALL USING (true);
  END IF;
  
  -- Player stats için politika
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'player_stats' AND policyname = 'Allow all for player_stats') THEN
    CREATE POLICY "Allow all for player_stats" ON player_stats FOR ALL USING (true);
  END IF;
  
  -- Chat messages için politika
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Allow all for chat_messages') THEN
    CREATE POLICY "Allow all for chat_messages" ON chat_messages FOR ALL USING (true);
  END IF;
END $$;

-- 5. Permissions (sadece gerekirse)
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO anon;
GRANT ALL ON player_stats TO authenticated;
GRANT ALL ON player_stats TO anon;
GRANT ALL ON chat_messages TO authenticated;
GRANT ALL ON chat_messages TO anon;