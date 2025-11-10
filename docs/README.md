# 📚 Mafia Empire - Dokümantasyon

## 🚀 Başlangıç

Bu klasör, Mafia Empire oyununun iOS App Store'a yayınlanması için gerekli tüm dokümantasyonu içerir.

## 📖 Dokümantasyon Dosyaları

### 1. 🏃‍♂️ [IOS_QUICK_START.md](./IOS_QUICK_START.md)
**Hızlı başlangıç rehberi** - iOS'a yayınlamak için gereken minimum adımlar.

**İçerik:**
- Ön hazırlık (Apple Developer hesabı, Expo kurulumu)
- Build yapma komutları
- App Store Connect temel kurulum
- Hızlı kontrol listesi

**Kime Göre:** Hızlıca yayınlamak isteyenler için

---

### 2. 📱 [APP_STORE_SETUP.md](./APP_STORE_SETUP.md)
**Detaylı App Store kurulum rehberi** - Her adımın ayrıntılı açıklaması.

**İçerik:**
- Apple Developer Console kurulumu
- App Store Connect tam konfigürasyonu
- In-App Purchase (IAP) detaylı kurulum
- Görseller ve metadata hazırlama
- RevenueCat entegrasyonu
- Test ve yayınlama süreci
- Sık karşılaşılan sorunlar ve çözümleri

**Kime Göre:** İlk kez iOS'a yayınlayanlar veya detaylı bilgi isteyenler için

---

### 3. 🔐 [PRIVACY_POLICY_TEMPLATE.md](./PRIVACY_POLICY_TEMPLATE.md)
**Gizlilik Politikası şablonu** - App Store için gerekli privacy policy.

**İçerik:**
- Hangi verilerin toplandığı
- Verilerin nasıl kullanıldığı
- Üçüncü taraf hizmetler
- Kullanıcı hakları
- İletişim bilgileri
- Türkçe ve İngilizce versiyonlar

**Önemli:** Bu template'i kendi bilgilerinizle güncelleyip web sitenizde yayınlamanız gerekiyor!

---

## 🔧 Proje Konfigürasyon Dosyaları

