/*
  # Para Hazinesi Ekleme Migration
  
  Bu migration sadece cash_treasury alanını ekler
*/

-- Families tablosuna cash_treasury alanını ekle
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'families' AND column_name = 'cash_treasury') THEN
        ALTER TABLE families ADD COLUMN cash_treasury BIGINT DEFAULT 0;
    END IF;
END $$;

-- Para bağış tablosu oluştur
CREATE TABLE IF NOT EXISTS family_cash_donations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  donor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  donor_name TEXT NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS politikaları
ALTER TABLE family_cash_donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view family cash donations" ON family_cash_donations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_cash_donations.family_id 
      AND family_members.player_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert cash donations to their family" ON family_cash_donations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_cash_donations.family_id 
      AND family_members.player_id = auth.uid()
    )
  );
