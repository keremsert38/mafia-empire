-- =====================================================
-- BİLDİRİM SİSTEMİ KURULUMU ve SALDIRI ENTEGRASYONU
-- =====================================================

-- 1. Bildirimler Tablosunu Oluştur
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    type TEXT DEFAULT 'system', -- 'attack', 'info', 'market' vb.
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- İndeksler (Sorgu performansı için)
    CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- RLS (Row Level Security) - Kullanıcılar sadece kendi bildirimlerini görebilsin
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" 
ON notifications FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Attack Player V2 Fonksiyonunu Güncelle (Bildirim Eklemeli)
-- Bu fonksiyon önceki V2'nin üzerine yazar ve bildirim tetikleyicisini ekler.

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
    
    -- Güç Değişkenleri
    v_attacker_power INTEGER;
    v_defender_power INTEGER;
    
    -- Savunma Hesaplama
    v_def_effective_ak47 INTEGER;
    v_def_remaining_soldiers INTEGER;
    v_def_effective_baretta INTEGER;
    
    -- Sonuç Hesaplama
    v_win_chance FLOAT;
    v_random_roll FLOAT;
    v_is_win BOOLEAN;
    
    -- Kayıplar ve Ganimet
    v_loot_cash INTEGER := 0;
    v_xp_gain INTEGER;
    
    -- Asker Kayıpları
    v_attacker_loss_ratio FLOAT;
    v_defender_loss_ratio FLOAT;
    v_attacker_dead INTEGER;
    v_defender_dead INTEGER;
    
    -- Silah Kayıpları
    v_att_lost_baretta INTEGER := 0;
    v_att_lost_ak47 INTEGER := 0;
    v_def_lost_baretta INTEGER := 0;
    v_def_lost_ak47 INTEGER := 0;
    
    v_message TEXT;
    
    -- Bildirim Değişkenleri
    v_attacker_name TEXT;
    v_notif_title TEXT;
    v_notif_body TEXT;