### Kök Dizinde:
- **`app.json`** - Expo uygulama konfigürasyonu (iOS bundleIdentifier burada)
- **`eas.json`** - EAS Build konfigürasyonu (build profilleri)
- **`.env.example`** - Environment variables şablonu
- **`.env`** - Gerçek API keys (Git'te yok, kendiniz oluşturun)

### Servisler:
- **`services/RevenueCatService.ts`** - RevenueCat entegrasyonu ve IAP yönetimi

---

## 📋 Yayınlama Kontrol Listesi

### ✅ Başlamadan Önce
- [ ] Apple Developer hesabı aktif ($99/yıl)
- [ ] Expo hesabı oluşturuldu
- [ ] `eas-cli` yüklendi: `npm install -g eas-cli`
- [ ] `.env` dosyası oluşturuldu ve API keys eklendi
- [ ] Privacy Policy web sitesinde yayında

### ✅ Proje Konfigürasyonu
- [ ] `app.json` → `owner` güncellendi
- [ ] `app.json` → `bundleIdentifier` doğru: `com.mafiaempire.app`
- [ ] `eas.json` → Apple ID güncellendi
- [ ] RevenueCat API key `.env` dosyasında

### ✅ App Store Connect
- [ ] Uygulama oluşturuldu (Mafia Empire)
- [ ] 4 In-App Purchase ürünü eklendi:
  - [ ] mafia_mt_100 ($0.99)
  - [ ] mafia_mt_500 ($4.99)
  - [ ] mafia_mt_1200 ($9.99)
  - [ ] mafia_mt_2500 ($19.99)
- [ ] App Icon (1024x1024) yüklendi
- [ ] Screenshots (en az 3 cihaz boyutu) yüklendi
- [ ] Description ve keywords eklendi
- [ ] Privacy Policy URL eklendi
- [ ] Age rating: 17+ seçildi

### ✅ RevenueCat
- [ ] Proje oluşturuldu
- [ ] Apple App Store bağlandı
- [ ] Products oluşturuldu (App Store ile eşleşen ID'ler)
- [ ] Shared Secret eklendi
- [ ] Webhook/Server notifications aktif

### ✅ Build ve Submit
- [ ] Development build test edildi
- [ ] Production build başarılı
- [ ] TestFlight'ta test edildi
- [ ] App Store'a submit edildi
- [ ] Review statusu takip ediliyor

---

## 🚀 Hızlı Komutlar

```bash
# Geliştirme
npm run dev              # Expo dev server başlat
npm run ios              # iOS simulator'de aç

# Build
npm run build:ios:dev          # Development build (test için)
npm run build:ios:production   # Production build (App Store için)

# Submit
npm run submit:ios       # App Store'a otomatik gönder

# EAS Yardımcı Komutlar
eas build:list           # Build listesi
eas build:view [ID]      # Build detayları
eas credentials          # iOS credentials yönetimi
```

---

## 🔗 Önemli Linkler

### Apple
- [Apple Developer Portal](https://developer.apple.com/)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

### Expo
- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [EAS Submit Docs](https://docs.expo.dev/submit/introduction/)
- [Expo Dashboard](https://expo.dev/)

### RevenueCat
- [RevenueCat Dashboard](https://app.revenuecat.com/)
- [iOS SDK Documentation](https://docs.revenuecat.com/docs/ios)
- [Product Setup Guide](https://docs.revenuecat.com/docs/ios-products)

### Store Yönetimi
- [Apple Transporter](https://apps.apple.com/app/transporter/id1450874784) (Manuel .ipa yükleme için)
- [TestFlight](https://testflight.apple.com/) (Beta test için)

---

## 🆘 Yardım

### Sorun mu yaşıyorsunuz?

1. **Build başarısız oluyor:**
   - `APP_STORE_SETUP.md` → "Sık Karşılaşılan Sorunlar" bölümüne bakın
   - EAS build loglarını kontrol edin: `eas build:view [BUILD_ID]`

2. **In-App Purchase çalışmıyor:**
   - Sandbox test hesabı kullanıyor musunuz?
   - Product ID'ler RevenueCat, App Store ve kodda aynı mı?
   - Gerçek cihazda test ediyorsunuz değil mi? (Simulator'de çalışmaz)

3. **App Store review reddedildi:**
   - Reddetme sebebini okuyun
   - `APP_STORE_SETUP.md` → "Sık Karşılaşılan Sorunlar" kontrol edin
   - Düzeltip tekrar gönderin

4. **Privacy Policy hatası:**
   - `PRIVACY_POLICY_TEMPLATE.md` kullanarak bir policy oluşturun
   - Web sitenizde yayınlayın
   - URL'yi App Store Connect'e ekleyin

---

## 📞 İletişim ve Destek

### Teknik Dokümantasyon
- Bu klasördeki markdown dosyaları
- Expo ve RevenueCat resmi dokümantasyonları
- Apple Developer dokümantasyonu

### Topluluk Desteği
- [Expo Discord](https://discord.gg/expo)
- [RevenueCat Slack](https://www.revenuecat.com/slack)
- [Apple Developer Forums](https://developer.apple.com/forums/)

---

## 🔄 Güncelleme Notları

### Version 1.0.0 (İlk Sürüm)
- ✅ iOS build konfigürasyonu
- ✅ RevenueCat entegrasyonu
- ✅ In-App Purchase (4 MT Coins paketi)
- ✅ Tam dokümantasyon

### Planlanan Güncellemeler
- Android yayınlama rehberi
- CI/CD otomasyonu (GitHub Actions)
- Analytics entegrasyonu
- Push notification kurulumu

---

**Son Güncelleme:** [BUGÜNÜN TARİHİ]  
**Hazırlayan:** Mafia Empire Development Team  
**Versiyon:** 1.0.0

**İyi şanslar! 🚀 App Store'da başarılar! 👑**
