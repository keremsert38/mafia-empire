-- =====================================================
-- SALDIRI SİSTEMİ GÜNCELLEMESİ V2 - GELİŞMİŞ SAVAŞ MANTIĞI
-- =====================================================

-- 1. Helper: Saldırı Gücü Hesaplama (Sadece Önizleme İçin)
DROP FUNCTION IF EXISTS calculate_attack_power_v2(INTEGER, INTEGER, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION calculate_attack_power_v2(
    p_soldiers INTEGER,
    p_baretta_count INTEGER,
    p_ak47_count INTEGER,
    p_base_power INTEGER DEFAULT 0
)
RETURNS INTEGER AS $$
DECLARE
    v_soldier_power INTEGER := 5;  -- GÜNCEL: 5
    v_baretta_power INTEGER := 3;  -- GÜNCEL: 3
    v_ak47_power INTEGER := 10;    -- GÜNCEL: 10
    v_total_power INTEGER;
BEGIN
    v_total_power := (p_soldiers * v_soldier_power) + 
                     (p_baretta_count * v_baretta_power) + 
                     (p_ak47_count * v_ak47_power) +
                     p_base_power;
    RETURN v_total_power;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- 2. Helper: Kayıp Silah Hesaplama (Ucuzdan Pahalıya)
-- Ölen asker sayısına göre kaç Baretta ve kaç AK47 silineceğini hesaplar
CREATE OR REPLACE FUNCTION calculate_weapon_loss(
    p_dead_soldiers INTEGER,
    p_current_baretta INTEGER,
    p_current_ak47 INTEGER,
    OUT p_lost_baretta INTEGER,
    OUT p_lost_ak47 INTEGER
)
AS $$
DECLARE
    v_remaining_loss INTEGER := p_dead_soldiers;
BEGIN
    -- Önce ucuz silahlar (Baretta)
    p_lost_baretta := LEAST(v_remaining_loss, p_current_baretta);
    v_remaining_loss := v_remaining_loss - p_lost_baretta;
    
    -- Sonra pahalı silahlar (AK47)
    p_lost_ak47 := LEAST(v_remaining_loss, p_current_ak47);
END;
$$ LANGUAGE plpgsql;


-- 3. ANA SALDIRI FONKSİYONU
DROP FUNCTION IF EXISTS attack_player_v2(UUID, INTEGER, INTEGER, INTEGER);

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
    
    -- Savunma Hesaplama (Defender Logic)
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
BEGIN
    -- 1. SALDIRAN BİLGİLERİ & KONTROLLER
    SELECT * INTO v_attacker_stats FROM player_stats WHERE id = v_attacker_id;
    
    IF v_attacker_stats.soldiers < p_soldiers THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Yeterli askeriniz yok!');
    END IF;
    
    IF v_attacker_stats.energy < 10 THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Yeterli enerjiniz yok (Gerekli: 10)');
    END IF;
    
    -- Silah sahipliği kontrolü
    IF v_attacker_stats.baretta < p_baretta_count OR v_attacker_stats.ak47 < p_ak47_count THEN
         RETURN jsonb_build_object('success', FALSE, 'message', 'Envanterinizde bu kadar silah yok!');
    END IF;

    -- 2. SAVUNAN BİLGİLERİ
    SELECT * INTO v_target_stats FROM player_stats WHERE id = p_target_id;
    IF v_target_stats IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Hedef oyuncu bulunamadı!');
    END IF;

    -- 3. GÜÇ HESAPLAMA
    
    -- A) SALDIRAN GÜCÜ
    -- (Asker * 5) + (Baretta * 3) + (AK47 * 10) + Stat Bonus
    v_attacker_power := (p_soldiers * 5) + 
                        (p_baretta_count * 3) + 
                        (p_ak47_count * 10) + 
                        v_attacker_stats.strength;

    -- B) SAVUNAN GÜCÜ (AKILLI SİLAH KULLANIMI)
    -- Kural: Silah sayısı asker sayısını geçemez. En güçlü silahlar (AK47) öncelikli sayılır.
    
    -- 1. AK-47 Kullanımı (Max asker kadar)
    v_def_effective_ak47 := LEAST(v_target_stats.soldiers, v_target_stats.ak47);
    v_def_remaining_soldiers := v_target_stats.soldiers - v_def_effective_ak47;
    
    -- 2. Baretta Kullanımı (Kalan asker kadar)
    v_def_effective_baretta := LEAST(v_def_remaining_soldiers, v_target_stats.baretta);
    
    -- Savunma Gücü Hesapla
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

    -- 5. KAYIP HESAPLAMA (ÖLÜM & SİLAH KAYBI)
    
    IF v_is_win THEN
        -- Saldıran KAZANDI
        v_attacker_loss_ratio := 0.05 + (random() * 0.05); -- %5 - %10 kayıp
        v_defender_loss_ratio := 0.15 + (random() * 0.10); -- %15 - %25 kayıp
        
        -- Ganimet
        v_loot_cash := floor(v_target_stats.cash * (0.1 + random() * 0.2)); -- %10-%30 Para
        v_xp_gain := 50;
        v_message := 'KAZANDINIZ! Düşmanı bozguna uğrattınız.';
        
        -- İstatistikler
        UPDATE player_stats SET battles_won = battles_won + 1 WHERE id = v_attacker_id;
        UPDATE player_stats SET battles_lost = battles_lost + 1 WHERE id = p_target_id;
    ELSE
        -- Saldıran KAYBETTİ
        v_attacker_loss_ratio := 0.15 + (random() * 0.10); -- %15 - %25 kayıp
        v_defender_loss_ratio := 0.05 + (random() * 0.05); -- %5 - %10 kayıp
        
        v_xp_gain := 10;
        v_message := 'KAYBETTİNİZ! Savunma hattını aşamadınız.';
        
        -- İstatistikler
        UPDATE player_stats SET battles_lost = battles_lost + 1 WHERE id = v_attacker_id;
        UPDATE player_stats SET battles_won = battles_won + 1 WHERE id = p_target_id;
    END IF;
    
    -- Ölü Sayıları (Tam sayıya yuvarla)
    v_attacker_dead := floor(p_soldiers * v_attacker_loss_ratio);
    v_defender_dead := floor(v_target_stats.soldiers * v_defender_loss_ratio);
    
    -- Silah Kayıplarını Hesapla (1 Ölü = 1 Silah Kaybı)
    -- Saldıranın kaybı (Savaşa götürdüğü silahlardan düşer)
    -- NOT: Saldıran sadece götürdüğü silahları kaybedebilir mi? Evet mantıken.
    -- Ancak basitleştirmek için genel envanterden düşüyoruz ama zaten götürdüğü kadarı risk altında olmalı. 
    -- Burada basitleştirilmiş mantık: Ölü asker kadar silah sil. (Baretta -> AK47 sırasıyla)
    
    -- Saldıran Silah Kaybı Hesabı
    SELECT p_lost_baretta, p_lost_ak47 INTO v_att_lost_baretta, v_att_lost_ak47 
    FROM calculate_weapon_loss(v_attacker_dead, v_attacker_stats.baretta, v_attacker_stats.ak47);
    
    -- Savunan Silah Kaybı Hesabı
    SELECT p_lost_baretta, p_lost_ak47 INTO v_def_lost_baretta, v_def_lost_ak47 
    FROM calculate_weapon_loss(v_defender_dead, v_target_stats.baretta, v_target_stats.ak47);

    -- 6. VERİTABANI GÜNCELLEMELERİ
    
    -- Saldıran Güncellemesi
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
    
    -- Savunan Güncellemesi
    UPDATE player_stats 
    SET 
        cash = GREATEST(0, cash - v_loot_cash),
        soldiers = GREATEST(0, soldiers - v_defender_dead),
        baretta = GREATEST(0, baretta - v_def_lost_baretta),
        ak47 = GREATEST(0, ak47 - v_def_lost_ak47)
    WHERE id = p_target_id;

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
        'loot', v_loot_cash,
        'dead_soldiers', v_attacker_dead,
        'lost_baretta', v_att_lost_baretta,
        'lost_ak47', v_att_lost_ak47
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION attack_player_v2(UUID, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_attack_power_v2(INTEGER, INTEGER, INTEGER, INTEGER) TO authenticated;
