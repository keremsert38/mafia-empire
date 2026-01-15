-- =====================================================
-- CHAT LİMİT KALDIRMA
-- =====================================================

-- Chat mesaj limitini kaldır (trigger'ı sil)
DROP TRIGGER IF EXISTS trigger_cleanup_old_messages ON chat_messages;
DROP FUNCTION IF EXISTS cleanup_old_chat_messages();

-- Artık sınırsız mesaj gönderilebilir!
