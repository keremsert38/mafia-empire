-- =====================================================
-- GÜÇ DENGESİ SAVAŞ SİSTEMİ
-- =====================================================
-- Kazanan: Daha yüksek güce sahip taraf
-- Kayıp: Kaybeden tarafın gücü kadar kayıp her iki taraftan düşülür
-- Güç → Soldato dönüşümü: Kayıp Güç / 5 = Kayıp Soldato

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
    v_is_win BOOLEAN;
    v_power_diff INTEGER;
    v_lost_power INTEGER;
    v_attacker_lost_soldiers INTEGER;
    v_defender_lost_soldiers INTEGER;
    v_attacker_lost_baretta INTEGER;
    v_attacker_lost_ak47 INTEGER;
    v_defender_lost_baretta INTEGER;
    v_defender_lost_ak47 INTEGER;
    v_loot_cash INTEGER := 0;
    v_xp_gain INTEGER;
    v_message TEXT;
    v_attacker_name TEXT;
    v_notif_title TEXT;
    v_notif_body TEXT;
BEGIN
    -- Saldıran bilgileri
    SELECT * INTO v_attacker_stats FROM player_stats WHERE id = v_attacker_id;
    v_attacker_name := COALESCE(v_attacker_stats.username, 'Bilinmeyen');
    
    -- Validasyonlar
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
    -- Formül: (Asker × 5) + (Baretta × 3) + (AK-47 × 10)
    v_attacker_power := (p_soldiers * 5) + (p_baretta_count * 3) + (p_ak47_count * 10);

    -- SAVUNAN GÜÇ HESAPLAMA (TÜM envanter)
    v_defender_power := (COALESCE(v_target_stats.soldiers, 0) * 5) + 
                        (COALESCE(v_target_stats.baretta, 0) * 3) + 
                        (COALESCE(v_target_stats.ak47, 0) * 10);

    -- SAVAŞ SONUCU: Daha yüksek güç kazanır
    v_is_win := v_attacker_power > v_defender_power;
    
    -- Eşitlik durumunda saldıran kaybeder (savunan avantajlı)
    IF v_attacker_power = v_defender_power THEN
        v_is_win := FALSE;
    END IF;

    -- Güç farkı ve kayıp hesaplama
    v_power_diff := ABS(v_attacker_power - v_defender_power);
    v_lost_power := LEAST(v_attacker_power, v_defender_power); -- Her iki taraf da kaybeden tarafın gücü kadar kaybeder

    IF v_is_win THEN
        -- SALDIRAN KAZANDI
        -- Saldıran kayıpları: Savunan gücü kadar güç kaybeder
        v_attacker_lost_soldiers := FLOOR(v_lost_power / 5.0); -- Güç / 5 = Soldato
        v_attacker_lost_soldiers := LEAST(v_attacker_lost_soldiers, p_soldiers); -- Gönderilenden fazla kaybedemez
        
        -- Saldıranın silah kayıpları (önce ucuz olanlar)
        v_attacker_lost_baretta := LEAST(v_attacker_lost_soldiers, p_baretta_count);
        v_attacker_lost_ak47 := LEAST(v_attacker_lost_soldiers - v_attacker_lost_baretta, p_ak47_count);
        
        -- Savunan TÜM askeri ve silahı kaybeder
        v_defender_lost_soldiers := v_target_stats.soldiers;
        v_defender_lost_baretta := COALESCE(v_target_stats.baretta, 0);
        v_defender_lost_ak47 := COALESCE(v_target_stats.ak47, 0);
        
        -- Ganimet: SADECE hayatta kalan asker varsa ganimet al
        IF v_attacker_lost_soldiers >= p_soldiers THEN
            -- Tüm askerler öldü, ganimet yok!
            v_loot_cash := 0;
        ELSE
            -- Hayatta kalan var, ganimet al
            v_loot_cash := FLOOR(v_target_stats.cash * (0.2 + random() * 0.1));
        END IF;
        v_xp_gain := 50;
        
        v_message := '🏆 ZAFER! Düşmanı yendiniz!';
        v_notif_title := '🚨 YENİLDİNİZ!';
        v_notif_body := v_attacker_name || ' sizi yendi! Tüm askerleriniz ve $' || v_loot_cash || ' paranız kaybedildi.';
        
        UPDATE player_stats SET battles_won = battles_won + 1 WHERE id = v_attacker_id;
        UPDATE player_stats SET battles_lost = battles_lost + 1 WHERE id = p_target_id;
    ELSE
        -- SAVUNAN KAZANDI (Saldıran kaybetti)
        -- Savunan kayıpları: Saldıran gücü kadar güç kaybeder
        v_defender_lost_soldiers := FLOOR(v_lost_power / 5.0);
        v_defender_lost_soldiers := LEAST(v_defender_lost_soldiers, v_target_stats.soldiers);
        
        -- Savunanın silah kayıpları (önce ucuz olanlar)
        v_defender_lost_baretta := LEAST(v_defender_lost_soldiers, COALESCE(v_target_stats.baretta, 0));
        v_defender_lost_ak47 := LEAST(v_defender_lost_soldiers - v_defender_lost_baretta, COALESCE(v_target_stats.ak47, 0));
        
        -- Saldıran TÜM gönderdiği askeri ve silahı kaybeder
        v_attacker_lost_soldiers := p_soldiers;
        v_attacker_lost_baretta := p_baretta_count;
        v_attacker_lost_ak47 := p_ak47_count;
        
        v_loot_cash := 0;
        v_xp_gain := 10;
        
        v_message := '💀 YENİLDİNİZ! Saldırınız püskürtüldü ve tüm ordunuzu kaybettiniz!';
        v_notif_title := '🛡️ SAVUNMA BAŞARILI!';
        v_notif_body := v_attacker_name || ' saldırdı ama savunmanız galip geldi!';
        
        UPDATE player_stats SET battles_lost = battles_lost + 1 WHERE id = v_attacker_id;
        UPDATE player_stats SET battles_won = battles_won + 1 WHERE id = p_target_id;
    END IF;

    -- Saldıran güncellemeleri
    UPDATE player_stats 
    SET 
        energy = energy - 10,
        cash = cash + v_loot_cash,
        experience = experience + v_xp_gain,
        soldiers = GREATEST(0, soldiers - v_attacker_lost_soldiers),
        baretta = GREATEST(0, COALESCE(baretta, 0) - v_attacker_lost_baretta),
        ak47 = GREATEST(0, COALESCE(ak47, 0) - v_attacker_lost_ak47),
        last_active = now()
    WHERE id = v_attacker_id;
    
    -- Savunan güncellemeleri
    UPDATE player_stats 
    SET 
        cash = GREATEST(0, cash - v_loot_cash),
        soldiers = GREATEST(0, soldiers - v_defender_lost_soldiers),
        baretta = GREATEST(0, COALESCE(baretta, 0) - v_defender_lost_baretta),
        ak47 = GREATEST(0, COALESCE(ak47, 0) - v_defender_lost_ak47)
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
            'is_win', NOT v_is_win
        )
    );

    -- Detaylı sonuç mesajı
    v_message := v_message || E'\n\n⚔️ Savaş Özeti:' ||
                 E'\n💪 Saldırı Gücü: ' || v_attacker_power ||
                 E'\n🛡️ Savunma Gücü: ' || v_defender_power ||
                 E'\n📊 Güç Farkı: ' || v_power_diff ||
                 E'\n\n💥 Sizin Kayıplarınız:' ||
                 E'\n💀 Asker: -' || v_attacker_lost_soldiers ||
                 E'\n🔫 Baretta: -' || v_attacker_lost_baretta ||
                 E'\n🔫 AK-47: -' || v_attacker_lost_ak47;
                 
    IF v_loot_cash > 0 THEN
        v_message := v_message || E'\n\n💰 Ganimet: $' || v_loot_cash;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE, 
        'is_win', v_is_win,
        'message', v_message,
        'attacker_power', v_attacker_power,
        'defender_power', v_defender_power,
        'power_diff', v_power_diff,
        'loot', v_loot_cash,
        'attacker_losses', jsonb_build_object(
            'soldiers', v_attacker_lost_soldiers,
            'baretta', v_attacker_lost_baretta,
            'ak47', v_attacker_lost_ak47
        ),
        'defender_losses', jsonb_build_object(
            'soldiers', v_defender_lost_soldiers,
            'baretta', v_defender_lost_baretta,
            'ak47', v_defender_lost_ak47
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION attack_player_v2(UUID, INTEGER, INTEGER, INTEGER) TO authenticated;
