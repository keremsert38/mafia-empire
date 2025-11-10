/*
  # Başlangıç parasını 0 yap

  1. Değişiklikler
    - player_stats tablosundaki default cash değerini 10000'den 0'a düşür
    - Mevcut kullanıcıların parasını sıfırla (opsiyonel)

  2. Güvenlik
    - Sadece default değeri değiştir
*/

-- Default cash değerini 0 yap
ALTER TABLE player_stats ALTER COLUMN cash SET DEFAULT 0;

-- Mevcut kullanıcıların parasını sıfırlamak isterseniz (opsiyonel):
-- UPDATE player_stats SET cash = 0;