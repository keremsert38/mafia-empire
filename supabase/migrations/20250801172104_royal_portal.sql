```sql
-- This migration ensures the automatic creation of player_stats and profiles
-- for new users upon registration, and sets permissive RLS policies for testing.

-- 1. Drop existing trigger and function to ensure a clean recreation
-- This makes the migration idempotent (can be run multiple times without issues).
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_player_stats();

-- 2. Recreate the function to create player_stats and profiles
CREATE OR REPLACE FUNCTION create_player_stats()
RETURNS TRIGGER AS $$
DECLARE
  user_username text;
BEGIN
  -- Get username from user_metadata or email
  user_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'Oyuncu');
  
  -- Create profile entry
  BEGIN
    INSERT INTO public.profiles (id, username, email)
    VALUES (NEW.id, user_username, NEW.email)
    ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username,
      email = EXCLUDED.email;
    RAISE LOG 'Profile created/updated for user: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error creating/updating profile for user %: %', NEW.id, SQLERRM;
  END;
  
  -- Create player_stats entry
  BEGIN
    INSERT INTO public.player_stats (
      id, username, cash, level, energy, soldiers, respect, reputation,
      strength, defense, speed, intelligence, charisma
    )
    VALUES (
      NEW.id, user_username, 1000, 1, 100, 0, 0, 0,
      10, 10, 10, 10, 10
    )
    ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username;
    RAISE LOG 'Player stats created/updated for user: %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error creating/updating player stats for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. Recreate the trigger to call the function after a new user is inserted into auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_player_stats();

-- 4. Ensure RLS policies are permissive for testing (Allow all operations)
-- These policies are idempotent, meaning they will only be created if they don't already exist.
DO $$
BEGIN
  -- Policy for profiles table
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'allow_all_profiles') THEN
    CREATE POLICY "allow_all_profiles" ON public.profiles
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  -- Policy for player_stats table
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'player_stats' AND policyname = 'allow_all_player_stats') THEN
    CREATE POLICY "allow_all_player_stats" ON public.player_stats
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  -- Policy for chat_messages table
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'allow_all_chat_messages') THEN
    CREATE POLICY "allow_all_chat_messages" ON public.chat_messages
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 5. Grant necessary permissions (if not already granted by RLS policies)
-- These grants are often redundant if RLS policies are set to true, but good for explicit clarity.
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.player_stats TO authenticated;
GRANT ALL ON public.player_stats TO anon;
GRANT ALL ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO anon;

-- Note: This migration does NOT touch `ALTER PUBLICATION` commands.
-- It assumes previous migrations have correctly set up real-time publications.
```