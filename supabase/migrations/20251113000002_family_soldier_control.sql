-- Bu dosya silinecek, 20251113000003_family_soldier_control_fixed.sql kullanın

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

-- Aile soldato dağıtım tablosu
CREATE TABLE IF NOT EXISTS family_soldier_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  soldiers_assigned BIGINT NOT NULL CHECK (soldiers_assigned > 0),
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('defense', 'attack', 'patrol')),
  target_territory TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled'))
);

-- Index'ler ekle
CREATE INDEX IF NOT EXISTS idx_family_soldier_assignments_family_id ON family_soldier_assignments(family_id);
CREATE INDEX IF NOT EXISTS idx_family_soldier_assignments_member_id ON family_soldier_assignments(member_id);
CREATE INDEX IF NOT EXISTS idx_family_soldier_assignments_status ON family_soldier_assignments(status);

-- RLS politikaları
ALTER TABLE family_soldier_assignments ENABLE ROW LEVEL SECURITY;

-- Aile üyeleri kendi görevlerini görebilir
CREATE POLICY "Family members can view assignments"
  ON family_soldier_assignments
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id 
      FROM family_members 
      WHERE player_id = auth.uid()
    )
  );

-- Capo ve Sottocapo soldato ataması yapabilir
CREATE POLICY "Leaders can manage soldier assignments"
  ON family_soldier_assignments
  FOR ALL
  USING (
    assigned_by = auth.uid() AND
    family_id IN (
      SELECT fm.family_id 
      FROM family_members fm
      WHERE fm.player_id = auth.uid() 
      AND fm.role IN ('leader', 'capo', 'sottocapo')
    )
  );

-- Yeni aile kurulduğunda otomatik malikane atama fonksiyonu
CREATE OR REPLACE FUNCTION assign_initial_territory_to_family()
RETURNS TRIGGER AS $$
DECLARE
  v_available_territory TEXT;
BEGIN
  -- Boş bir bölge bul
  SELECT region_id INTO v_available_territory
  FROM region_state
  WHERE owner_user_id IS NULL
  ORDER BY RANDOM()
  LIMIT 1;
  
  IF v_available_territory IS NOT NULL THEN
    -- Bölgeyi aileye ata
    UPDATE region_state
    SET owner_user_id = NEW.leader_id,
        defender_soldiers = 50 -- Başlangıç savunma gücü
    WHERE region_id = v_available_territory;
    
    -- Aile tablosunu güncelle
    UPDATE families
    SET owned_territories = ARRAY[v_available_territory]
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger oluştur
CREATE TRIGGER assign_territory_on_family_creation
  AFTER INSERT ON families
  FOR EACH ROW
  EXECUTE FUNCTION assign_initial_territory_to_family();

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

  -- Atama kaydını oluştur
  INSERT INTO family_soldier_assignments (
    family_id, member_id, assigned_by, soldiers_assigned, 
    assignment_type, target_territory
  )
  VALUES (
    v_family_id, p_member_id, v_assigner_id, p_soldiers_count,
    p_assignment_type, p_target_territory
  );

  RETURN json_build_object(
    'success', true, 
    'message', format('%s soldato başarıyla atandı!', p_soldiers_count)
  );
END;
$$;

-- Rakip aile malikânesine saldırı fonksiyonu
CREATE OR REPLACE FUNCTION attack_rival_family_territory(
  p_target_territory TEXT,
  p_attacking_soldiers BIGINT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attacker_id UUID;
  v_attacker_family_id UUID;
  v_attacker_role TEXT;
  v_attacker_assigned_soldiers BIGINT;
  v_defender_user_id UUID;
  v_defender_family_id UUID;
  v_defender_soldiers BIGINT;
  v_attack_success BOOLEAN;
BEGIN
  -- Saldıran kullanıcı bilgilerini al
  v_attacker_id := auth.uid();
  IF v_attacker_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Kullanıcı bulunamadı');
  END IF;

  -- Saldıranın aile bilgilerini al
  SELECT fm.family_id, fm.role, fm.assigned_soldiers 
  INTO v_attacker_family_id, v_attacker_role, v_attacker_assigned_soldiers
  FROM family_members fm
  WHERE fm.player_id = v_attacker_id;

  -- Yetki kontrolü
  IF v_attacker_role NOT IN ('leader', 'capo', 'sottocapo') THEN
    RETURN json_build_object('success', false, 'message', 'Saldırı emri verme yetkiniz yok');
  END IF;

  -- Yeterli soldato kontrolü
  IF v_attacker_assigned_soldiers < p_attacking_soldiers THEN
    RETURN json_build_object('success', false, 'message', 'Yeterli soldatonuz yok');
  END IF;

  -- Hedef bölgenin sahibini bul
  SELECT owner_user_id, defender_soldiers 
  INTO v_defender_user_id, v_defender_soldiers
  FROM region_state
  WHERE region_id = p_target_territory;

  IF v_defender_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Bu bölge kimseye ait değil');
  END IF;

  -- Savunucunun aile bilgilerini al
  SELECT family_id INTO v_defender_family_id
  FROM family_members
  WHERE player_id = v_defender_user_id;

  -- Kendi ailesine saldıramasın
  IF v_attacker_family_id = v_defender_family_id THEN
    RETURN json_build_object('success', false, 'message', 'Kendi ailenizin bölgesine saldıramazsınız');
  END IF;

  -- Saldıranın soldato'sunu düş
  UPDATE family_members
  SET assigned_soldiers = assigned_soldiers - p_attacking_soldiers
  WHERE player_id = v_attacker_id;

  -- Saldırı sonucunu hesapla (basit algoritma)
  v_attack_success := p_attacking_soldiers > v_defender_soldiers;

  IF v_attack_success THEN
    -- Saldırı başarılı - bölgeyi ele geçir
    UPDATE region_state
    SET owner_user_id = v_attacker_id,
        defender_soldiers = p_attacking_soldiers - v_defender_soldiers
    WHERE region_id = p_target_territory;

    -- Saldıranın ailesinin bölge listesini güncelle
    UPDATE families
    SET owned_territories = array_append(owned_territories, p_target_territory)
    WHERE id = v_attacker_family_id;

    -- Savunucunun ailesinin bölge listesinden çıkar
    UPDATE families
    SET owned_territories = array_remove(owned_territories, p_target_territory)
    WHERE id = v_defender_family_id;

    RETURN json_build_object(
      'success', true, 
      'message', format('%s bölgesi başarıyla ele geçirildi!', p_target_territory)
    );
  ELSE
    -- Saldırı başarısız - sadece savunmayı düşür
    UPDATE region_state
    SET defender_soldiers = defender_soldiers - p_attacking_soldiers
    WHERE region_id = p_target_territory;

    RETURN json_build_object(
      'success', false, 
      'message', 'Saldırı başarısız! Savunma gücü düşürüldü.'
    );
  END IF;
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
CREATE TRIGGER update_soldier_control_on_role_change
  BEFORE UPDATE OF role ON family_members
  FOR EACH ROW
  EXECUTE FUNCTION update_soldier_control_permission();

-- İzinler
GRANT ALL ON family_soldier_assignments TO authenticated;
GRANT ALL ON family_soldier_assignments TO anon;

-- Log
SELECT 'Family soldier control system created successfully' as message;
