-- AdMob Reward RPC
-- Kullanıcı reklam izlediğinde 10-30 arası rastgele MT Coin kazanır

CREATE OR REPLACE FUNCTION rpc_watch_ad_reward(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_reward_amount INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- 10 ile 30 arasında rastgele bir miktar belirle
    v_reward_amount := floor(random() * (30 - 10 + 1) + 10)::INTEGER;

    -- Kullanıcının MT Coin bakiyesini güncelle
    UPDATE player_stats
    SET mt_coins = COALESCE(mt_coins, 0) + v_reward_amount
    WHERE id = p_user_id
    RETURNING mt_coins INTO v_new_balance;

    -- Sonucu döndür
    RETURN jsonb_build_object(
        'success', true,
        'reward_amount', v_reward_amount,
        'new_balance', v_new_balance,
        'message', 'Tebrikler! ' || v_reward_amount || ' MT Coin kazandınız.'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'message', 'Ödül verilirken bir hata oluştu: ' || SQLERRM
    );
END;
$$;
