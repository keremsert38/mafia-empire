/*
  # Malikane Saldırı Sistemi
  
  Bu migration malikane saldırı sistemini ekler:
  - Aile vs aile malikane savaşları
  - Saldırı geçmişi
  - Malikane yıkım sistemi
  - Savunma hesaplamaları
*/

-- Malikane saldırı geçmişi tablosu
CREATE TABLE IF NOT EXISTS mansion_attacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attacker_family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  attacker_family_name TEXT NOT NULL,
  defender_family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  defender_family_name TEXT NOT NULL,
  attacker_soldiers BIGINT NOT NULL,
  defender_soldiers BIGINT NOT NULL,
  attack_success BOOLEAN NOT NULL,
  mansion_destroyed BOOLEAN DEFAULT FALSE,
  mansion_level_before INTEGER,
  mansion_level_after INTEGER,
  loot_amount BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS politikaları
ALTER TABLE mansion_attacks ENABLE ROW LEVEL SECURITY;

-- Aile üyeleri kendi ailelerinin saldırı geçmişini görebilir
DROP POLICY IF EXISTS "Family members can view attack history" ON mansion_attacks;
CREATE POLICY "Family members can view attack history" ON mansion_attacks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = mansion_attacks.attacker_family_id 
      AND family_members.player_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = mansion_attacks.defender_family_id 
      AND family_members.player_id = auth.uid()
    )
  );

-- Sadece lider saldırı kaydı ekleyebilir
DROP POLICY IF EXISTS "Leaders can insert attack records" ON mansion_attacks;
CREATE POLICY "Leaders can insert attack records" ON mansion_attacks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = mansion_attacks.attacker_family_id 
      AND family_members.player_id = auth.uid()
      AND family_members.role = 'capo'
    )
  );

