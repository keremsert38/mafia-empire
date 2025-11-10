/*
  # Para sistemini düzelt ve sıralama tablosunu güncelle

  1. Değişiklikler
    - Default cash değerini 0 yap
    - Mevcut kullanıcıların parasını sıfırla
    - Leaderboard için gerekli indexleri ekle
    
  2. Güvenlik
    - Mevcut RLS politikaları korunur
*/

-- Default cash değerini 0 yap
ALTER TABLE player_stats ALTER COLUMN cash SET DEFAULT 0;

-- Mevcut kullanıcıların parasını sıfırla (opsiyonel - sadece test için)
UPDATE player_stats SET cash = 0 WHERE cash = 10000;

-- Leaderboard performansı için indexler
CREATE INDEX IF NOT EXISTS idx_player_stats_level ON player_stats(level DESC);
CREATE INDEX IF NOT EXISTS idx_player_stats_cash ON player_stats(cash DESC);
CREATE INDEX IF NOT EXISTS idx_player_stats_respect ON player_stats(respect DESC);
CREATE INDEX IF NOT EXISTS idx_player_stats_territories ON player_stats(territories DESC);

-- Updated_at trigger'ını güncelle
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    NEW.last_active = now();
    RETURN NEW;
END;
$$ language 'plpgsql';