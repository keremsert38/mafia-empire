/*
  # Aile Soldato Kontrol Sistemi - Minimal Versiyon
  
  Sadece gerekli alanları ekler, hiçbir trigger veya constraint değişikliği yapmaz
*/

-- Family_members tablosuna soldato kontrol alanları ekle
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'family_members' AND column_name = 'assigned_soldiers') THEN
        ALTER TABLE family_members ADD COLUMN assigned_soldiers BIGINT DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'family_members' AND column_name = 'can_control_soldiers') THEN
        ALTER TABLE family_members ADD COLUMN can_control_soldiers BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Families tablosuna malikane alanları ekle
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'families' AND column_name = 'owned_territories') THEN
        ALTER TABLE families ADD COLUMN owned_territories TEXT[] DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'families' AND column_name = 'total_assigned_soldiers') THEN
        ALTER TABLE families ADD COLUMN total_assigned_soldiers BIGINT DEFAULT 0;
    END IF;
END $$;

-- Basit soldato atama fonksiyonu
CREATE OR REPLACE FUNCTION assign_soldiers_to_member(
  p_member_id UUID,
  p_soldiers_count BIGINT,
  p_assignment_type TEXT DEFAULT 'defense'
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
  -- Kullanıcı ID'sini al
  v_assigner_id := auth.uid();
  IF v_assigner_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Kullanıcı bulunamadı');
  END IF;

  -- Atama yapacak kişinin aile ID'sini al
  SELECT family_id INTO v_family_id
  FROM family_members
  WHERE player_id = v_assigner_id;

  IF v_family_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Aile üyesi değilsiniz');
  END IF;

  -- Aile hazinesindeki soldato sayısını kontrol et
  SELECT treasury INTO v_family_treasury
  FROM families
  WHERE id = v_family_id;

  IF v_family_treasury < p_soldiers_count THEN
    RETURN json_build_object('success', false, 'message', 'Aile hazinesinde yeterli soldato yok');
  END IF;

  -- Soldato'yu hazineden düş ve üyeye ata
  UPDATE families
  SET treasury = treasury - p_soldiers_count
  WHERE id = v_family_id;

  UPDATE family_members
  SET assigned_soldiers = assigned_soldiers + p_soldiers_count,
      can_control_soldiers = true
  WHERE id = p_member_id AND family_id = v_family_id;

  RETURN json_build_object(
    'success', true, 
    'message', format('%s soldato başarıyla atandı!', p_soldiers_count)
  );
END;
$$;

-- Log
SELECT 'Family soldier control system created successfully - MINIMAL VERSION' as message;