-- Malikane saldırı fonksiyonu
CREATE OR REPLACE FUNCTION attack_family_mansion(
  p_target_family_id UUID,
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
  v_attacker_family_name TEXT;
  v_attacker_treasury BIGINT;
  v_defender_family RECORD;
  v_attack_power BIGINT;
  v_defense_power BIGINT;
  v_attack_success BOOLEAN;
  v_mansion_destroyed BOOLEAN := FALSE;
  v_loot_amount BIGINT := 0;
  v_mansion_level_before INTEGER;
  v_mansion_level_after INTEGER;
BEGIN
  v_attacker_id := auth.uid();
  IF v_attacker_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Kullanıcı bulunamadı');
  END IF;

  -- Saldıran aile bilgilerini al
  SELECT fm.family_id, fm.role, f.name, f.treasury
  INTO v_attacker_family_id, v_attacker_role, v_attacker_family_name, v_attacker_treasury
  FROM family_members fm
  JOIN families f ON f.id = fm.family_id
  WHERE fm.player_id = v_attacker_id;

  IF v_attacker_family_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Aile bulunamadı');
  END IF;

  IF v_attacker_role != 'capo' THEN
    RETURN json_build_object('success', false, 'message', 'Sadece lider (capo) saldırı emri verebilir');
  END IF;

  -- Soldato kontrolü
  IF v_attacker_treasury < p_attacking_soldiers THEN
    RETURN json_build_object('success', false, 'message', 'Yetersiz soldato! Mevcut: ' || v_attacker_treasury);
  END IF;

  -- Hedef aile bilgilerini al
  SELECT f.id, f.name, f.mansion_level, f.mansion_defense, f.cash_treasury
  INTO v_defender_family
  FROM families f
  WHERE f.id = p_target_family_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Hedef aile bulunamadı');
  END IF;

  -- Kendi ailesine saldırı kontrolü
  IF v_attacker_family_id = p_target_family_id THEN
    RETURN json_build_object('success', false, 'message', 'Kendi ailenizin malikanesine saldıramazsınız');
  END IF;

  -- Malikane kontrolü
  IF v_defender_family.mansion_level = 0 THEN
    RETURN json_build_object('success', false, 'message', 'Hedef ailenin malikanesi bulunmuyor');
  END IF;

  -- Saldırı gücü hesaplama
  v_attack_power := p_attacking_soldiers;
  v_defense_power := COALESCE(v_defender_family.mansion_defense, 0);

  -- Saldırı başarı kontrolü (saldırı gücü savunmadan %20 fazla olmalı)
  v_attack_success := v_attack_power > (v_defense_power * 1.2);

  v_mansion_level_before := v_defender_family.mansion_level;
  v_mansion_level_after := v_mansion_level_before;

  IF v_attack_success THEN
    -- Başarılı saldırı
    v_mansion_destroyed := TRUE;
    v_mansion_level_after := GREATEST(0, v_mansion_level_before - 1);
    
    -- Ganimet hesaplama (hazinedeki paranın %30'u)
    v_loot_amount := FLOOR(COALESCE(v_defender_family.cash_treasury, 0) * 0.3);

    -- Hedef ailenin malikanesini güncelle
    UPDATE families 
    SET 
      mansion_level = v_mansion_level_after,
      mansion_defense = CASE 
        WHEN v_mansion_level_after = 0 THEN 0 
        ELSE GREATEST(0, mansion_defense - (p_attacking_soldiers - v_defense_power))
      END,
      cash_treasury = GREATEST(0, cash_treasury - v_loot_amount)
    WHERE id = p_target_family_id;

    -- Saldıran aileye ganimet ekle
    UPDATE families 
    SET 
      treasury = treasury - p_attacking_soldiers + FLOOR(p_attacking_soldiers * 0.7), -- %30 kayıp
      cash_treasury = cash_treasury + v_loot_amount
    WHERE id = v_attacker_family_id;

  ELSE
    -- Başarısız saldırı
    -- Saldıran aile soldato kaybeder
    UPDATE families 
    SET treasury = treasury - p_attacking_soldiers
    WHERE id = v_attacker_family_id;

    -- Savunan aile az soldato kaybeder
    UPDATE families 
    SET mansion_defense = GREATEST(0, mansion_defense - FLOOR(p_attacking_soldiers * 0.3))
    WHERE id = p_target_family_id;
  END IF;

  -- Saldırı geçmişine kaydet
  INSERT INTO mansion_attacks (
    attacker_family_id, attacker_family_name,
    defender_family_id, defender_family_name,
    attacker_soldiers, defender_soldiers,
    attack_success, mansion_destroyed,
    mansion_level_before, mansion_level_after,
    loot_amount
  ) VALUES (
    v_attacker_family_id, v_attacker_family_name,
    p_target_family_id, v_defender_family.name,
    p_attacking_soldiers, v_defense_power,
    v_attack_success, v_mansion_destroyed,
    v_mansion_level_before, v_mansion_level_after,
    v_loot_amount
  );

  -- Sonuç döndür
  IF v_attack_success THEN
    RETURN json_build_object(
      'success', true,
      'message', format('Saldırı başarılı! %s ailesinin malikanesi %s seviyesinden %s seviyesine düştü!', 
        v_defender_family.name, v_mansion_level_before, v_mansion_level_after),
      'mansion_destroyed', v_mansion_destroyed,
      'loot_amount', v_loot_amount,
      'soldiers_lost', FLOOR(p_attacking_soldiers * 0.3)
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'message', format('Saldırı başarısız! %s soldato kaybettiniz.', p_attacking_soldiers),
      'soldiers_lost', p_attacking_soldiers
    );
  END IF;
END;
$$;

-- Saldırılabilir aileleri listele fonksiyonu
CREATE OR REPLACE FUNCTION get_attackable_families()
RETURNS TABLE (
  family_id UUID,
  family_name TEXT,
  mansion_level INTEGER,
  mansion_defense BIGINT,
  member_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user_family_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Kullanıcının aile ID'sini al
  SELECT fm.family_id INTO v_user_family_id
  FROM family_members fm
  WHERE fm.player_id = v_user_id;

  -- Kendi ailesi hariç, malikanesi olan aileleri döndür
  RETURN QUERY
  SELECT 
    f.id,
    f.name,
    f.mansion_level,
    f.mansion_defense,
    f.member_count
  FROM families f
  WHERE f.id != v_user_family_id 
    AND f.mansion_level > 0
  ORDER BY f.mansion_level DESC, f.member_count DESC;
END;
$$;
