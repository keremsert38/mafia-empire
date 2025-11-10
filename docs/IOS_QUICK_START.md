# 🚀 iOS Yayınlama - Hızlı Başlangıç

## 📋 Ön Hazırlık (1 Gün)

### 1. Apple Developer Hesabı
```
✅ https://developer.apple.com/ → Kayıt ol
✅ $99/yıl ödeme yap
✅ Hesap onayını bekle (24 saat)
```

### 2. Expo Hesabı
```bash
# Expo CLI yükle
npm install -g eas-cli

# Expo'ya giriş yap
eas login
```

### 3. Proje Ayarları
```bash
# app.json'da güncelle:
# - owner: "your-expo-username" → Kendi kullanıcı adınız
# - bundleIdentifier: "com.mafiaempire.app" → Değiştirmeyin

# eas.json'da güncelle:
# - appleId: "your-apple-id@example.com" → Gerçek Apple ID'niz
```

---

## 🏗️ Build Yapma (2-3 Saat)

### Adım 1: EAS Build Konfigürasyonu
```bash
# Projeyi EAS için hazırla
eas build:configure

# iOS için credential'ları otomatik oluştur
eas credentials
```

### Adım 2: Development Build (Test için)
```bash
npm run build:ios:dev
```

### Adım 3: Production Build (App Store için)
```bash
npm run build:ios:production
```

Build süresi: 10-20 dakika
Build tamamlandığında link gelecek.

---

## 🍎 App Store Connect Kurulumu (2-3 Saat)

### Adım 1: Uygulama Oluştur
1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com/) → Giriş yap
2. **My Apps** → **"+"** → **New App**
3. Bilgileri doldur:
   ```
   Platform: iOS
   Name: Mafia Empire
   Primary Language: Turkish
   Bundle ID: com.mafiaempire.app (dropdown'dan seç)
   SKU: mafia-empire-2024
   ```

### Adım 2: In-App Purchase Ekle
1. **Features** → **In-App Purchases** → **"+"**
2. **Consumable** seç
3. 4 ürünü oluştur:

```
Product 1:
  Product ID: mafia_mt_100
  Price: Tier 1 ($0.99)
  Display Name: 100 MT Coin
  Description: 100 MT Coin ile imparatorluğunuzu hızlı inşa edin!

Product 2:
  Product ID: mafia_mt_500
  Price: Tier 5 ($4.99)
  Display Name: 500 MT Coin + 50 Bonus
  Description: 550 MT Coin ile suç imparatorluğunuzu hızla genişletin!

Product 3:
  Product ID: mafia_mt_1200
  Price: Tier 10 ($9.99)
  Display Name: 1200 MT Coin + 200 Bonus
  Description: 1400 MT Coin ile ultimate güç!

Product 4:
  Product ID: mafia_mt_2500
  Price: Tier 20 ($19.99)
  Display Name: 2500 MT Coin + 500 Bonus
  Description: 3000 MT Coin ile anında güçlen!
```

### Adım 3: Görselleri Hazırla
```
Gereken Görseller:
✅ App Icon: 1024x1024 px (PNG)
✅ iPhone Screenshots: En az 3 adet
   - iPhone 15 Pro Max: 1290 x 2796 px
   - iPhone 11 Pro Max: 1242 x 2688 px
✅ iPad Screenshots: En az 3 adet (opsiyonel ama önerilen)
   - iPad Pro 12.9": 2048 x 2732 px
```

### Adım 4: Açıklama ve Bilgiler
```
App Name: Mafia Empire
Subtitle: Build Your Criminal Empire
Category: Games > Strategy
Age Rating: 17+ (Realistic Violence)

Description:
🎭 Mafia Empire - Suç Dünyasının Patronu Ol!

Şehrin en güçlü mafya liderini inşa et! Suçlar işle, 
işletmeler aç, bölgeleri ele geçir ve imparatorluğunu büyüt.

[Detaylı açıklama için APP_STORE_SETUP.md dosyasına bakın]

Keywords:
mafia,crime,strategy,empire,gang,mob,tycoon,business,territory,family

Privacy Policy URL:
https://mafiaempire.app/privacy
(Bu sayfayı oluşturmanız gerekiyor!)
```

