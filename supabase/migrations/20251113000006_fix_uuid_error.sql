/*
  # UUID = TEXT Hatasını Düzelt
  
  Bu migration UUID tip uyumsuzluğunu düzeltir
*/

-- Önce tüm problematik trigger'ları kaldır
DROP TRIGGER IF EXISTS assign_territory_on_family_creation ON families;
DROP TRIGGER IF EXISTS update_soldier_control_on_role_change ON family_members;

-- Problematik fonksiyonları kaldır
DROP FUNCTION IF EXISTS assign_initial_territory_to_family();
DROP FUNCTION IF EXISTS update_soldier_control_permission();

-- Sadece gerekli alanları ekle
ALTER TABLE family_members 
ADD COLUMN IF NOT EXISTS assigned_soldiers BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS can_control_soldiers BOOLEAN DEFAULT false;

ALTER TABLE families 
ADD COLUMN IF NOT EXISTS owned_territories TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS total_assigned_soldiers BIGINT DEFAULT 0;

-- Basit soldato atama fonksiyonu (UUID sorunları olmadan)
CREATE OR REPLACE FUNCTION assign_soldiers_to_member(
  p_member_id UUID,
  p_soldiers_count BIGINT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assigner_id UUID;
  v_family_id UUID;
  v_family_treasury BIGINT;
BEGIN
  v_assigner_id := auth.uid();
  
  IF v_assigner_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Kullanıcı bulunamadı');
  END IF;

  -- Aile ID'sini al
  SELECT family_id INTO v_family_id
  FROM family_members
  WHERE player_id = v_assigner_id;

  IF v_family_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Aile üyesi değilsiniz');
  END IF;

  -- Hazine kontrolü
  SELECT COALESCE(treasury, 0) INTO v_family_treasury
  FROM families
  WHERE id = v_family_id;

  IF v_family_treasury < p_soldiers_count THEN
    RETURN json_build_object('success', false, 'message', 'Yetersiz soldato');
  END IF;

  -- Soldato transferi
  UPDATE families
  SET treasury = treasury - p_soldiers_count
  WHERE id = v_family_id;

  UPDATE family_members
  SET assigned_soldiers = COALESCE(assigned_soldiers, 0) + p_soldiers_count,
      can_control_soldiers = true
  WHERE id = p_member_id;

  RETURN json_build_object('success', true, 'message', 'Soldato atandı');
END;
$$;

-- Log
SELECT 'UUID error fixed successfully' as message;
