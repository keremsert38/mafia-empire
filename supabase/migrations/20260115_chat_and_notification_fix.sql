-- =====================================================
-- CHAT VE BİLDİRİM SİSTEMİ DÜZELTME
-- =====================================================

-- 1. CHAT_MESSAGES TABLOSU İÇİN INSERT POLİTİKASI
-- Eğer tablo varsa ve RLS aktifse, insert izni ekle

-- Önce mevcut politikayı kaldır (varsa)
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON chat_messages;
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON chat_messages;

-- Yeni INSERT politikası oluştur
CREATE POLICY "Users can insert own messages"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- SELECT politikası da olmalı (eğer yoksa)
DROP POLICY IF EXISTS "Anyone can view chat messages" ON chat_messages;
CREATE POLICY "Anyone can view chat messages"
ON chat_messages FOR SELECT
TO authenticated
USING (true);

-- 2. NOTIFICATIONS TABLOSU KONTROLÜ
-- Tablo yoksa oluştur
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    type TEXT DEFAULT 'system',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Eğer tablo zaten varsa ve type kolonu yoksa, ekle
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'system';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

-- INSERT politikası (service role veya fonksiyonlar için)
DROP POLICY IF EXISTS "Service can insert notifications" ON notifications;
CREATE POLICY "Service can insert notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. ATTACK_PLAYER_V2 FONKSİYONUNU GÜNCELLE (Bildirim Eklemeli)
-- Önce eski fonksiyonu sil
DROP FUNCTION IF EXISTS calculate_weapon_loss(INTEGER, INTEGER, INTEGER);

-- calculate_weapon_loss fonksiyonunu oluştur
CREATE OR REPLACE FUNCTION calculate_weapon_loss(
    p_dead_soldiers INTEGER,
    p_current_baretta INTEGER,
    p_current_ak47 INTEGER
)
RETURNS TABLE(p_lost_baretta INTEGER, p_lost_ak47 INTEGER) AS $$
DECLARE
    v_weapons_to_lose INTEGER;
    v_lost_baretta INTEGER := 0;
    v_lost_ak47 INTEGER := 0;
BEGIN
    v_weapons_to_lose := p_dead_soldiers;
    
    -- Önce ucuz silahları kaybet (Baretta)
    v_lost_baretta := LEAST(v_weapons_to_lose, p_current_baretta);
    v_weapons_to_lose := v_weapons_to_lose - v_lost_baretta;
    
    -- Kalan kayıp için pahalı silahları kaybet (AK-47)
    v_lost_ak47 := LEAST(v_weapons_to_lose, p_current_ak47);
    
    RETURN QUERY SELECT v_lost_baretta, v_lost_ak47;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- calculate_attack_power_v2 fonksiyonu
CREATE OR REPLACE FUNCTION calculate_attack_power_v2(
    p_soldiers INTEGER,
    p_baretta_count INTEGER,
    p_ak47_count INTEGER,
    p_base_power INTEGER DEFAULT 0
)
RETURNS INTEGER AS $$
BEGIN
    RETURN (p_soldiers * 5) + (p_baretta_count * 3) + (p_ak47_count * 10) + p_base_power;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Ana saldırı fonksiyonu