---

## 📤 Yayınlama (1 Gün)

### Adım 1: Build'i App Store'a Yükle
```bash
# EAS ile otomatik submit
npm run submit:ios

# Veya manuel olarak:
# 1. EAS Dashboard'dan .ipa dosyasını indirin
# 2. Transporter uygulaması ile yükleyin
```

### Adım 2: Build Seçimi
1. App Store Connect → **Mafia Empire** → **App Store** sekmesi
2. **Build** bölümünde **"+"** tıklayın
3. Yüklediğiniz build'i seçin

### Adım 3: Review İçin Gönder
1. Tüm alanların dolu olduğunu kontrol edin:
   - ✅ Screenshots
   - ✅ Description
   - ✅ In-App Purchases
   - ✅ Privacy Policy
   - ✅ Build seçildi

2. **Add for Review** butonuna tıklayın
3. **Submit for Review** butonuna tıklayın

### Adım 4: Review Bekle
```
Süre: 24-72 saat
Durum: App Store Connect'te takip edin

Durum Değişiklikleri:
- Waiting for Review (Beklemede)
- In Review (İnceleniyor)
- Ready for Sale (Yayında!) 🎉
- Rejected (Reddedildi - düzeltip tekrar gönderin)
```

---

## 🧪 Test Etme

### Sandbox Test Hesabı Oluştur
1. App Store Connect → **Users and Access** → **Sandbox Testers**
2. **"+"** → Test email adresi ekle
3. iPhone'da **Settings** → **App Store** → **Sandbox Account** ile giriş yap
4. Uygulamada MT Coins satın almayı dene (gerçek para çekilmez)

---

## ⚡ Hızlı Komutlar

```bash
# Development (Simulator'de test)
npm run ios

# Production Build (App Store için)
npm run build:ios:production

# App Store'a Gönder
npm run submit:ios

# Build durumunu kontrol et
eas build:list

# Build loglarını görüntüle
eas build:view [BUILD_ID]
```

---

## 🚨 Önemli Notlar

### ⚠️ Build Başarısız Olursa
```bash
# Cache'i temizle
rm -rf node_modules
npm install

# Tekrar dene
npm run build:ios:production
```

### ⚠️ In-App Purchase Test Edilemiyor
- Gerçek cihaz kullanın (simulator'de çalışmaz)
- Sandbox test hesabı ile giriş yaptığınızdan emin olun
- RevenueCat Products oluşturuldu mu kontrol edin

### ⚠️ Review Reddedilirse
Sık reddetme sebepleri:
- Eksik Privacy Policy
- Incomplete app (yetersiz özellik)
- Crash veya bug
- Metadata eksiklikleri

Çözüm: Geri bildirimleri okuyun, düzeltin, tekrar gönderin.

---

## 📚 Detaylı Dokümantasyon

Daha fazla detay için:
- **APP_STORE_SETUP.md** → Tam adım adım rehber
- [Expo EAS Docs](https://docs.expo.dev/build/introduction/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

---

## ✅ Kontrol Listesi

### Başlamadan Önce
- [ ] Apple Developer hesabı aktif
- [ ] Expo hesabı oluşturuldu
- [ ] `eas-cli` yüklendi
- [ ] `.env` dosyası oluşturuldu (RevenueCat API key)

### Build Öncesi
- [ ] `app.json` owner güncellendi
- [ ] `eas.json` Apple ID güncellendi
- [ ] Tüm dependencies yüklü (`npm install`)

### App Store Connect
- [ ] Uygulama oluşturuldu
- [ ] 4 In-App Purchase eklendi
- [ ] Icon ve screenshots hazırlandı
- [ ] Privacy Policy URL eklendi

### Yayın Öncesi
- [ ] Production build tamamlandı
- [ ] TestFlight'ta test edildi
- [ ] Tüm metadata dolduruldu
- [ ] Review için gönderildi

---

**Başarılar! 🚀 Sorularınız için APP_STORE_SETUP.md dosyasına bakın.**
