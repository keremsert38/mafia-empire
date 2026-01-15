-- =====================================================
-- CHAT VE MARKET TAM DÜZELTME
-- RLS'yi tamamen sıfırla ve yeniden yapılandır
-- =====================================================

-- =====================================================
-- 1. CHAT_MESSAGES - RLS TAMAMEN SIFIRLA
-- =====================================================

-- RLS'yi kapat
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;

-- Tüm politikaları sil (isimlerini bilmeden)
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'chat_messages'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON chat_messages', pol.policyname);
    END LOOP;
END $$;

-- RLS'yi aç
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Basit politikalar oluştur
CREATE POLICY "chat_allow_select" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "chat_allow_insert" ON chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "chat_allow_update" ON chat_messages FOR UPDATE USING (true);
CREATE POLICY "chat_allow_delete" ON chat_messages FOR DELETE USING (true);

-- İzinler
GRANT ALL ON chat_messages TO authenticated;
GRANT SELECT ON chat_messages TO anon;

-- =====================================================
-- 2. MARKETPLACE_LISTINGS - DİĞER HESAPLAR SATIN ALABİLSİN
-- =====================================================

-- RLS'yi kapat
ALTER TABLE marketplace_listings DISABLE ROW LEVEL SECURITY;

-- Tüm politikaları sil
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'marketplace_listings'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON marketplace_listings', pol.policyname);
    END LOOP;
END $$;

-- RLS'yi aç
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

-- Basit politikalar - herkes her şeyi yapabilsin
CREATE POLICY "market_allow_select" ON marketplace_listings FOR SELECT USING (true);
CREATE POLICY "market_allow_insert" ON marketplace_listings FOR INSERT WITH CHECK (true);
CREATE POLICY "market_allow_update" ON marketplace_listings FOR UPDATE USING (true);
CREATE POLICY "market_allow_delete" ON marketplace_listings FOR DELETE USING (true);

-- İzinler
GRANT ALL ON marketplace_listings TO authenticated;

-- =====================================================
-- 3. RESOURCES TABLOSU - HERKES OKUYABİLSİN
-- =====================================================

ALTER TABLE resources DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'resources'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON resources', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resources_allow_select" ON resources FOR SELECT USING (true);

GRANT SELECT ON resources TO authenticated;
GRANT SELECT ON resources TO anon;

-- =====================================================
-- 4. PLAYER_STATS - HERKES OKUYABİLSİN, KENDİNİ GÜNCELLEYEBİLSİN
-- =====================================================

-- Politikaları kontrol et ve eksikleri ekle
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'player_stats' AND policyname = 'ps_select_all') THEN
        CREATE POLICY "ps_select_all" ON player_stats FOR SELECT USING (true);
    END IF;
END $$;

GRANT ALL ON player_stats TO authenticated;

-- =====================================================
-- BİTTİ!
-- =====================================================
