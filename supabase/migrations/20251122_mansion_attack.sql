-- Enable the pg_net extension if needed (usually enabled by default)
-- create extension if not exists "pg_net";

-- 1. Aile Hazinesinden Para Düşme Fonksiyonu
create or replace function decrement_family_treasury(
  p_family_id uuid,
  p_amount numeric
)
returns void
language plpgsql
security definer
as $$
begin
  update families
  set cash_treasury = greatest(0, cash_treasury - p_amount)
  where id = p_family_id;
end;
$$;

-- 2. Aile Malikanesine Saldırı Fonksiyonu (Opsiyonel: Eğer tüm mantığı SQL'e taşımak isterseniz)
-- Bu fonksiyon, client-side'daki attackMansion mantığının SQL karşılığıdır.
create or replace function attack_family_mansion(
  p_target_family_id uuid,
  p_attacking_soldiers int
)
returns json
language plpgsql
security definer
as $$
declare
  v_attacker_id uuid;
  v_attacker_family_id uuid;
  v_attacker_soldiers int;
  v_attacker_strength int;
  
  v_target_family_defense int;
  v_target_family_treasury numeric;
  
  v_attack_power numeric;
  v_defense_power numeric;
  
  v_loot numeric;
  v_lost_soldiers int;
  v_result json;
begin
  -- Saldıranın ID'sini al
  v_attacker_id := auth.uid();
  
  -- Saldıranın bilgilerini al
  select 
    f.id, ps.soldiers, ps.strength
  into 
    v_attacker_family_id, v_attacker_soldiers, v_attacker_strength
  from player_stats ps
  left join family_members fm on fm.player_id = ps.id
  left join families f on f.id = fm.family_id
  where ps.id = v_attacker_id;

  -- Kontroller
  if v_attacker_family_id is null then
    return json_build_object('success', false, 'message', 'Bir aileye üye değilsiniz.');
  end if;

  if v_attacker_family_id = p_target_family_id then
    return json_build_object('success', false, 'message', 'Kendi ailenize saldıramazsınız.');
  end if;

  if v_attacker_soldiers < p_attacking_soldiers then
    return json_build_object('success', false, 'message', 'Yetersiz asker.');
  end if;

  -- Hedef ailenin bilgilerini al
  select 
    mansion_defense, cash_treasury
  into 
    v_target_family_defense, v_target_family_treasury
  from families
  where id = p_target_family_id;

  if not found then
    return json_build_object('success', false, 'message', 'Hedef aile bulunamadı.');
  end if;

  -- Savaş Hesaplamaları
  v_attack_power := (p_attacking_soldiers * 2) + (v_attacker_strength * 0.1);
  v_defense_power := (coalesce(v_target_family_defense, 0) * 1.5) + (random() * 100);

  if v_attack_power > v_defense_power then
    -- KAZANILDI
    v_loot := floor(coalesce(v_target_family_treasury, 0) * (0.1 + (random() * 0.2))); -- %10-%30 arası ganimet
    v_lost_soldiers := floor(p_attacking_soldiers * 0.1 * random()); -- %0-%10 arası kayıp

    -- Hedef ailenin parasını düş
    update families
    set cash_treasury = greatest(0, cash_treasury - v_loot)
    where id = p_target_family_id;

    -- Saldıranın bilgilerini güncelle
    update player_stats
    set 
      cash = cash + v_loot,
      soldiers = soldiers - v_lost_soldiers,
      battles_won = battles_won + 1,
      total_earnings = total_earnings + v_loot
    where id = v_attacker_id;
    
    -- User soldiers tablosunu da güncelle
    update user_soldiers
    set soldiers = soldiers - v_lost_soldiers
    where user_id = v_attacker_id;

    v_result := json_build_object(
      'success', true, 
      'message', format('Saldırı Başarılı! %s $ ganimet ele geçirildi. %s asker kaybettiniz.', v_loot, v_lost_soldiers),
      'loot', v_loot
    );
  else
    -- KAYBEDİLDİ
    v_lost_soldiers := floor(p_attacking_soldiers * 0.4 * random()); -- %0-%40 arası kayıp

    -- Saldıranın bilgilerini güncelle
    update player_stats
    set 
      soldiers = soldiers - v_lost_soldiers,
      battles_lost = battles_lost + 1
    where id = v_attacker_id;
    
    -- User soldiers tablosunu da güncelle
    update user_soldiers
    set soldiers = soldiers - v_lost_soldiers
    where user_id = v_attacker_id;

    v_result := json_build_object(
      'success', false, 
      'message', format('Saldırı Başarısız! Savunma çok güçlüydü. %s asker kaybettiniz.', v_lost_soldiers)
    );
  end if;

  return v_result;
end;
$$;
