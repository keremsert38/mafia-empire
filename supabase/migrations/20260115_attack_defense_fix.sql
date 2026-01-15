-- =====================================================
-- SALDIRI SİSTEMİ SAVUNMA GÜCÜ DÜZELTMESİ
-- =====================================================
-- Savunan oyuncunun TÜM askerleri ve TÜM silahları savunma gücüne dahil edilecek

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
    v_attacker_power INTEGER;
    v_defender_power INTEGER;
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

    -- SALDIRAN GÜÇ HESAPLAMA
    -- Formül: (Asker * 5) + (Baretta * 3) + (AK-47 * 10) + strength bonusu
    v_attacker_power := (p_soldiers * 5) + 
                        (p_baretta_count * 3) + 
                        (p_ak47_count * 10) + 
                        COALESCE(v_attacker_stats.strength, 0);

    -- SAVUNAN GÜÇ HESAPLAMA (TÜM envanter dahil)
    -- Savunanın TÜM askerleri ve TÜM silahları otomatik savunmaya katılıyor
    v_defender_power := (COALESCE(v_target_stats.soldiers, 0) * 5) + 
                        (COALESCE(v_target_stats.baretta, 0) * 3) + 
                        (COALESCE(v_target_stats.ak47, 0) * 10) + 
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
    
    -- Silah kayıpları (ölen asker başına silah kaybı)
    v_att_lost_baretta := LEAST(v_attacker_dead, COALESCE(v_attacker_stats.baretta, 0));
    v_att_lost_ak47 := LEAST(GREATEST(0, v_attacker_dead - v_att_lost_baretta), COALESCE(v_attacker_stats.ak47, 0));
    
    v_def_lost_baretta := LEAST(v_defender_dead, COALESCE(v_target_stats.baretta, 0));
    v_def_lost_ak47 := LEAST(GREATEST(0, v_defender_dead - v_def_lost_baretta), COALESCE(v_target_stats.ak47, 0));

    -- Saldıran güncellemeleri
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
    
    -- Savunan güncellemeleri
    UPDATE player_stats 
    SET 
        cash = GREATEST(0, cash - v_loot_cash),
        soldiers = GREATEST(0, soldiers - v_defender_dead),
        baretta = GREATEST(0, COALESCE(baretta, 0) - v_def_lost_baretta),
        ak47 = GREATEST(0, COALESCE(ak47, 0) - v_def_lost_ak47)
    WHERE id = p_target_id;

    -- Bildirim kaydı
    INSERT INTO notifications (user_id, title, body, type, data)
    VALUES (
        p_target_id, 
        v_notif_title, 
        v_notif_body, 
        'attack',
        jsonb_build_object(
            'attacker_id', v_attacker_id, 
            'attacker_name', v_attacker_name,
            'loot', v_loot_cash, 
            'dead_soldiers', v_defender_dead,
            'is_win', NOT v_is_win
        )
    );

    -- Sonuç mesajı
    v_message := v_message || E'\n\n⚔️ Savaş Detayları:' ||
                 E'\n💪 Sizin Güç: ' || v_attacker_power ||
                 E'\n🛡️ Savunma Gücü: ' || v_defender_power ||
                 E'\n📊 Kazanma Şansı: %' || ROUND(v_win_chance * 100) ||
                 E'\n\n💥 Kayıplarınız:' ||
                 E'\n💀 Asker: -' || v_attacker_dead ||
                 E'\n🔫 Baretta: -' || v_att_lost_baretta ||
                 E'\n🔫 AK-47: -' || v_att_lost_ak47;
                 
    IF v_loot_cash > 0 THEN
        v_message := v_message || E'\n💰 Gasp: $' || v_loot_cash;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE, 
        'is_win', v_is_win,
        'message', v_message,
        'attacker_power', v_attacker_power,
        'defender_power', v_defender_power,
        'win_chance', ROUND(v_win_chance * 100),
        'loot', v_loot_cash
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION attack_player_v2(UUID, INTEGER, INTEGER, INTEGER) TO authenticated;
