/*
  # Chat ve Oyuncu Verileri için Tablolar

  1. Yeni Tablolar
    - `chat_messages` - Tüm sohbet mesajları
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `username` (text)
      - `message` (text)
      - `created_at` (timestamp)
    
    - `player_stats` - Oyuncu istatistikleri
      - `id` (uuid, primary key, user id)
      - `username` (text)
      - `level` (integer)
      - `cash` (bigint)
      - `energy` (integer)
      - `soldiers` (integer)
      - `respect` (integer)
      - `experience` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Güvenlik
    - Her iki tablo için RLS etkin
    - Chat mesajları herkes okuyabilir, sadece kendi mesajını yazabilir
    - Player stats herkes okuyabilir, sadece kendi verisini güncelleyebilir

  3. Real-time
    - Chat mesajları için real-time subscription
*/

-- Chat messages tablosu
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  username text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Player stats tablosu
CREATE TABLE IF NOT EXISTS player_stats (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  level integer DEFAULT 1,
  cash bigint DEFAULT 10000,
  energy integer DEFAULT 100,
  soldiers integer DEFAULT 0,
  respect integer DEFAULT 0,
  experience integer DEFAULT 0,
  experience_to_next integer DEFAULT 100,
  rank text DEFAULT 'Soldato',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS'yi etkinleştir
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

-- Chat policies - herkes okuyabilir, sadece kendi mesajını yazabilir
CREATE POLICY "Anyone can read chat messages" ON chat_messages
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Player stats policies - herkes okuyabilir, sadece kendi verisini güncelleyebilir
CREATE POLICY "Anyone can read player stats" ON player_stats
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own stats" ON player_stats
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own stats" ON player_stats
  FOR UPDATE USING (auth.uid() = id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_player_stats_updated_at 
    BEFORE UPDATE ON player_stats 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Real-time için publication oluştur
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE player_stats;