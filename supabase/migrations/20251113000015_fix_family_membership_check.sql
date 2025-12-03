/*
  # Aile Üyeliği Kontrol Düzeltmesi
  
  Bu migration aile üyeliği kontrollerini düzeltir:
  - Geçersiz/eski family_members kayıtlarını temizler
  - Player stats'ta family bilgilerini günceller
  - Aile üyeliği kontrol fonksiyonu ekler
*/

-- 1. Geçersiz family_members kayıtlarını temizle
-- (Ailesi silinmiş olan üyeleri temizle)
DELETE FROM family_members 
WHERE family_id NOT IN (SELECT id FROM families);

-- 2. Duplicate family_members kayıtlarını temizle
-- (Aynı player_id'ye sahip birden fazla kayıt varsa en yenisini tut)
WITH duplicate_members AS (
  SELECT player_id, 
         ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY joined_at DESC) as rn,
         id
  FROM family_members
)
DELETE FROM family_members 
WHERE id IN (
  SELECT id FROM duplicate_members WHERE rn > 1
);

-- 3. Player stats tablosuna family bilgileri ekle (eğer yoksa)
DO $$ 
BEGIN
    -- Family ID kolonu ekle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'player_stats' AND column_name = 'family_id') THEN
        ALTER TABLE player_stats ADD COLUMN family_id UUID REFERENCES families(id) ON DELETE SET NULL;
    END IF;
    
    -- Family name kolonu ekle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'player_stats' AND column_name = 'family_name') THEN
        ALTER TABLE player_stats ADD COLUMN family_name TEXT;
    END IF;
    
    -- Family role kolonu ekle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'player_stats' AND column_name = 'family_role') THEN
        ALTER TABLE player_stats ADD COLUMN family_role TEXT;
    END IF;
END $$;

-- 4. Player stats'ı mevcut family_members verilerine göre güncelle
UPDATE player_stats 
SET 
  family_id = fm.family_id,
  family_name = f.name,
  family_role = fm.role
FROM family_members fm
JOIN families f ON f.id = fm.family_id
WHERE player_stats.player_id = fm.player_id;

-- 5. Ailesi olmayan oyuncuların family bilgilerini temizle
UPDATE player_stats 
SET 
  family_id = NULL,
  family_name = NULL,
  family_role = NULL
WHERE player_id NOT IN (SELECT player_id FROM family_members);

-- 6. Family member ekleme/silme trigger'ları
CREATE OR REPLACE FUNCTION sync_player_family_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Yeni üye eklendiğinde player_stats'ı güncelle
    UPDATE player_stats 
    SET 
      family_id = NEW.family_id,
      family_name = (SELECT name FROM families WHERE id = NEW.family_id),
      family_role = NEW.role
    WHERE player_id = NEW.player_id;
    
    -- Eğer player_stats kaydı yoksa oluştur
    INSERT INTO player_stats (player_id, family_id, family_name, family_role)
    SELECT NEW.player_id, NEW.family_id, f.name, NEW.role
    FROM families f 
    WHERE f.id = NEW.family_id
    AND NOT EXISTS (SELECT 1 FROM player_stats WHERE player_id = NEW.player_id);
    
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Üye güncellendiğinde player_stats'ı güncelle
    UPDATE player_stats 
    SET 
      family_id = NEW.family_id,
      family_name = (SELECT name FROM families WHERE id = NEW.family_id),
      family_role = NEW.role
    WHERE player_id = NEW.player_id;
    
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Üye silindiğinde player_stats'tan family bilgilerini temizle
    UPDATE player_stats 
    SET 
      family_id = NULL,
      family_name = NULL,
      family_role = NULL
    WHERE player_id = OLD.player_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ları oluştur
DROP TRIGGER IF EXISTS sync_family_stats_trigger ON family_members;
CREATE TRIGGER sync_family_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON family_members
  FOR EACH ROW EXECUTE FUNCTION sync_player_family_stats();

-- 7. Family name değiştiğinde player_stats'ı güncelle
CREATE OR REPLACE FUNCTION sync_family_name_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.name != NEW.name THEN
    -- Aile adı değiştiğinde tüm üyelerin player_stats'ını güncelle
    UPDATE player_stats 
    SET family_name = NEW.name
    WHERE family_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_family_name_trigger ON families;
CREATE TRIGGER sync_family_name_trigger
  AFTER UPDATE ON families
  FOR EACH ROW EXECUTE FUNCTION sync_family_name_change();

-- 8. Aile üyeliği kontrol fonksiyonu
CREATE OR REPLACE FUNCTION check_player_family_membership(p_player_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_family_info RECORD;
BEGIN
  -- Player'ın aile bilgilerini al
  SELECT 
    fm.family_id,
    f.name as family_name,
    fm.role,
    fm.joined_at
  INTO v_family_info
  FROM family_members fm
  JOIN families f ON f.id = fm.family_id
  WHERE fm.player_id = p_player_id;

  IF FOUND THEN
    -- Ailesi var
    RETURN json_build_object(
      'has_family', true,
      'family_id', v_family_info.family_id,
      'family_name', v_family_info.family_name,
      'role', v_family_info.role,
      'joined_at', v_family_info.joined_at
    );
  ELSE
    -- Ailesi yok
    RETURN json_build_object(
      'has_family', false,
      'family_id', null,
      'family_name', null,
      'role', null,
      'joined_at', null
    );
  END IF;
END;
$$;

-- 9. Temizlik ve doğrulama
-- Orphaned family_members kayıtlarını tekrar kontrol et
DELETE FROM family_members 
WHERE family_id NOT IN (SELECT id FROM families);

-- Player_stats'ta family_id'si olan ama family_members'ta olmayan kayıtları temizle
UPDATE player_stats 
SET family_id = NULL, family_name = NULL, family_role = NULL
WHERE family_id IS NOT NULL 
AND player_id NOT IN (SELECT player_id FROM family_members);

-- Log
SELECT 
  'Family membership check system installed successfully' as message,
  COUNT(*) as total_family_members
FROM family_members;
