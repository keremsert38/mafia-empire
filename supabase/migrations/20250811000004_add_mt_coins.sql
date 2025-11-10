/*
  # MT Coins Sistemi
  
  1. Yeni Alan
    - player_stats tablosuna mt_coins alanı ekle
  
  2. Varsayılan Değer
    - Yeni kullanıcılar 0 MT Coin ile başlar
*/

-- player_stats tablosuna mt_coins alanı ekle
ALTER TABLE player_stats
ADD COLUMN IF NOT EXISTS mt_coins INTEGER DEFAULT 0 NOT NULL;

-- Mevcut kullanıcılar için varsayılan değer ata
UPDATE player_stats
SET mt_coins = 0
WHERE mt_coins IS NULL;

-- Log
SELECT 'MT Coins field added successfully! ✅' as message;
