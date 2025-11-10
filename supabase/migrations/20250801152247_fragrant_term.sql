/*
  # Oyuncu İstatistikleri ve Chat Sistemi - Final

  1. Yeni Tablolar
    - `player_stats` - Her oyuncunun tam istatistikleri
    - `chat_messages` - Genel sohbet mesajları
    
  2. Güvenlik
    - RLS etkin
    - Herkes diğer oyuncuların statslarını görebilir
    - Sadece kendi statsını güncelleyebilir
    - Chat herkes okuyabilir, kendi mesajını yazabilir
    
  3. Real-time
    - Chat ve stats için real-time subscription
    
  4. Otomatik Kayıt
    - Yeni kullanıcı kaydolduğunda otomatik stats oluşturulur
*/

-- Önce mevcut tabloları temizle (eğer varsa)
DROP TABLE IF EXISTS player_stats CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;

-- Player stats tablosu - tam oyuncu verileri
CREATE TABLE player_stats (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  level integer DEFAULT 1,
  cash bigint DEFAULT 10000,
  energy integer DEFAULT 100,
  max_energy integer DEFAULT 100,
  soldiers integer DEFAULT 0,
  respect integer DEFAULT 0,
  reputation integer DEFAULT 0,
  experience integer DEFAULT 0,
  experience_to_next integer DEFAULT 100,
  strength integer DEFAULT 10,
  defense integer DEFAULT 10,
  speed integer DEFAULT 10,
  intelligence integer DEFAULT 10,
  charisma integer DEFAULT 10,
  available_points integer DEFAULT 0,
  rank text DEFAULT 'Soldato',
  territories integer DEFAULT 0,
  total_earnings bigint DEFAULT 0,
  battles_won integer DEFAULT 0,
  battles_lost integer DEFAULT 0,
  mafia_tokens integer DEFAULT 0,
  profile_image text,
  location text DEFAULT 'Şehir Merkezi',
  join_date timestamptz DEFAULT now(),
  last_active timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Chat messages tablosu
CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  username text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS'yi etkinleştir
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Player stats policies - herkes okuyabilir, sadece kendi verisini güncelleyebilir
CREATE POLICY "Anyone can read player stats" ON player_stats
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own stats" ON player_stats
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own stats" ON player_stats
  FOR UPDATE USING (auth.uid() = id);

-- Chat policies - herkes okuyabilir, kendi mesajını yazabilir
CREATE POLICY "Anyone can read chat messages" ON chat_messages
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    NEW.last_active = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_player_stats_updated_at 
    BEFORE UPDATE ON player_stats 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Real-time için publication
ALTER PUBLICATION supabase_realtime ADD TABLE player_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Yeni kullanıcı kaydolduğunda otomatik stats oluştur
CREATE OR REPLACE FUNCTION create_player_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO player_stats (id, username)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger'ı oluştur
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_player_stats();