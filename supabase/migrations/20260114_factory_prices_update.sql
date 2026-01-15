-- =====================================================
-- FABRİKA FİYATLARI GÜNCELLEMESİ
-- =====================================================
-- Bu SQL'i Supabase'de çalıştır

-- Fabrika fiyatlarını güncelle (500K - 15M arası)
UPDATE businesses SET 
  build_cost = 500000,
  upgrade_cost = 0,
  max_level = 1
WHERE id = 'fab_sera';

UPDATE businesses SET 
  build_cost = 750000,
  upgrade_cost = 0,
  max_level = 1
WHERE id = 'fab_orman';

UPDATE businesses SET 
  build_cost = 1500000,
  upgrade_cost = 0,
  max_level = 1
WHERE id = 'fab_maden';

UPDATE businesses SET 
  build_cost = 2500000,
  upgrade_cost = 0,
  max_level = 1
WHERE id = 'fab_kimya';

UPDATE businesses SET 
  build_cost = 3000000,
  upgrade_cost = 0,
  max_level = 1
WHERE id = 'fab_marangoz';

UPDATE businesses SET 
  build_cost = 5000000,
  upgrade_cost = 0,
  max_level = 1
WHERE id = 'fab_demir';

UPDATE businesses SET 
  build_cost = 6000000,
  upgrade_cost = 0,
  max_level = 1
WHERE id = 'fab_ilac';

UPDATE businesses SET 
  build_cost = 8000000,
  upgrade_cost = 0,
  max_level = 1
WHERE id = 'fab_restoran';

UPDATE businesses SET 
  build_cost = 10000000,
  upgrade_cost = 0,
  max_level = 1
WHERE id = 'fab_hastane';

UPDATE businesses SET 
  build_cost = 15000000,
  upgrade_cost = 0,
  max_level = 1
WHERE id = 'fab_silah';

-- =====================================================
-- ÖZET (Yeni Fiyatlar):
-- Sera: 500K
-- Kereste Fabrikası: 750K
-- Demir Madeni: 1.5M
-- Kimya Fabrikası: 2.5M
-- Marangoz Atölyesi: 3M
-- Demir İşleme: 5M
-- İlaç Fabrikası: 6M
-- Lüks Restoran: 8M
-- Özel Hastane: 10M
-- Silah Fabrikası: 15M
-- =====================================================

SELECT id, name, build_cost, max_level FROM businesses WHERE id LIKE 'fab_%' ORDER BY build_cost;
