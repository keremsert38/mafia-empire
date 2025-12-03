/*
  # Aile Soldato Kontrol Sistemi - Basit Versiyon
  
  Bu migration sadece temel alanları ekler:
  1. Family_members tablosuna soldato kontrol alanları
  2. Families tablosuna malikane alanları
  3. Basit soldato atama fonksiyonu
*/

-- Family_members tablosuna soldato kontrol alanları ekle
ALTER TABLE family_members 
ADD COLUMN IF NOT EXISTS assigned_soldiers BIGINT DEFAULT 0 CHECK (assigned_soldiers >= 0),
ADD COLUMN IF NOT EXISTS can_control_soldiers BOOLEAN DEFAULT false;

-- Family_members tablosundaki role enum'unu güncelle
ALTER TABLE family_members 
DROP CONSTRAINT IF EXISTS family_members_role_check;

ALTER TABLE family_members 
ADD CONSTRAINT family_members_role_check 
CHECK (role IN ('leader', 'capo', 'consigliere', 'sottocapo', 'caporegime'));

-- Families tablosuna malikane alanları ekle
ALTER TABLE families 
ADD COLUMN IF NOT EXISTS owned_territories TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS total_assigned_soldiers BIGINT DEFAULT 0 CHECK (total_assigned_soldiers >= 0);

-- Soldato atama fonksiyonu
CREATE OR REPLACE FUNCTION assign_soldiers_to_member(
  p_member_id UUID,
  p_soldiers_count BIGINT,
  p_assignment_type TEXT,
  p_target_territory TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assigner_id UUID;
  v_family_id UUID;
  v_assigner_role TEXT;
  v_family_treasury BIGINT;
  v_member_exists BOOLEAN;
BEGIN
  -- Kullanıcı ID'sini al
  v_assigner_id := auth.uid();
  IF v_assigner_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Kullanıcı bulunamadı');
  END IF;

  -- Atama yapacak kişinin bilgilerini al
  SELECT fm.family_id, fm.role INTO v_family_id, v_assigner_role
  FROM family_members fm
  WHERE fm.player_id = v_assigner_id;

  -- Yetki kontrolü
  IF v_assigner_role NOT IN ('leader', 'capo', 'sottocapo') THEN
    RETURN json_build_object('success', false, 'message', 'Soldato atama yetkiniz yok');
  END IF;

  -- Hedef üyenin varlığını kontrol et
  SELECT EXISTS(
    SELECT 1 FROM family_members 
    WHERE id = p_member_id AND family_id = v_family_id
  ) INTO v_member_exists;
  
  IF NOT v_member_exists THEN
    RETURN json_build_object('success', false, 'message', 'Üye bulunamadı');
  END IF;

  -- Aile hazinesindeki soldato sayısını kontrol et
  SELECT treasury INTO v_family_treasury
  FROM families
  WHERE id = v_family_id;

  IF v_family_treasury < p_soldiers_count THEN
    RETURN json_build_object('success', false, 'message', 'Aile hazinesinde yeterli soldato yok');
  END IF;

  -- Soldato'yu hazineden düş
  UPDATE families
  SET treasury = treasury - p_soldiers_count,
      total_assigned_soldiers = total_assigned_soldiers + p_soldiers_count
  WHERE id = v_family_id;

  -- Üyeye soldato ata
  UPDATE family_members
  SET assigned_soldiers = assigned_soldiers + p_soldiers_count,
      can_control_soldiers = true
  WHERE id = p_member_id;

  RETURN json_build_object(
    'success', true, 
    'message', format('%s soldato başarıyla atandı!', p_soldiers_count)
  );
END;
$$;

-- Aile üyesi rolü güncellendiğinde soldato kontrol yetkisini ayarla
CREATE OR REPLACE FUNCTION update_soldier_control_permission()
RETURNS TRIGGER AS $$
BEGIN
  -- Capo ve Sottocapo soldato kontrolü yapabilir
  IF NEW.role IN ('leader', 'capo', 'sottocapo') THEN
    NEW.can_control_soldiers := true;
  ELSE
    NEW.can_control_soldiers := false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger oluştur
DROP TRIGGER IF EXISTS update_soldier_control_on_role_change ON family_members;
CREATE TRIGGER update_soldier_control_on_role_change
  BEFORE UPDATE OF role ON family_members
  FOR EACH ROW
  EXECUTE FUNCTION update_soldier_control_permission();

-- Log
SELECT 'Family soldier control system created successfully - SIMPLE VERSION' as message;
