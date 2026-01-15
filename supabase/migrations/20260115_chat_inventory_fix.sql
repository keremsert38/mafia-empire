-- =====================================================
-- CHAT VE ENVANTER KESİN DÜZELTME
-- =====================================================

-- =====================================================
-- 1. CHAT MESAJ SİSTEMİ - TÜM KISITLAMALARI KALDIR
-- =====================================================

-- Trigger'ı sil
DROP TRIGGER IF EXISTS trigger_cleanup_old_messages ON chat_messages;
DROP FUNCTION IF EXISTS cleanup_old_chat_messages() CASCADE;

-- RLS politikalarını yeniden oluştur (tüm işlemlere izin ver)
DROP POLICY IF EXISTS "allow_all_chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "Allow all for chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "Allow all operations on chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "Allow all operations" ON chat_messages;
DROP POLICY IF EXISTS "Enable all for chat messages" ON chat_messages;
DROP POLICY IF EXISTS "chat_read_all" ON chat_messages;
DROP POLICY IF EXISTS "chat_insert_own" ON chat_messages;
DROP POLICY IF EXISTS "chat_delete_own" ON chat_messages;

-- Yeni politika: Herkes okuyabilir ve yazabilir
CREATE POLICY "chat_read_all" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "chat_insert_own" ON chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "chat_delete_own" ON chat_messages FOR DELETE USING (auth.uid() = user_id);

-- İzinleri ver
GRANT ALL ON chat_messages TO authenticated;

-- =====================================================
-- 2. PLAYER_STATS'A ÜRÜN KOLONLARI EKLE
-- =====================================================

-- Ürün kolonları ekle (yoksa)
DO $$
BEGIN
    -- Silah kolonları
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='player_stats' AND column_name='baretta') THEN
        ALTER TABLE player_stats ADD COLUMN baretta INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='player_stats' AND column_name='ak47') THEN
        ALTER TABLE player_stats ADD COLUMN ak47 INTEGER DEFAULT 0;
    END IF;
    
    -- Hammadde kolonları
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='player_stats' AND column_name='demir_cevheri') THEN
        ALTER TABLE player_stats ADD COLUMN demir_cevheri INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='player_stats' AND column_name='kereste') THEN
        ALTER TABLE player_stats ADD COLUMN kereste INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='player_stats' AND column_name='barut') THEN
        ALTER TABLE player_stats ADD COLUMN barut INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='player_stats' AND column_name='demir_kulce') THEN
        ALTER TABLE player_stats ADD COLUMN demir_kulce INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='player_stats' AND column_name='namlu') THEN
        ALTER TABLE player_stats ADD COLUMN namlu INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='player_stats' AND column_name='kabze') THEN
        ALTER TABLE player_stats ADD COLUMN kabze INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='player_stats' AND column_name='tohum') THEN
        ALTER TABLE player_stats ADD COLUMN tohum INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='player_stats' AND column_name='ilac') THEN
        ALTER TABLE player_stats ADD COLUMN ilac INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='player_stats' AND column_name='saglik_kiti') THEN
        ALTER TABLE player_stats ADD COLUMN saglik_kiti INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='player_stats' AND column_name='yemek') THEN
        ALTER TABLE player_stats ADD COLUMN yemek INTEGER DEFAULT 0;
    END IF;
END $$;

-- =====================================================
-- 3. ÜRETİM TOPLAMA FONKSİYONU (PLAYER_STATS'A YAZSIN)
-- =====================================================

DROP FUNCTION IF EXISTS collect_production(UUID);
DROP FUNCTION IF EXISTS collect_production(TEXT);

CREATE OR REPLACE FUNCTION collect_production(p_queue_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_queue RECORD;
    v_recipe RECORD;
    v_resource RECORD;
    v_output_qty INTEGER;
    v_column_name TEXT;
BEGIN
    -- Kuyruktaki üretimi bul
    SELECT * INTO v_queue 
    FROM production_queue 
    WHERE id = p_queue_id 
      AND player_id = v_user_id 
      AND is_collected = FALSE;
    
    IF v_queue IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Üretim bulunamadı veya zaten toplandı');
    END IF;
    
    -- Tamamlanmış mı kontrol et
    IF v_queue.completes_at > NOW() THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Üretim henüz tamamlanmadı');
    END IF;
    
    -- Tarif bilgisini al
    SELECT * INTO v_recipe FROM recipes WHERE id = v_queue.recipe_id;
    
    IF v_recipe IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Tarif bulunamadı');
    END IF;
    
    -- Kaynak bilgisini al
    SELECT * INTO v_resource FROM resources WHERE id = v_recipe.output_resource_id;
    
    v_output_qty := COALESCE(v_recipe.output_quantity, 1) * v_queue.quantity;
    
    -- Kaynak adına göre kolon belirle
    v_column_name := LOWER(REPLACE(REPLACE(REPLACE(v_resource.name, ' ', '_'), 'ı', 'i'), 'ğ', 'g'));
    v_column_name := REPLACE(REPLACE(REPLACE(v_column_name, 'ü', 'u'), 'ş', 's'), 'ö', 'o');
    v_column_name := REPLACE(REPLACE(v_column_name, 'ç', 'c'), '-', '_');
    
    -- Player_stats'a ekle (dinamik SQL)
    BEGIN
        EXECUTE format('UPDATE player_stats SET %I = COALESCE(%I, 0) + $1 WHERE id = $2', v_column_name, v_column_name)
        USING v_output_qty, v_user_id;
    EXCEPTION WHEN undefined_column THEN
        -- Kolon yoksa player_inventory'ye ekle
        INSERT INTO player_inventory (user_id, resource_id, quantity)
        VALUES (v_user_id, v_recipe.output_resource_id, v_output_qty)
        ON CONFLICT (user_id, resource_id) 
        DO UPDATE SET quantity = player_inventory.quantity + v_output_qty;
    END;
    
    -- Üretimi toplandı olarak işaretle
    UPDATE production_queue SET is_collected = TRUE WHERE id = p_queue_id;
    
    RETURN jsonb_build_object(
        'success', TRUE, 
        'message', v_output_qty || ' adet ' || v_resource.name || ' toplandı!'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION collect_production(UUID) TO authenticated;

-- =====================================================
-- 4. OTOMATİK TOPLAMA FONKSİYONU
-- =====================================================

DROP FUNCTION IF EXISTS check_and_collect_productions();

CREATE OR REPLACE FUNCTION check_and_collect_productions()
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_queue RECORD;
    v_total INTEGER := 0;
BEGIN
    FOR v_queue IN 
        SELECT id FROM production_queue 
        WHERE player_id = v_user_id 
          AND is_collected = FALSE 
          AND completes_at <= NOW()
    LOOP
        PERFORM collect_production(v_queue.id);
        v_total := v_total + 1;
    END LOOP;
    
    RETURN jsonb_build_object('success', TRUE, 'collected_count', v_total);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_and_collect_productions() TO authenticated;

-- =====================================================
-- 5. PLAYER_INVENTORY TABLOSU (YEDEK)
-- =====================================================

CREATE TABLE IF NOT EXISTS player_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0,
    UNIQUE(user_id, resource_id)
);

ALTER TABLE player_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inventory_user" ON player_inventory;
CREATE POLICY "inventory_user" ON player_inventory FOR ALL USING (auth.uid() = user_id);

GRANT ALL ON player_inventory TO authenticated;

-- =====================================================
-- BİTTİ!
-- =====================================================
