/*
  # Giriş Sistemi ve Player Stats Düzeltmesi

  1. Mevcut kullanıcılar için player stats oluştur
  2. Email confirmation'ı kapat
  3. Trigger'ı güçlendir
*/

-- 1. Mevcut kullanıcıları email confirmed yap
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;

-- 2. Mevcut kullanıcılar için eksik player stats oluştur
INSERT INTO player_stats (id, username, cash, level, energy, soldiers, respect, reputation)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1), 'Oyuncu') as username,
  1000 as cash,
  1 as level,
  100 as energy,
  0 as soldiers,
  0 as respect,
  0 as reputation
FROM auth.users u
LEFT JOIN player_stats ps ON u.id = ps.id
WHERE ps.id IS NULL;

-- 3. Mevcut kullanıcılar için eksik profiles oluştur
INSERT INTO profiles (id, username, email)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1), 'Oyuncu') as username,
  u.email
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- 4. Trigger'ı güçlendir
CREATE OR REPLACE FUNCTION create_player_stats()
RETURNS TRIGGER AS $$
DECLARE
  user_username text;
BEGIN
  -- Username'i al
  user_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'Oyuncu');
  
  -- Profile oluştur
  BEGIN
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
  
  -- Player stats oluştur
  BEGIN
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

-- 5. Trigger'ı yeniden oluştur
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_player_stats();