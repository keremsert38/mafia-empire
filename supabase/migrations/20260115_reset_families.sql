-- =====================================================
-- AİLE SİSTEMİ SIFIRLAMA (HARD RESET) - SON VERSİYON
-- =====================================================

-- 1. Önce oyuncuların aile bağlarını temizle (Varsayılan hale getir)
UPDATE player_stats
SET family_id = NULL;

-- 2. "family_members" tablosunu temizle
-- Aile üyeliği rolleri ve bağları burada tutuluyor.
TRUNCATE TABLE family_members CASCADE;

-- 3. "families" tablosundaki tüm kayıtları sil
DELETE FROM families;

-- 4. Not: family_invites tablosu olmadığı için o adımı atladık.
