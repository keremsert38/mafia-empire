/*
  # Aile Rütbe Sistemini Düzelt

  1. Değişiklikler
    - family_members tablosundaki role constraint'ini güncelle
    - Doğru hiyerarşi: capo > consigliere > sottocapo > caporegime
    
  2. Mevcut Veriler
    - Mevcut 'leader' rollerini 'capo' yap
    - Mevcut 'member' rollerini 'caporegime' yap
*/

-- Önce constraint'i kaldır
ALTER TABLE family_members DROP CONSTRAINT IF EXISTS family_members_role_check;

-- Mevcut verileri güncelle
UPDATE family_members SET role = 'capo' WHERE role = 'leader';
UPDATE family_members SET role = 'caporegime' WHERE role = 'member';
UPDATE family_members SET role = 'caporegime' WHERE role = 'officer';

-- Yeni constraint ekle
ALTER TABLE family_members ADD CONSTRAINT family_members_role_check 
CHECK (role IN ('capo', 'consigliere', 'sottocapo', 'caporegime'));

-- Families tablosunda leader_id kontrolü için trigger güncelle
CREATE OR REPLACE FUNCTION check_family_leader()
RETURNS TRIGGER AS $$
BEGIN
  -- Aile lideri capo rolünde olmalı
  IF NOT EXISTS (
    SELECT 1 FROM family_members 
    WHERE family_id = NEW.id 
    AND player_id = NEW.leader_id 
    AND role = 'capo'
  ) THEN
    -- Eğer leader family_members'da yoksa, ekle
    INSERT INTO family_members (family_id, player_id, player_name, role)
    SELECT NEW.id, NEW.leader_id, 
           COALESCE(ps.username, 'Lider'), 'capo'
    FROM player_stats ps 
    WHERE ps.id = NEW.leader_id
    ON CONFLICT (player_id) DO UPDATE SET role = 'capo';
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger'ı families tablosuna ekle
DROP TRIGGER IF EXISTS ensure_family_leader ON families;
CREATE TRIGGER ensure_family_leader
  AFTER INSERT OR UPDATE ON families
  FOR EACH ROW EXECUTE FUNCTION check_family_leader();

-- Log
SELECT 'Family roles updated successfully' as message;