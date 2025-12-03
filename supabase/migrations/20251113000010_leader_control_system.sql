/*
  # Lider Kontrollü Soldato Sistemi
  
  - Sadece lider soldato kontrolü yapar
  - Üyelere soldato atanmaz
  - Lider diğer ailelere saldırabilir
*/

-- Tüm aile verilerini temizle
TRUNCATE TABLE family_members RESTART IDENTITY CASCADE;
TRUNCATE TABLE families RESTART IDENTITY CASCADE;

-- Gerekli alanları ekle
ALTER TABLE family_members 
ADD COLUMN IF NOT EXISTS assigned_soldiers BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS can_control_soldiers BOOLEAN DEFAULT false;

ALTER TABLE families 
ADD COLUMN IF NOT EXISTS owned_territories TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS total_assigned_soldiers BIGINT DEFAULT 0;

-- Lider için soldato kontrol fonksiyonu (üyelere atama yapmaz)
CREATE OR REPLACE FUNCTION leader_control_soldiers(
  p_action TEXT, -- 'attack' veya 'defense'
  p_soldiers_count BIGINT,
  p_target_territory TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_leader_id UUID;
  v_family_id UUID;
  v_family_treasury BIGINT;
  v_leader_role TEXT;
BEGIN
  -- Kullanıcı ID'sini al
  v_leader_id := auth.uid();
  
  IF v_leader_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Kullanıcı bulunamadı');
  END IF;

  -- Lider olduğunu kontrol et
  SELECT fm.family_id, fm.role INTO v_family_id, v_leader_role
  FROM family_members fm
  WHERE fm.player_id = v_leader_id;

  IF v_leader_role != 'leader' THEN
    RETURN json_build_object('success', false, 'message', 'Sadece lider soldato kontrolü yapabilir');
  END IF;

  IF v_family_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Aile üyesi değilsiniz');
  END IF;

  -- Aile hazinesindeki soldato sayısını kontrol et
  SELECT COALESCE(treasury, 0) INTO v_family_treasury
  FROM families
  WHERE id = v_family_id;

  IF v_family_treasury < p_soldiers_count THEN
    RETURN json_build_object('success', false, 'message', 'Aile hazinesinde yeterli soldato yok');
  END IF;

  -- Aksiyona göre işlem yap
  IF p_action = 'attack' AND p_target_territory IS NOT NULL THEN
    -- Saldırı durumunda soldato'yu kullan
    UPDATE families
    SET treasury = treasury - p_soldiers_count
    WHERE id = v_family_id;

    -- Saldırı fonksiyonunu çağır
    PERFORM attack_rival_family_territory(p_target_territory, p_soldiers_count);
    
    RETURN json_build_object('success', true, 'message', 'Saldırı emri verildi!');
    
  ELSIF p_action = 'defense' THEN
    -- Savunma durumunda soldato'yu hazineden düş
    UPDATE families
    SET treasury = treasury - p_soldiers_count,
        total_assigned_soldiers = total_assigned_soldiers + p_soldiers_count
    WHERE id = v_family_id;
    
    RETURN json_build_object('success', true, 'message', 'Savunma güçlendirildi!');
    
  ELSE
    RETURN json_build_object('success', false, 'message', 'Geçersiz aksiyon');
  END IF;
END;
$$;

-- Rakip aile saldırı fonksiyonu
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

  -- Saldıranın rolünü kontrol et
  SELECT fm.family_id, fm.role INTO v_attacker_family_id, v_attacker_role
  FROM family_members fm
  WHERE fm.player_id = v_attacker_id;

  -- Sadece lider saldırabilir
  IF v_attacker_role != 'leader' THEN
    RETURN json_build_object('success', false, 'message', 'Sadece lider saldırı emri verebilir');
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

  -- Saldırı sonucunu hesapla
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
    -- Saldırı başarısız
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

-- Aile üyesi rolü güncellendiğinde sadece lider yetkisi
CREATE OR REPLACE FUNCTION update_leader_permission()
RETURNS TRIGGER AS $$
BEGIN
  -- Sadece lider soldato kontrolü yapabilir
  IF NEW.role = 'leader' THEN
    NEW.can_control_soldiers = true;
  ELSE
    NEW.can_control_soldiers = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger oluştur
DROP TRIGGER IF EXISTS update_leader_permission_trigger ON family_members;
CREATE TRIGGER update_leader_permission_trigger
  BEFORE UPDATE OF role ON family_members
  FOR EACH ROW
  EXECUTE FUNCTION update_leader_permission();

-- Log
SELECT 'Leader control system created successfully - Only leader can control soldiers' as message;
