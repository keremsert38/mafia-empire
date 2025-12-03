/*
  # Duplicate Aile Üyelerini Düzelt
  
  Bu migration duplicate key hatasını güvenli şekilde düzeltir
*/

-- Duplicate kayıtları bul ve temizle
DELETE FROM family_members 
WHERE id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY id) as rn
        FROM family_members
        WHERE player_id IS NOT NULL
    ) t WHERE rn > 1
);

-- Mevcut aile üyeliğini kontrol et için view oluştur
CREATE OR REPLACE VIEW check_family_membership AS
SELECT 
    player_id,
    COUNT(*) as family_count,
    STRING_AGG(family_id::text, ', ') as family_ids
FROM family_members 
WHERE player_id IS NOT NULL
GROUP BY player_id
HAVING COUNT(*) > 1;

-- Log
SELECT 'Duplicate family members fixed successfully' as message;

-- Duplicate kontrolü için sonuçları göster
SELECT * FROM check_family_membership;
