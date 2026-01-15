-- =====================================================
-- MARKET CONSTRAINT DÜZELTME
-- =====================================================

-- 1. Hatalı constraint'i kaldır (İsmi tam bilmediğimiz için olası isimleri deniyoruz)
ALTER TABLE marketplace_listings DROP CONSTRAINT IF EXISTS marketplace_listings_quantity_check;
ALTER TABLE marketplace_listings DROP CONSTRAINT IF EXISTS marketplace_listings_quantity_chech; -- Kullanıcının hatada gördüğü isim buydu
ALTER TABLE marketplace_listings DROP CONSTRAINT IF EXISTS marketplace_listings_quantity_check1;

-- 2. Yeni constraint ekle (0'a izin ver)
ALTER TABLE marketplace_listings ADD CONSTRAINT marketplace_listings_quantity_check CHECK (quantity >= 0);

-- =====================================================
-- BİTTİ - Artık son ürünü alınca hata vermeyecek!
-- =====================================================
