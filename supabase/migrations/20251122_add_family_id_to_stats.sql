-- 1. player_stats tablosuna family_id kolonu ekle
alter table player_stats 
add column if not exists family_id uuid references families(id);

-- 2. Mevcut verileri senkronize et (family_members tablosundan)
update player_stats ps
set family_id = fm.family_id
from family_members fm
where ps.id = fm.player_id;

-- 3. Trigger Fonksiyonu: family_members tablosunda değişiklik olduğunda player_stats'ı güncelle
create or replace function sync_player_family_status()
returns trigger
language plpgsql
security definer
as $$
begin
  if (TG_OP = 'INSERT') then
    -- Yeni üye eklendiğinde player_stats'ı güncelle
    update player_stats
    set family_id = NEW.family_id
    where id = NEW.player_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    -- Üye ayrıldığında player_stats'ı güncelle (NULL yap)
    update player_stats
    set family_id = NULL
    where id = OLD.player_id;
    return OLD;
  end if;
  return NULL;
end;
$$;

-- 4. Trigger'ı oluştur
drop trigger if exists on_family_member_change on family_members;

create trigger on_family_member_change
after insert or delete on family_members
for each row
execute function sync_player_family_status();
