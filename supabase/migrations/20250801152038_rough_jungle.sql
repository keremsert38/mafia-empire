@@ .. @@
 DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
 CREATE TRIGGER on_auth_user_created
   AFTER INSERT ON auth.users
   FOR EACH ROW EXECUTE FUNCTION create_player_stats();
-
--- Test verisi ekle (sadece gerçek kullanıcılar varsa)
-INSERT INTO player_stats (id, username, level, cash, soldiers, respect) 
-VALUES 
-  ('00000000-0000-0000-0000-000000000001', 'TestOyuncu1', 5, 50000, 10, 1500),
-  ('00000000-0000-0000-0000-000000000002', 'TestOyuncu2', 3, 25000, 5, 800)
-ON CONFLICT (id) DO NOTHING;