BEGIN
    -- 1. SALDIRAN BİLGİLERİ & KONTROLLER
    SELECT * INTO v_attacker_stats FROM player_stats WHERE id = v_attacker_id;
    
    -- Saldıranın adını al (username tablosundan veya player_stats'tan)
    v_attacker_name := v_attacker_stats.username;
    
    IF v_attacker_stats.soldiers < p_soldiers THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Yeterli askeriniz yok!');
    END IF;
    
    IF v_attacker_stats.energy < 10 THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Yeterli enerjiniz yok (Gerekli: 10)');
    END IF;
    
    IF v_attacker_stats.baretta < p_baretta_count OR v_attacker_stats.ak47 < p_ak47_count THEN
         RETURN jsonb_build_object('success', FALSE, 'message', 'Envanterinizde bu kadar silah yok!');
    END IF;

    -- 2. SAVUNAN BİLGİLERİ
    SELECT * INTO v_target_stats FROM player_stats WHERE id = p_target_id;
    IF v_target_stats IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Hedef oyuncu bulunamadı!');
    END IF;

    -- 3. GÜÇ HESAPLAMA (V2 Mantığı)
    v_attacker_power := calculate_attack_power_v2(p_soldiers, p_baretta_count, p_ak47_count, v_attacker_stats.strength);

    -- Savunma Mantığı (Akıllı Silah Kullanımı)
    v_def_effective_ak47 := LEAST(v_target_stats.soldiers, v_target_stats.ak47);
    v_def_remaining_soldiers := v_target_stats.soldiers - v_def_effective_ak47;
    v_def_effective_baretta := LEAST(v_def_remaining_soldiers, v_target_stats.baretta);
    
    v_defender_power := (v_target_stats.soldiers * 5) + 
                        (v_def_effective_ak47 * 10) + 
                        (v_def_effective_baretta * 3) + 
                        (v_target_stats.defense * 2);

    -- 4. SAVAŞ SONUCU
    IF v_attacker_power = 0 AND v_defender_power = 0 THEN
         v_win_chance := 0.5;
    ELSIF v_attacker_power = 0 THEN
         v_win_chance := 0.0;
    ELSE
         v_win_chance := v_attacker_power::FLOAT / (v_attacker_power + v_defender_power)::FLOAT;
    END IF;
    
    v_random_roll := random();
    v_is_win := v_random_roll < v_win_chance;

    -- 5. KAYIP HESAPLAMA
    IF v_is_win THEN
        -- Saldıran KAZANDI
        v_attacker_loss_ratio := 0.05 + (random() * 0.05); 
        v_defender_loss_ratio := 0.15 + (random() * 0.10);
        v_loot_cash := floor(v_target_stats.cash * (0.1 + random() * 0.2));
        v_xp_gain := 50;
        v_message := 'KAZANDINIZ! Düşmanı bozguna uğrattınız.';
        
        -- Savunan için Bildirim (Mağlubiyet)
        v_notif_title := '🚨 SALDIRIYA UĞRADINIZ!';
        v_notif_body := 'Düşman ' || v_attacker_name || ' mekanınızı bastı ve KAZANDI! $' || v_loot_cash || ' paranızı çaldı.';
        
        UPDATE player_stats SET battles_won = battles_won + 1 WHERE id = v_attacker_id;
        UPDATE player_stats SET battles_lost = battles_lost + 1 WHERE id = p_target_id;
    ELSE
        -- Saldıran KAYBETTİ
        v_attacker_loss_ratio := 0.15 + (random() * 0.10);
        v_defender_loss_ratio := 0.05 + (random() * 0.05);
        v_xp_gain := 10;
        v_message := 'KAYBETTİNİZ! Savunma hattını aşamadınız.';
        
        -- Savunan için Bildirim (Galibiyet)
        v_notif_title := '🛡️ SALDIRI PÜSKÜRTÜLDÜ!';
        v_notif_body := 'Düşman ' || v_attacker_name || ' saldırdı ama savunmanız geçit vermedi!';
        
        UPDATE player_stats SET battles_lost = battles_lost + 1 WHERE id = v_attacker_id;
        UPDATE player_stats SET battles_won = battles_won + 1 WHERE id = p_target_id;
    END IF;
    
    v_attacker_dead := floor(p_soldiers * v_attacker_loss_ratio);
    v_defender_dead := floor(v_target_stats.soldiers * v_defender_loss_ratio);
    
    -- Silah Kayıpları
    SELECT p_lost_baretta, p_lost_ak47 INTO v_att_lost_baretta, v_att_lost_ak47 
    FROM calculate_weapon_loss(v_attacker_dead, v_attacker_stats.baretta, v_attacker_stats.ak47);
    
    SELECT p_lost_baretta, p_lost_ak47 INTO v_def_lost_baretta, v_def_lost_ak47 
    FROM calculate_weapon_loss(v_defender_dead, v_target_stats.baretta, v_target_stats.ak47);

    -- 6. VERİTABANI GÜNCELLEMELERİ
    UPDATE player_stats 
    SET 
        energy = energy - 10,
        cash = cash + v_loot_cash,
        experience = experience + v_xp_gain,
        soldiers = GREATEST(0, soldiers - v_attacker_dead),
        baretta = GREATEST(0, baretta - v_att_lost_baretta),
        ak47 = GREATEST(0, ak47 - v_att_lost_ak47),
        last_active = now()
    WHERE id = v_attacker_id;
    
    UPDATE player_stats 
    SET 
        cash = GREATEST(0, cash - v_loot_cash),
        soldiers = GREATEST(0, soldiers - v_defender_dead),
        baretta = GREATEST(0, baretta - v_def_lost_baretta),
        ak47 = GREATEST(0, ak47 - v_def_lost_ak47)
    WHERE id = p_target_id;

    -- 7. BİLDİRİM KAYDI OLUŞTUR
    -- Bu kayıt, Supabase Webhook ile Cloudflare Worker'ı tetikleyecek
    INSERT INTO notifications (user_id, title, body, type, data)
    VALUES (
        p_target_id, 
        v_notif_title, 
        v_notif_body, 
        'attack',
        jsonb_build_object('attacker_id', v_attacker_id, 'loot', v_loot_cash, 'dead_soldiers', v_defender_dead)
    );

    -- Detaylı Mesaj
    v_message := v_message || 
                 E'\n\n💥 Kayıplarınız:' ||
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
