-- Yeni oyuncular için 150 MT Coin başlangıç bonusu
-- Bu değişiklik player_stats tablosunun varsayılan değerini günceller

-- Mevcut varsayılan değeri 0'dan 150'ye güncelle
ALTER TABLE player_stats 
ALTER COLUMN mt_coins SET DEFAULT 150;

-- VEYA: Eğer mt_coins sütunu yoksa ekle
-- ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS mt_coins INTEGER DEFAULT 150;

-- Açıklama:
-- Bu SQL kodu çalıştırıldığında, bundan sonra kayıt olan 
-- tüm yeni oyuncular otomatik olarak 150 MT Coin ile başlayacak.
