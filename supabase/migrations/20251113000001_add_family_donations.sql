-- Aile bağış sistemi için tablo oluştur
CREATE TABLE IF NOT EXISTS family_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  donor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  donor_name TEXT NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_donation CHECK (amount > 0)
);

-- Index'ler ekle
CREATE INDEX IF NOT EXISTS idx_family_donations_family_id ON family_donations(family_id);
CREATE INDEX IF NOT EXISTS idx_family_donations_donor_id ON family_donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_family_donations_created_at ON family_donations(created_at DESC);

-- RLS (Row Level Security) politikaları
ALTER TABLE family_donations ENABLE ROW LEVEL SECURITY;

-- Herkes kendi ailesinin bağışlarını görebilir
CREATE POLICY "Users can view their family donations"
  ON family_donations
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id 
      FROM family_members 
      WHERE player_id = auth.uid()
    )
  );

-- Aile üyeleri bağış yapabilir
CREATE POLICY "Family members can donate"
  ON family_donations
  FOR INSERT
  WITH CHECK (
    donor_id = auth.uid() AND
    family_id IN (
      SELECT family_id 
      FROM family_members 
      WHERE player_id = auth.uid()
    )
  );

-- Families tablosuna treasury (hazine) kolonu ekle
ALTER TABLE families ADD COLUMN IF NOT EXISTS treasury BIGINT DEFAULT 0 CHECK (treasury >= 0);

-- Bağış yapma fonksiyonu
CREATE OR REPLACE FUNCTION donate_to_family(
  p_family_id UUID,
  p_amount BIGINT,
  p_message TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_donor_id UUID;
  v_donor_name TEXT;
  v_current_soldato BIGINT;
  v_family_exists BOOLEAN;
  v_is_member BOOLEAN;
BEGIN
  -- Kullanıcı ID'sini al
  v_donor_id := auth.uid();
  IF v_donor_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Kullanıcı bulunamadı');
  END IF;

  -- Kullanıcı adını al
  SELECT username INTO v_donor_name
  FROM player_stats
  WHERE id = v_donor_id;

  -- Ailenin varlığını kontrol et
  SELECT EXISTS(SELECT 1 FROM families WHERE id = p_family_id) INTO v_family_exists;
  IF NOT v_family_exists THEN
    RETURN json_build_object('success', false, 'message', 'Aile bulunamadı');
  END IF;

  -- Kullanıcının aile üyesi olup olmadığını kontrol et
  SELECT EXISTS(
    SELECT 1 FROM family_members 
    WHERE player_id = v_donor_id AND family_id = p_family_id
  ) INTO v_is_member;
  
  IF NOT v_is_member THEN
    RETURN json_build_object('success', false, 'message', 'Bu aileye üye değilsiniz');
  END IF;

  -- Kullanıcının soldato sayısını kontrol et
  SELECT soldiers INTO v_current_soldato
  FROM player_stats
  WHERE id = v_donor_id;

  IF v_current_soldato < p_amount THEN
    RETURN json_build_object('success', false, 'message', 'Yetersiz soldato!');
  END IF;

  -- Soldato'yu kullanıcıdan düş
  UPDATE player_stats
  SET soldiers = soldiers - p_amount
  WHERE id = v_donor_id;

  -- user_soldiers tablosunu da güncelle
  UPDATE user_soldiers
  SET soldiers = soldiers - p_amount
  WHERE user_id = v_donor_id;

  -- Aile hazinesine ekle
  UPDATE families
  SET treasury = treasury + p_amount
  WHERE id = p_family_id;

  -- Bağış kaydını oluştur
  INSERT INTO family_donations (family_id, donor_id, donor_name, amount, message)
  VALUES (p_family_id, v_donor_id, v_donor_name, p_amount, p_message);

  -- Üyenin contribution'ını artır
  UPDATE family_members
  SET contribution = contribution + p_amount
  WHERE player_id = v_donor_id AND family_id = p_family_id;

  RETURN json_build_object(
    'success', true, 
    'message', format('%s soldato başarıyla bağışlandı!', p_amount)
  );
END;
$$;
