/*
  # Eksik Player Stats Oluştur

  1. Mevcut kullanıcılar için eksik player stats oluştur
  2. Email confirmed olmayan kullanıcıları aktif et
  3. Giriş sistemini düzelt
*/

-- 1. Email confirmed olmayan kullanıcıları aktif et
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- 2. Eksik player stats oluştur
INSERT INTO player_stats (
  id, 
  username, 
  cash, 
  level, 
  energy, 
  soldiers, 
  respect, 
  reputation,
  strength,
  defense,
  speed,
  intelligence,
  charisma
)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1), 'Oyuncu') as username,
  1000 as cash,
  1 as level,
  100 as energy,
  0 as soldiers,
  0 as respect,
  0 as reputation,
  10 as strength,
  10 as defense,
  10 as speed,
  10 as intelligence,
  10 as charisma
FROM auth.users u
LEFT JOIN player_stats ps ON u.id = ps.id
WHERE ps.id IS NULL;

-- 3. Eksik profiles oluştur
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
  user_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'Oyuncu');
  
  -- Profile oluştur
  INSERT INTO profiles (id, username, email)
  VALUES (NEW.id, user_username, NEW.email)
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email;
  
  -- Player stats oluştur
  INSERT INTO player_stats (
    id, username, cash, level, energy, soldiers, respect, reputation,
    strength, defense, speed, intelligence, charisma
  )
  VALUES (
    NEW.id, user_username, 1000, 1, 100, 0, 0, 0,
    10, 10, 10, 10, 10
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Log için
SELECT 'Player stats created for existing users' as message;