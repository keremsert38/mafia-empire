# 🔧 İşletme Yükseltme Hatası Düzeltme Rehberi

## ❌ Sorun
İşletme yükseltme hatası:
```
record "v_user_business" has no field "upgrade_cost"
```

## ✅ Çözüm
`user_businesses` tablosunda `upgrade_cost` alanı yok. Bu alan `businesses` tablosunda. SQL fonksiyonu düzeltildi.

---

## 📋 Adım 1: Supabase Dashboard'a Git

1. [supabase.com](https://supabase.com/dashboard) adresine gidin
2. Projenizi açın
3. Sol menüden **SQL Editor** seçin

---

## 📋 Adım 2: SQL Kodunu Çalıştır

Aşağıdaki SQL kodunu **SQL Editor**'e yapıştırın ve **RUN** butonuna tıklayın:

```sql
-- rpc_upgrade_business fonksiyonunu düzelt
CREATE OR REPLACE FUNCTION rpc_upgrade_business(
  p_business_id text
)
RETURNS TABLE(success boolean, message text) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_business record;
  v_business record;
  v_user_cash numeric;
  v_current_upgrade_cost numeric;
BEGIN
  -- Kullanıcının işletmesini al
  SELECT * INTO v_user_business
  FROM user_businesses
  WHERE user_id = v_user_id AND business_id = p_business_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'İşletme bulunamadı!';
    RETURN;
  END IF;

  -- İşletme bilgilerini al
  SELECT * INTO v_business
  FROM businesses
  WHERE id = p_business_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'İşletme bilgisi bulunamadı!';
    RETURN;
  END IF;

  IF v_user_business.is_building THEN
    RETURN QUERY SELECT false, 'İşletme henüz inşa ediliyor!';
    RETURN;
  END IF;

  IF v_user_business.is_upgrading THEN
    RETURN QUERY SELECT false, 'İşletme zaten geliştiriliyor!';
    RETURN;
  END IF;

  IF v_user_business.level >= v_business.max_level THEN
    RETURN QUERY SELECT false, 'İşletme maksimum seviyeye ulaştı!';
    RETURN;
  END IF;

  -- Kullanıcının parasını kontrol et
  SELECT cash INTO v_user_cash FROM player_stats WHERE id = v_user_id;
  
  -- Mevcut seviye için upgrade maliyetini hesapla
  -- Her seviye için maliyet 1.5x artar
  v_current_upgrade_cost := v_business.upgrade_cost * POWER(1.5, v_user_business.level - 1);
  
  IF v_user_cash < v_current_upgrade_cost THEN
    RETURN QUERY SELECT false, format('Yetersiz para! Gerekli: $%s', v_current_upgrade_cost::text);
    RETURN;
  END IF;

  -- Geliştirmeyi başlat
  UPDATE user_businesses 
  SET is_upgrading = true, upgrade_start_time = now()
  WHERE user_id = v_user_id AND business_id = p_business_id;

  -- Parayı düş
  UPDATE player_stats SET cash = cash - v_current_upgrade_cost WHERE id = v_user_id;

  RETURN QUERY SELECT true, format('İşletme geliştirmesi başlatıldı! Maliyet: $%s', v_current_upgrade_cost::text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- rpc_complete_upgrade fonksiyonunu da düzelt
CREATE OR REPLACE FUNCTION rpc_complete_upgrade(
  p_business_id text
)
RETURNS TABLE(success boolean, message text) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_business record;
  v_business record;
  v_new_income numeric;
  v_new_level integer;
BEGIN
  -- Kullanıcının işletmesini al
  SELECT * INTO v_user_business
  FROM user_businesses
  WHERE user_id = v_user_id AND business_id = p_business_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'İşletme bulunamadı!';
    RETURN;
  END IF;

  IF NOT v_user_business.is_upgrading THEN
    RETURN QUERY SELECT false, 'İşletme geliştirilmiyor!';
    RETURN;
  END IF;

  -- İşletme bilgilerini al
  SELECT * INTO v_business
  FROM businesses
  WHERE id = p_business_id;

  -- Yeni seviye
  v_new_level := v_user_business.level + 1;
  
  -- Yeni geliri hesapla (her seviye %20 artış)
  v_new_income := v_business.base_income * (1 + (v_new_level - 1) * 0.2);

  -- Geliştirmeyi tamamla
  UPDATE user_businesses 
  SET is_upgrading = false, 
      upgrade_start_time = NULL,
      level = v_new_level,
      current_income = v_new_income
  WHERE user_id = v_user_id AND business_id = p_business_id;

  RETURN QUERY SELECT true, format('İşletme %s. seviyeye yükseltildi! Yeni gelir: $%s/saat', v_new_level::text, v_new_income::text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Başarı mesajı
SELECT 'Upgrade cost fix applied successfully! ✅' as message;
```

---

## 📋 Adım 3: Başarıyı Kontrol Et

SQL çalıştıktan sonra, en altta şu mesajı göreceksiniz:
```
Upgrade cost fix applied successfully! ✅
```

---

## 🔄 Adım 4: Uygulamayı Yeniden Başlat

1. Metro bundler'ı durdurun (Ctrl+C)
2. Cache'i temizleyin:
   ```bash
   npx expo start --clear
   ```
3. Uygulamayı tekrar açın

---

## ✅ Test Et

1. Bir işletme satın alın
2. İşletmeyi yükseltmeyi deneyin
3. Artık çalışmalı! 🎉

---

## 🔍 Değişiklikler

### Önceki Kod (Hatalı):
```sql
IF v_user_cash < v_user_business.upgrade_cost THEN  -- ❌ HATALI
```

### Yeni Kod (Düzeltilmiş):
```sql
v_current_upgrade_cost := v_business.upgrade_cost * POWER(1.5, v_user_business.level - 1);
IF v_user_cash < v_current_upgrade_cost THEN  -- ✅ DOĞRU
```

---

## 💡 Açıklama

- `upgrade_cost` alanı `businesses` tablosunda (sabit değer)
- `user_businesses` tablosunda bu alan YOK
- Her seviye için maliyet dinamik hesaplanıyor: `base_cost * 1.5^(level-1)`
- Gelir artışı: Her seviye %20 artış

---

## 🚨 Sorun Devam Ederse

1. Supabase Dashboard > Database > Functions bölümünden `rpc_upgrade_business` fonksiyonunu kontrol edin
2. Fonksiyonun doğru güncellendiğinden emin olun
3. Uygulamayı tamamen kapatıp açın
4. Cache'i temizleyin: `npx expo start --clear`

---

**Başarılar! 🚀**
