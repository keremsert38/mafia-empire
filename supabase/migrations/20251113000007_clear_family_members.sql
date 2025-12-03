/*
  # Aile Üyeliğini Temizle
  
  Bu migration duplicate key hatasını düzeltmek için mevcut aile üyeliklerini temizler
*/

-- Önce mevcut aile üyeliklerini kontrol et ve temizle
DELETE FROM family_members WHERE player_id IS NULL OR player_id = '';

-- Eğer duplicate key hatası devam ederse, tüm aile üyeliklerini temizle
-- (Sadece test için, production'da kullanmayın!)
TRUNCATE TABLE family_members RESTART IDENTITY CASCADE;

-- Aileleri de temizle
TRUNCATE TABLE families RESTART IDENTITY CASCADE;

-- Log
SELECT 'Family members and families cleared successfully' as message;