CREATE OR REPLACE FUNCTION attack_player_v2(
    p_target_id UUID,
    p_soldiers INTEGER,
    p_baretta_count INTEGER,
    p_ak47_count INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_attacker_id UUID := auth.uid();
    v_attacker_stats RECORD;
    v_target_stats RECORD;
    v_attacker_power INTEGER;
    v_defender_power INTEGER;
    v_def_effective_ak47 INTEGER;
    v_def_remaining_soldiers INTEGER;
    v_def_effective_baretta INTEGER;
    v_win_chance FLOAT;
    v_random_roll FLOAT;
    v_is_win BOOLEAN;
    v_loot_cash INTEGER := 0;
    v_xp_gain INTEGER;
    v_attacker_loss_ratio FLOAT;
    v_defender_loss_ratio FLOAT;
    v_attacker_dead INTEGER;
    v_defender_dead INTEGER;
    v_att_lost_baretta INTEGER := 0;
    v_att_lost_ak47 INTEGER := 0;
    v_def_lost_baretta INTEGER := 0;
    v_def_lost_ak47 INTEGER := 0;
    v_message TEXT;
    v_attacker_name TEXT;
    v_notif_title TEXT;
    v_notif_body TEXT;
BEGIN
    -- Saldıran bilgileri
    SELECT * INTO v_attacker_stats FROM player_stats WHERE id = v_attacker_id;
    v_attacker_name := COALESCE(v_attacker_stats.username, 'Bilinmeyen');
    
    IF v_attacker_stats.soldiers < p_soldiers THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Yeterli askeriniz yok!');
    END IF;
    
    IF v_attacker_stats.energy < 10 THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Yeterli enerjiniz yok (Gerekli: 10)');
    END IF;
    
    IF v_attacker_stats.baretta < p_baretta_count OR v_attacker_stats.ak47 < p_ak47_count THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Envanterinizde bu kadar silah yok!');
    END IF;

    -- Savunan bilgileri
    SELECT * INTO v_target_stats FROM player_stats WHERE id = p_target_id;
    IF v_target_stats IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Hedef oyuncu bulunamadı!');
    END IF;

    -- Güç hesaplama
    v_attacker_power := calculate_attack_power_v2(p_soldiers, p_baretta_count, p_ak47_count, v_attacker_stats.strength);
    
    v_def_effective_ak47 := LEAST(v_target_stats.soldiers, COALESCE(v_target_stats.ak47, 0));
    v_def_remaining_soldiers := v_target_stats.soldiers - v_def_effective_ak47;
    v_def_effective_baretta := LEAST(v_def_remaining_soldiers, COALESCE(v_target_stats.baretta, 0));
    
    v_defender_power := (v_target_stats.soldiers * 5) + 
                        (v_def_effective_ak47 * 10) + 
                        (v_def_effective_baretta * 3) + 
                        (COALESCE(v_target_stats.defense, 0) * 2);

    -- Savaş sonucu
    IF v_attacker_power = 0 AND v_defender_power = 0 THEN
        v_win_chance := 0.5;
    ELSIF v_attacker_power = 0 THEN
        v_win_chance := 0.0;
    ELSE
        v_win_chance := v_attacker_power::FLOAT / (v_attacker_power + v_defender_power)::FLOAT;
    END IF;
    
    v_random_roll := random();
    v_is_win := v_random_roll < v_win_chance;

    -- Kayıp hesaplama
    IF v_is_win THEN
        v_attacker_loss_ratio := 0.05 + (random() * 0.05); 
        v_defender_loss_ratio := 0.15 + (random() * 0.10);
        v_loot_cash := floor(v_target_stats.cash * (0.1 + random() * 0.2));
        v_xp_gain := 50;
        v_message := 'KAZANDINIZ! Düşmanı bozguna uğrattınız.';
        v_notif_title := '🚨 SALDIRIYA UĞRADINIZ!';
        v_notif_body := 'Düşman ' || v_attacker_name || ' mekanınızı bastı ve KAZANDI! $' || v_loot_cash || ' paranızı çaldı.';
        
        UPDATE player_stats SET battles_won = battles_won + 1 WHERE id = v_attacker_id;
        UPDATE player_stats SET battles_lost = battles_lost + 1 WHERE id = p_target_id;
    ELSE
        v_attacker_loss_ratio := 0.15 + (random() * 0.10);
        v_defender_loss_ratio := 0.05 + (random() * 0.05);
        v_xp_gain := 10;
        v_message := 'KAYBETTİNİZ! Savunma hattını aşamadınız.';
        v_notif_title := '🛡️ SALDIRI PÜSKÜRTÜLDÜ!';
        v_notif_body := 'Düşman ' || v_attacker_name || ' saldırdı ama savunmanız geçit vermedi!';
        
        UPDATE player_stats SET battles_lost = battles_lost + 1 WHERE id = v_attacker_id;
        UPDATE player_stats SET battles_won = battles_won + 1 WHERE id = p_target_id;
    END IF;
    
    v_attacker_dead := floor(p_soldiers * v_attacker_loss_ratio);
    v_defender_dead := floor(v_target_stats.soldiers * v_defender_loss_ratio);
    
    -- Silah kayıpları
    SELECT p_lost_baretta, p_lost_ak47 INTO v_att_lost_baretta, v_att_lost_ak47 
    FROM calculate_weapon_loss(v_attacker_dead, COALESCE(v_attacker_stats.baretta, 0), COALESCE(v_attacker_stats.ak47, 0));
    
    SELECT p_lost_baretta, p_lost_ak47 INTO v_def_lost_baretta, v_def_lost_ak47 
    FROM calculate_weapon_loss(v_defender_dead, COALESCE(v_target_stats.baretta, 0), COALESCE(v_target_stats.ak47, 0));

    -- Veritabanı güncellemeleri
    UPDATE player_stats 
    SET 
        energy = energy - 10,
        cash = cash + v_loot_cash,
        experience = experience + v_xp_gain,
        soldiers = GREATEST(0, soldiers - v_attacker_dead),
        baretta = GREATEST(0, COALESCE(baretta, 0) - v_att_lost_baretta),
        ak47 = GREATEST(0, COALESCE(ak47, 0) - v_att_lost_ak47),
        last_active = now()
    WHERE id = v_attacker_id;
    
    UPDATE player_stats 
    SET 
        cash = GREATEST(0, cash - v_loot_cash),
        soldiers = GREATEST(0, soldiers - v_defender_dead),
        baretta = GREATEST(0, COALESCE(baretta, 0) - v_def_lost_baretta),
        ak47 = GREATEST(0, COALESCE(ak47, 0) - v_def_lost_ak47)
    WHERE id = p_target_id;

    -- BİLDİRİM KAYDI OLUŞTUR
    INSERT INTO notifications (user_id, title, body, type, data)
    VALUES (
        p_target_id, 
        v_notif_title, 
        v_notif_body, 
        'attack',
        jsonb_build_object('attacker_id', v_attacker_id, 'loot', v_loot_cash, 'dead_soldiers', v_defender_dead)
    );

    v_message := v_message || E'\n\n💥 Kayıplarınız:' ||
                 E'\n💀 Asker: -'|| v_attacker_dead ||
                 E'\n🔫 Baretta: -'|| v_att_lost_baretta ||
                 E'\n🔫 AK-47: -'|| v_att_lost_ak47;
                 
    IF v_loot_cash > 0 THEN
        v_message := v_message || E'\n💰 Gasp: $' || v_loot_cash;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE, 
        'is_win', v_is_win,
        'message', v_message,
        'attacker_power', v_attacker_power,
        'defender_power', v_defender_power,
        'loot', v_loot_cash
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonksiyona execute izni ver
GRANT EXECUTE ON FUNCTION attack_player_v2(UUID, INTEGER, INTEGER, INTEGER) TO authenticated;
