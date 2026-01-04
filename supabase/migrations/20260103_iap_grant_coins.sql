-- MT Coin Grant RPC (In-App Purchase sonrası)
-- Kullanıcıya satın alma sonrası MT Coin ekler

CREATE OR REPLACE FUNCTION rpc_grant_mt_coins(
    p_user_id UUID,
    p_amount INTEGER,
    p_product_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    -- Kullanıcının MT Coin bakiyesini güncelle
    UPDATE player_stats
    SET mt_coins = COALESCE(mt_coins, 0) + p_amount
    WHERE id = p_user_id
    RETURNING mt_coins INTO v_new_balance;

    -- Satın alma logunu kaydet (opsiyonel - audit için)
    -- INSERT INTO purchase_logs (user_id, product_id, amount, created_at)
    -- VALUES (p_user_id, p_product_id, p_amount, now());

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_new_balance,
        'amount_added', p_amount
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'message', 'MT Coin eklenirken hata: ' || SQLERRM
    );
END;
$$;
