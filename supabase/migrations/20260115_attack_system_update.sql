-- =====================================================
-- SALDIRI SİSTEMİ GÜNCELLEMESİ V2
-- =====================================================

-- 1. Saldırı Gücü Hesaplama Fonksiyonu
DROP FUNCTION IF EXISTS calculate_attack_power_v2(INTEGER, INTEGER, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION calculate_attack_power_v2(
    p_soldiers INTEGER,
    p_baretta_count INTEGER,
    p_ak47_count INTEGER,
    p_base_power INTEGER DEFAULT 0 -- Ekstra bonuslar için
)
RETURNS INTEGER AS $$
DECLARE
    v_soldier_power INTEGER := 5;
    v_baretta_power INTEGER := 3;  -- Kullanıcı isteği
    v_ak47_power INTEGER := 10;   -- Kullanıcı isteği
    v_total_power INTEGER;
BEGIN
    -- Silah sayısı kontrolü (Zaten UI'da yapılıyor ama burada da olsun)
    -- Toplam silah sayısı asker sayısını geçemez mantığı UI tarafında
    -- Burada sadece gelen değerleri hesaplıyoruz
    
    v_total_power := (p_soldiers * v_soldier_power) + 
                     (p_baretta_count * v_baretta_power) + 
                     (p_ak47_count * v_ak47_power) +
                     p_base_power;
                     
    RETURN v_total_power;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Yeni Saldırı Fonksiyonu (V2)
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
    v_loot_resource TEXT := ''; -- Çalınan malzeme (gelecek için)
    v_xp_gain INTEGER;
    v_message TEXT;
BEGIN
    -- 1. Saldıran bilgilerini al
    SELECT * INTO v_attacker_stats FROM player_stats WHERE id = v_attacker_id;
    
    -- Asker kontrolü
    IF v_attacker_stats.soldiers < p_soldiers THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Yeterli askeriniz yok!');
    END IF;

    -- Enerji kontrolü (Saldırı başı 10 enerji)
    IF v_attacker_stats.energy < 10 THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Yeterli enerjiniz yok (Gerekli: 10)');
    END IF;
    
    -- Silah kontrolü (Basitleştirilmiş: Sadece sayı kontrolü, envanterden düşme yok - reusable)
    -- İstersen envanter kontrolü de ekleyebiliriz: IF v_attacker_stats.baretta < p_baretta_count ...
    
    -- 2. Savunan bilgilerini al
    SELECT * INTO v_target_stats FROM player_stats WHERE id = p_target_id;
    
    IF v_target_stats IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Hedef oyuncu bulunamadı!');
    END IF;
    
    -- 3. Güç Hesaplama
    -- Saldıran Gücü
    v_attacker_power := calculate_attack_power_v2(
        p_soldiers, 
        p_baretta_count, 
        p_ak47_count, 
        v_attacker_stats.strength -- Stat bonusu
    );
    
    -- Savunan Gücü (Basit savunma: Askerleri * 10 + Savunma Statı)
    -- İleride savunma silahları da eklenebilir
    v_defender_power := (v_target_stats.soldiers * 10) + (v_target_stats.defense * 2); 
    
    -- 4. Savaş Sonucu
    -- Basit formül: Güç farkına göre şans
    -- Eşit güçte %50 şans.
    
    IF v_attacker_power = 0 AND v_defender_power = 0 THEN
         v_win_chance := 0.5;
    ELSIF v_attacker_power = 0 THEN
         v_win_chance := 0.0;
    ELSE
         v_win_chance := v_attacker_power::FLOAT / (v_attacker_power + v_defender_power)::FLOAT;
    END IF;
    
    v_random_roll := random();
    v_is_win := v_random_roll < v_win_chance;
    
    -- 5. Sonuçları Uygula
    
    -- Enerji düş
    UPDATE player_stats SET energy = energy - 10 WHERE id = v_attacker_id;
    
    IF v_is_win THEN
        -- KAZANMA
        -- Para çal (%10 ile %30 arası)
        v_loot_cash := floor(v_target_stats.cash * (0.1 + random() * 0.2));
        v_xp_gain := 50;
        
        -- Para transferi
        UPDATE player_stats SET cash = cash - v_loot_cash WHERE id = p_target_id;
        UPDATE player_stats SET cash = cash + v_loot_cash, experience = experience + v_xp_gain, battles_won = battles_won + 1 WHERE id = v_attacker_id;
        UPDATE player_stats SET battles_lost = battles_lost + 1 WHERE id = p_target_id;
        
        v_message := 'Saldırı Başarılı! ' || v_loot_cash || '$ gasp ettiniz.';
    ELSE
        -- KAYBETME
        v_xp_gain := 10;
        UPDATE player_stats SET experience = experience + v_xp_gain, battles_lost = battles_lost + 1 WHERE id = v_attacker_id;
        UPDATE player_stats SET battles_won = battles_won + 1 WHERE id = p_target_id;
        
        v_message := 'Saldırı Başarısız! Savunma çok güçlüydü.';
    END IF;
    
    -- Son saldırı zamanını güncelle
    UPDATE player_stats SET last_active = now() WHERE id = v_attacker_id;

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

GRANT EXECUTE ON FUNCTION attack_player_v2(UUID, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_attack_power_v2(INTEGER, INTEGER, INTEGER, INTEGER) TO authenticated;

-- =====================================================
-- BİTTİ
-- =====================================================
