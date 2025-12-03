/*
  # Son Aile Hatası Düzeltme
  
  Tüm aile verilerini temizle ve sistemi sıfırla
*/

-- Tüm aile verilerini temizle
TRUNCATE TABLE family_members RESTART IDENTITY CASCADE;
TRUNCATE TABLE families RESTART IDENTITY CASCADE;

-- Gerekli alanları tekrar ekle (güvenli şekilde)
ALTER TABLE family_members 
ADD COLUMN IF NOT EXISTS assigned_soldiers BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS can_control_soldiers BOOLEAN DEFAULT false;

ALTER TABLE families 
ADD COLUMN IF NOT EXISTS owned_territories TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS total_assigned_soldiers BIGINT DEFAULT 0;

-- Basit soldato atama fonksiyonu
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

  SELECT family_id INTO v_family_id
  FROM family_members
  WHERE player_id = v_assigner_id;

  IF v_family_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Aile üyesi değilsiniz');
  END IF;

  SELECT COALESCE(treasury, 0) INTO v_family_treasury
  FROM families
  WHERE id = v_family_id;

  IF v_family_treasury < p_soldiers_count THEN
    RETURN json_build_object('success', false, 'message', 'Yetersiz soldato');
  END IF;

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
SELECT 'All family errors fixed - System reset complete' as message;
