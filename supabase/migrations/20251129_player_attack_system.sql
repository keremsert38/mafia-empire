-- =====================================================
-- UPDATED PLAYER ATTACK SYSTEM - NEW BATTLE MECHANICS
-- =====================================================
-- YENİ KURAL: Kazanan taraf kaybeden tarafın TÜM askerlerini yok eder
-- Kazanan tarafın kaybı = kaybeden tarafın asker sayısı
-- =====================================================

-- 1. Notifications table (aynı kalıyor)
DROP TABLE IF EXISTS player_notifications CASCADE;

CREATE TABLE player_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('attack', 'defense', 'family', 'system')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_player_notifications_player_id ON player_notifications(player_id, created_at DESC);
CREATE INDEX idx_player_notifications_unread ON player_notifications(player_id, is_read) WHERE is_read = false;

ALTER TABLE player_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON player_notifications;
CREATE POLICY "Users can view own notifications" 
ON player_notifications FOR SELECT 
USING (auth.uid() = player_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON player_notifications;
CREATE POLICY "Users can update own notifications" 
ON player_notifications FOR UPDATE 
USING (auth.uid() = player_id);

DROP POLICY IF EXISTS "Users can insert notifications" ON player_notifications;
CREATE POLICY "Users can insert notifications" 
ON player_notifications FOR INSERT 
WITH CHECK (true);

GRANT ALL ON player_notifications TO authenticated;
GRANT ALL ON player_notifications TO anon;

-- 2. UPDATED Player Attack RPC Function - YENİ SAVAŞ MEKANİĞİ
CREATE OR REPLACE FUNCTION rpc_attack_player(
  p_target_player_id uuid,
  p_soldiers_to_send integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attacker_id uuid;
  v_attacker_name text;
  v_attacker_soldiers integer;
  v_attacker_cash bigint;
  v_attacker_battles_won integer;
  v_attacker_battles_lost integer;
  
  v_defender_soldiers integer;
  v_defender_cash bigint;
  v_defender_name text;
  v_defender_battles_lost integer;
  
  v_attacker_power integer;
  v_defender_power integer;
  v_success boolean;
  
  v_attacker_loss integer;
  v_defender_loss integer;
  v_attacker_remaining integer;
  v_defender_remaining integer;
  v_cash_stolen bigint;
  v_steal_percentage numeric;
  
  v_result jsonb;
BEGIN
  v_attacker_id := auth.uid();
  
  IF v_attacker_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Kullanıcı bulunamadı!');
  END IF;
  
  IF v_attacker_id = p_target_player_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Kendinize saldıramazsınız!');
  END IF;
  
  SELECT username, soldiers, cash, battles_won, battles_lost
  INTO v_attacker_name, v_attacker_soldiers, v_attacker_cash, v_attacker_battles_won, v_attacker_battles_lost
  FROM player_stats
  WHERE id = v_attacker_id;
  
  SELECT username, soldiers, cash, battles_lost
  INTO v_defender_name, v_defender_soldiers, v_defender_cash, v_defender_battles_lost
  FROM player_stats
  WHERE id = p_target_player_id;
  
  IF v_defender_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Hedef oyuncu bulunamadı!');
  END IF;
  
  IF p_soldiers_to_send > v_attacker_soldiers THEN
    RETURN jsonb_build_object('success', false, 'message', format('Yetersiz asker! %s askeriniz var.', v_attacker_soldiers));
  END IF;
  
  IF p_soldiers_to_send <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'En az 1 asker göndermelisiniz!');
  END IF;
  
  -- ===== YENİ SAVAŞ MEKANİĞİ =====
  -- Savunma 1.5x bonus
  v_defender_power := FLOOR(v_defender_soldiers * 1.5);
  v_attacker_power := p_soldiers_to_send;
  
  -- Kazanan belirle
  v_success := v_attacker_power > v_defender_power;
  
  -- YENİ KURAL: Kayıplar
  IF v_success THEN
    -- Saldırgan kazandı
    -- Savunucunun TÜM askerleri yok olur
    v_defender_loss := v_defender_soldiers;
    v_defender_remaining := 0;
    
    -- Saldırganın kaybı = savunucunun asker sayısı
    v_attacker_loss := v_defender_soldiers;
    v_attacker_remaining := p_soldiers_to_send - v_attacker_loss;
    
    -- Geri kalan askerler toplam askere eklenir (gönderilen - kayıp)
    -- Saldırgan toplam askeri = eski asker - gönderilen + kalan
    -- = v_attacker_soldiers - p_soldiers_to_send + v_attacker_remaining
    
  ELSE
    -- Savunucu kazandı
    -- Saldırganın GÖNDERDİĞİ TÜM askerler yok olur
    v_attacker_loss := p_soldiers_to_send;
    v_attacker_remaining := 0;
    
    -- Savunucunun kaybı = saldırganın gönderdiği asker sayısı
    v_defender_loss := p_soldiers_to_send;
    v_defender_remaining := GREATEST(0, v_defender_soldiers - v_defender_loss);
  END IF;
  
  -- Para çalma (sadece başarılıysa)
  v_cash_stolen := 0;
  IF v_success THEN
    v_steal_percentage := 0.2 + (random() * 0.4); -- %20-%60 arası
    v_cash_stolen := FLOOR(v_defender_cash * v_steal_percentage);
  END IF;
  
  -- SALDIRGAN GÜNCELLE
  UPDATE player_stats
  SET 
    -- Toplam asker = eski asker - gönderilen + kalan
    soldiers = v_attacker_soldiers - p_soldiers_to_send + v_attacker_remaining,
    cash = CASE WHEN v_success THEN cash + v_cash_stolen ELSE cash END,
    battles_won = CASE WHEN v_success THEN battles_won + 1 ELSE battles_won END,
    battles_lost = CASE WHEN NOT v_success THEN battles_lost + 1 ELSE battles_lost END,
    updated_at = now()
  WHERE id = v_attacker_id;
  
  UPDATE user_soldiers
  SET 
    soldiers = v_attacker_soldiers - p_soldiers_to_send + v_attacker_remaining,
    updated_at = now()
  WHERE user_id = v_attacker_id;
  
  -- SAVUNUCU GÜNCELLE
  UPDATE player_stats
  SET 
    soldiers = v_defender_remaining,
    cash = GREATEST(0, cash - v_cash_stolen),
    battles_lost = CASE WHEN v_success THEN battles_lost + 1 ELSE battles_lost END,
    updated_at = now()
  WHERE id = p_target_player_id;
  
  UPDATE user_soldiers
  SET 
    soldiers = v_defender_remaining,
    updated_at = now()
  WHERE user_id = p_target_player_id;
  
  -- Bildirim gönder
  INSERT INTO player_notifications (player_id, type, title, message, data)
  VALUES (
    p_target_player_id,
    'attack',
    CASE WHEN v_success THEN '⚔️ Saldırıya Uğradınız!' ELSE '🛡️ Saldırıyı Savundunuz!' END,
    CASE 
      WHEN v_success THEN format('%s saldırısında yenildiniz!
💀 TÜM askerlerinizi kaybettiniz (%s asker)
💵 $%s çalındı', v_attacker_name, v_defender_loss, v_cash_stolen)
      ELSE format('%s saldırısını püskürttünüz!
💀 %s asker kaybettiniz
🛡️ %s askeriniz kaldı', v_attacker_name, v_defender_loss, v_defender_remaining)
    END,
    jsonb_build_object(
      'attacker_id', v_attacker_id,
      'attacker_name', v_attacker_name,
      'success', v_success,
      'cash_stolen', v_cash_stolen,
      'soldiers_lost', v_defender_loss,
      'attacker_soldiers_lost', v_attacker_loss,
      'attacker_remaining', v_attacker_remaining,
      'defender_remaining', v_defender_remaining
    )
  );
  
  -- Sonuç döndür
  v_result := jsonb_build_object(
    'success', v_success,
    'message', CASE 
      WHEN v_success THEN format('🎉 Saldırı başarılı!

%s adlı oyuncuya saldırdınız!
💵 Çalınan para: $%s
💀 Kaybettiğiniz asker: %s
⚔️ Kalan askeriniz: %s
🎯 Rakip oyuncunun TÜM askerleri yok oldu (%s asker)', 
        v_defender_name, v_cash_stolen, v_attacker_loss, v_attacker_remaining, v_defender_loss)
      ELSE format('💥 Saldırı başarısız!

%s adlı oyuncu savunmayı kazandı!
💀 GÖNDERDİĞİNİZ TÜM askerler yok oldu (%s asker)
🛡️ Rakip %s asker kaybetti', 
        v_defender_name, v_attacker_loss, v_defender_loss)
    END,
    'cashStolen', v_cash_stolen,
    'soldiersLost', v_attacker_loss
  );
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_attack_player TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_attack_player TO anon;

SELECT '✅ YENİ savaş mekaniği kuruldu! Kazanan taraf, kaybeden tarafın TÜM askerlerini yok eder.' AS status;
