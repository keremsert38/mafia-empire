-- =====================================================
-- CHAT SİSTEMİ TAM DÜZELTME
-- Tüm trigger, fonksiyon ve RLS politikalarını sıfırdan ayarla
-- =====================================================

-- 1. TÜM TRIGGER'LARI KALDIR
DROP TRIGGER IF EXISTS trigger_cleanup_old_messages ON chat_messages;

-- 2. TÜM FONKSİYONLARI KALDIR
DROP FUNCTION IF EXISTS cleanup_old_chat_messages() CASCADE;

-- 3. TÜM RLS POLİTİKALARINI KALDIR
DROP POLICY IF EXISTS "allow_all_chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "Allow all for chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "Allow all operations on chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "Allow all operations" ON chat_messages;
DROP POLICY IF EXISTS "Enable all for chat messages" ON chat_messages;
DROP POLICY IF EXISTS "chat_read_all" ON chat_messages;
DROP POLICY IF EXISTS "chat_insert_own" ON chat_messages;
DROP POLICY IF EXISTS "chat_delete_own" ON chat_messages;
DROP POLICY IF EXISTS "Anyone can read chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON chat_messages;

-- 4. RLS'Yİ GEÇİCİ OLARAK DEVRE DIŞI BIRAK VE YENİDEN ETKİNLEŞTİR
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 5. YENİ POLİTİKALAR (SADECE 2 TANE, BASİT)
-- Herkes okuyabilir
CREATE POLICY "chat_select_all" ON chat_messages 
  FOR SELECT 
  USING (true);

-- Herkes yazabilir (authenticated users)
CREATE POLICY "chat_insert_all" ON chat_messages 
  FOR INSERT 
  WITH CHECK (true);

-- 6. İZİNLER
GRANT ALL ON chat_messages TO authenticated;
GRANT ALL ON chat_messages TO anon;

-- =====================================================
-- BİTTİ - Artık chat çalışmalı!
-- =====================================================
