# 💰 RevenueCat Fiyat Sorunu Çözümü

## ❌ Sorun
Tüm paketler $0.99 gösteriyor (veya aynı fiyat).

## 🔍 Sorunun Sebebi

RevenueCat fiyatları 2 yerden alır:
1. **RevenueCat Dashboard'daki Product tanımı**
2. **App Store Connect / Google Play'deki gerçek fiyat**

Eğer fiyatlar yanlış görünüyorsa, **RevenueCat Dashboard'da fiyatlar doğru girilmemiştir**.

---

## ✅ Çözüm Adımları

### Adım 1: Console'u Kontrol Et

Uygulamayı açın ve Shop sayfasına gidin. Console'da şu logları göreceksiniz:

```
📦 RAW PACKAGES from RevenueCat: [...]
🔍 Processing: mafia_mt_100
  - Product price string: $0.99  <-- Bu gerçek fiyat
  - Product price: 0.99
  - Mapping: {...}
✅ Final package: {...}
```

**Önemli:** `Product price string` değeri gerçek fiyatı gösterir.

---

### Adım 2: RevenueCat Dashboard'da Fiyatları Kontrol Et

1. [RevenueCat Dashboard](https://app.revenuecat.com) → Login
2. Sol menü → **Products**
3. Her ürünü tek tek kontrol edin:

#### mafia_mt_100
- **App Store Product ID:** `mafia_mt_100`
- **Fiyat:** $0.99 ✅

#### mafia_mt_500
- **App Store Product ID:** `mafia_mt_500`
- **Fiyat:** $4.99 ✅

#### mafia_mt_1200
- **App Store Product ID:** `mafia_mt_1200`
- **Fiyat:** $9.99 ✅

#### mafia_mt_2500
- **App Store Product ID:** `mafia_mt_2500`
- **Fiyat:** $19.99 ✅

---

### Adım 3: App Store Connect'te Fiyatları Ayarla

RevenueCat, fiyatları **App Store Connect'ten** çeker.

#### iOS İçin:

1. [App Store Connect](https://appstoreconnect.apple.com) → Login
2. **My Apps** → Uygulamanız
3. **In-App Purchases** → Her ürünü düzenle
4. **Pricing and Availability**
5. Doğru fiyatı seçin:
   - mafia_mt_100 → $0.99 (Tier 1)
   - mafia_mt_500 → $4.99 (Tier 5)
   - mafia_mt_1200 → $9.99 (Tier 10)
   - mafia_mt_2500 → $19.99 (Tier 20)

#### Android İçin:

1. [Google Play Console](https://play.google.com/console) → Login
2. **Monetization** → **In-app products**
3. Her ürünü düzenle
4. Fiyatları ayarla

---

### Adım 4: RevenueCat'te Senkronize Et

1. RevenueCat Dashboard → **Products**
2. Her ürünün yanındaki **Sync** butonuna tıklayın
3. Fiyatların güncellendiğini doğrulayın

---

### Adım 5: Test Et

1. Uygulamayı kapat
2. `npx expo start --clear` ile yeniden başlat
3. Shop sayfasına git
4. Console'da fiyatları kontrol et:

```bash
🛒 SHOP - Loaded packages: [...]
📦 mafia_mt_100: $0.99 (100 MT)
📦 mafia_mt_500: $4.99 (500 MT)
📦 mafia_mt_1200: $9.99 (1200 MT)
📦 mafia_mt_2500: $19.99 (2500 MT)
```

---

## 🧪 Test Modu Notu

**ÖNEMLİ:** RevenueCat test modunda, bazı cihazlarda tüm ürünler **$0.99** gözükebilir. Bu normaldir!

**Gerçek fiyatları görmek için:**
1. Production build yapın
2. TestFlight'ta test edin
3. Veya gerçek cihazda production modda test edin

---

## 📊 Kod İçinde Fiyat Kontrolü

`RevenueCatService.ts` dosyasında debug logları eklendi:

```typescript
console.log(`🔍 Processing: ${productId}`);
console.log(`  - Product price string: ${pkg.product.priceString}`);
console.log(`  - Product price: ${pkg.product.price}`);
```

Bu loglar şunu gösterir:
- ❌ Eğer hepsi $0.99 ise → App Store Connect'te fiyatlar yanlış
- ✅ Eğer farklı fiyatlar varsa → Kod çalışıyor, sorun yok

---

## 🎨 Yeni Modern Tasarım

Shop sayfası artık:
- ✅ 2x2 kompakt grid
- ✅ Modern kartlar
- ✅ Popular badge (altın yıldız)
- ✅ Bonus gösterimi (yeşil tag)
- ✅ Touch feedback
- ✅ Loading state

---

## 🚀 Production Checklist

Canlıya almadan önce:

- [ ] App Store Connect'te tüm fiyatlar doğru ayarlandı
- [ ] Google Play Console'da tüm fiyatlar doğru ayarlandı
- [ ] RevenueCat'te tüm ürünler sync edildi
- [ ] Test satın alımı başarılı
- [ ] MT Coins bakiyesi doğru arttı
- [ ] Gerçek cihazda fiyatlar doğru görünüyor

---

**Başarılar! 💰**
