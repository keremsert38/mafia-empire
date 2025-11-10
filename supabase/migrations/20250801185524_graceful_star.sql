/*
  # Aile Sistemi - Klan Kurma ve Katılma İstekleri

  1. Yeni Tablolar
    - `families` - Aile/klan bilgileri
    - `family_join_requests` - Aile katılma istekleri
    - `family_members` - Aile üyeleri
    
  2. Güvenlik
    - RLS etkin
    - Herkes aileleri görebilir
    - Sadece aile lideri üye yönetimi yapabilir
    
  3. Özellikler
    - Aile kurma
    - Katılma isteği gönderme
    - İstek onaylama/reddetme
    - Üye yönetimi
*/

-- Aileler tablosu
CREATE TABLE IF NOT EXISTS families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  leader_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  member_count integer DEFAULT 1,
  total_power integer DEFAULT 0,
  level integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Aile katılma istekleri tablosu
CREATE TABLE IF NOT EXISTS family_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  player_name text NOT NULL,
  player_level integer NOT NULL,
  player_power integer DEFAULT 0,
  message text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(family_id, player_id)
);

-- Aile üyeleri tablosu
CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  player_name text NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('leader', 'officer', 'member')),
  contribution integer DEFAULT 0,
  joined_at timestamptz DEFAULT now(),
  last_active timestamptz DEFAULT now(),
  UNIQUE(player_id) -- Bir oyuncu sadece bir ailede olabilir
);

-- RLS'yi etkinleştir
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Families policies - herkes okuyabilir, sadece lider güncelleyebilir
CREATE POLICY "Anyone can read families" ON families
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create family" ON families
  FOR INSERT WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "Only leader can update family" ON families
  FOR UPDATE USING (auth.uid() = leader_id);

CREATE POLICY "Only leader can delete family" ON families
  FOR DELETE USING (auth.uid() = leader_id);

-- Join requests policies
CREATE POLICY "Anyone can read join requests" ON family_join_requests
  FOR SELECT USING (true);

CREATE POLICY "Players can create join requests" ON family_join_requests
  FOR INSERT WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Players can update own requests" ON family_join_requests
  FOR UPDATE USING (auth.uid() = player_id);

CREATE POLICY "Family leaders can update requests" ON family_join_requests
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT leader_id FROM families WHERE id = family_id
    )
  );

-- Family members policies
CREATE POLICY "Anyone can read family members" ON family_members
  FOR SELECT USING (true);

CREATE POLICY "Family leaders can manage members" ON family_members
  FOR ALL USING (
    auth.uid() IN (
      SELECT leader_id FROM families WHERE id = family_id
    )
  );

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_families_updated_at 
    BEFORE UPDATE ON families 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_join_requests_updated_at 
    BEFORE UPDATE ON family_join_requests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Aile üyesi eklendiğinde aile sayacını güncelle
CREATE OR REPLACE FUNCTION update_family_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE families 
    SET member_count = member_count + 1 
    WHERE id = NEW.family_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE families 
    SET member_count = member_count - 1 
    WHERE id = OLD.family_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER family_member_count_trigger
  AFTER INSERT OR DELETE ON family_members
  FOR EACH ROW EXECUTE FUNCTION update_family_member_count();

-- Real-time için publication
ALTER PUBLICATION supabase_realtime ADD TABLE families;
ALTER PUBLICATION supabase_realtime ADD TABLE family_join_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE family_members;

-- İzinler
GRANT ALL ON families TO authenticated;
GRANT ALL ON families TO anon;
GRANT ALL ON family_join_requests TO authenticated;
GRANT ALL ON family_join_requests TO anon;
GRANT ALL ON family_members TO authenticated;
GRANT ALL ON family_members TO anon;