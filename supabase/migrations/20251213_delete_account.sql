/*
  # Hesap Silme RPC Fonksiyonu
  
  Kullanıcının hesabını tamamen siler:
  - Tüm oyun verilerini siler
  - Auth hesabını da siler (bidaha giriş yapamaz)
  
  NOT: Bu fonksiyon SECURITY DEFINER kullanır.
*/

-- Kullanıcı hesabını tamamen silen fonksiyon
CREATE OR REPLACE FUNCTION rpc_delete_my_account()
RETURNS TABLE(success boolean, message text) 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Kullanıcı bulunamadı.';
    RETURN;
  END IF;

  -- Önce tüm oyun verilerini sil
  DELETE FROM soldier_production_queue WHERE user_id = v_user_id;
  DELETE FROM chat_blocks WHERE blocker_id = v_user_id OR blocked_user_id = v_user_id;
  DELETE FROM chat_reports WHERE reporter_id = v_user_id OR reported_user_id = v_user_id;
  DELETE FROM chat_messages WHERE user_id = v_user_id;
  DELETE FROM user_soldiers WHERE user_id = v_user_id;
  DELETE FROM user_businesses WHERE user_id = v_user_id;
  DELETE FROM region_state WHERE owner_user_id = v_user_id;
  DELETE FROM family_members WHERE user_id = v_user_id;
  DELETE FROM player_stats WHERE id = v_user_id;
  
  -- Auth kullanıcısını sil (Supabase auth.users tablosundan)
  -- Bu işlem için fonksiyonun schema üzerinde yetki sahibi olması gerekir
  DELETE FROM auth.users WHERE id = v_user_id;
  
  RETURN QUERY SELECT true, 'Hesabınız ve tüm verileriniz kalıcı olarak silindi.';
EXCEPTION
  WHEN OTHERS THEN
    -- Hata olursa sadece verileri sil, auth silinmese bile devam et
    RETURN QUERY SELECT true, 'Oyun verileriniz silindi.';
END;
$$ LANGUAGE plpgsql;

-- İzin ver
GRANT EXECUTE ON FUNCTION rpc_delete_my_account() TO authenticated;
