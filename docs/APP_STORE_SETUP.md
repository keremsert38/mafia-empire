# 🍎 iOS App Store Yayınlama Rehberi

## 📋 Gereksinimler

### 1. Apple Developer Hesabı
- **Apple Developer Program** üyeliği ($99/yıl)
- [developer.apple.com](https://developer.apple.com/) adresinden kayıt olun
- Ödeme bilgilerinizi ekleyin ve hesabınızı aktif edin

### 2. Gerekli Bilgiler
- ✅ Apple ID (Apple Developer hesabınıza bağlı)
- ✅ Team ID (Apple Developer hesabınızdan alınır)
- ✅ Bundle Identifier: `com.mafiaempire.app`
- ✅ App Name: `Mafia Empire`
- ✅ Expo Account (ücretsiz oluşturabilirsiniz)

---

## 🚀 Adım 1: Apple Developer Console Kurulumu

### 1.1. App ID Oluşturma
1. [developer.apple.com/account](https://developer.apple.com/account) adresine gidin
2. **Certificates, IDs & Profiles** tıklayın
3. **Identifiers** > **"+"** butonuna tıklayın
4. **App IDs** seçin, devam edin
5. Bilgileri girin:
   ```
   Platform: iOS
   Description: Mafia Empire Game
   Bundle ID: Explicit
   Bundle ID String: com.mafiaempire.app
   ```
6. **Capabilities** bölümünde şunları seçin:
   - [x] In-App Purchase
   - [x] Push Notifications (ileride için)
7. **Continue** > **Register** butonuna tıklayın

### 1.2. Provisioning Profile Oluşturma
1. **Profiles** > **"+"** butonuna tıklayın
2. **Distribution** > **App Store** seçin
3. App ID'nizi seçin (`com.mafiaempire.app`)
4. Certificate'ınızı seçin (yoksa önce oluşturun)
5. Profile Name: `Mafia Empire App Store`
6. **Generate** butonuna tıklayın

---

## 📱 Adım 2: App Store Connect Kurulumu

### 2.1. Yeni Uygulama Oluşturma
1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com/) adresine gidin
2. **My Apps** > **"+"** > **New App** tıklayın
3. Bilgileri doldurun:
   ```
   Platform: iOS
   Name: Mafia Empire
   Primary Language: Turkish
   Bundle ID: com.mafiaempire.app
   SKU: mafia-empire-2024
   User Access: Full Access
   ```
4. **Create** butonuna tıklayın

### 2.2. App Bilgilerini Doldurma

#### **Genel Bilgiler (General Information)**
```
App Name: Mafia Empire
Subtitle: Build Your Criminal Empire
Privacy Policy URL: https://mafiaempire.app/privacy
Category: Games > Strategy
Secondary Category: Games > Role Playing
Content Rights: Contains Third-Party Content
Age Rating: 17+ (Frequent/Intense Realistic Violence)
```

#### **Version Information (Versiyon Bilgileri)**
```
Version: 1.0.0
Copyright: 2024 Your Company Name
```

#### **What's New in This Version**
```
🎮 İlk Sürüm Özellikleri:
• Suç yaparak para kazan
• İşletmeler satın al ve yönet
• Bölgeleri ele geçir
• Ailen ile güç kazan
• Soldato kirala ve imparatorluğunu koru
• MT Coins ile hızlı ilerleme
```

#### **Description**
```
🎭 Mafia Empire - Suç Dünyasının Patronu Ol!

Şehrin en güçlü mafya liderini inşa et! Suçlar işle, işletmeler aç, bölgeleri ele geçir ve imparatorluğunu büyüt.

🔫 ÖZELLİKLER:

💰 SUÇ İŞLE
• Farklı suç türlerinden birini seç
• Risk ve ödül dengesi kur
• Deneyim kazan ve seviye atla

🏢 İŞLETME YÖNETİMİ
• Casino, otel, kulüp ve daha fazlası
• Saatlik gelir elde et
• İşletmelerini yükselt

🗺️ BÖLGE ELE GEÇİR
• Şehir haritasında bölgeleri kontrol et
• Rakiplere saldır ve savun
• Stratejik güç dağılımı yap

👥 AİLE SİSTEMİ
• Güçlü ailelerle ittifak kur
• Birlikte büyü ve güçlen
• Aile bonusları kazan

⚡ MT COINS
• Premium para birimi
• Anında inşaat tamamlama
• Özel avantajlar

🎯 STRATEJI VE AKSİYON
Gerçek zamanlı strateji oyunu deneyimi! Her kararın imparatorluğunu etkiler.

📈 SÜREKLI GÜNCELLEMELER
• Yeni özellikler
• Yeni suç türleri
• Etkinlikler ve yarışmalar

Hemen indir ve suç dünyasının patronu ol! 👑
```

#### **Keywords**
```
mafia,crime,strategy,empire,gang,mob,tycoon,business,territory,family
```

#### **Support URL**
```
https://mafiaempire.app/support
```

#### **Marketing URL (Optional)**
```
https://mafiaempire.app
```

---

## 💳 Adım 3: In-App Purchase (IAP) Kurulumu

### 3.1. In-App Purchase Oluşturma
1. App Store Connect'te uygulamanızı açın
2. Sol menüden **Features** tıklayın
3. **In-App Purchases** tıklayın
4. **"+"** butonuna tıklayın

### 3.2. Ürün Tipleri
**Consumable** (Tüketilebilir) seçin - MT Coins için

### 3.3. Her Ürün İçin Bilgiler

#### **Ürün 1: 100 MT Coins**
```
Reference Name: 100 MT Coins
Product ID: mafia_mt_100
Type: Consumable

Price Schedule:
  Base Price: Tier 1 ($0.99)
  Start Date: Immediate

Display Name (Turkish): 100 MT Coin
Description (Turkish): 100 MT Coin ile imparatorluğunuzu hızlı inşa edin!

Display Name (English): 100 MT Coins
Description (English): Get 100 MT Coins to speed up your empire building!

Review Notes: Premium in-game currency used for speeding up construction and upgrades.
Screenshot: (Optional but recommended)
```

#### **Ürün 2: 500 MT Coins + 50 Bonus**
```
Reference Name: 500 MT Coins Pack
Product ID: mafia_mt_500
Type: Consumable

Price Schedule:
  Base Price: Tier 5 ($4.99)
  Start Date: Immediate

Display Name (Turkish): 500 MT Coin + 50 Bonus
Description (Turkish): 550 MT Coin ile suç imparatorluğunuzu hızla genişletin!

Display Name (English): 500 MT Coins + 50 Bonus
Description (English): Receive 550 MT Coins! Perfect for expanding your empire faster.

Review Notes: Premium currency pack with bonus coins for better value.
```

#### **Ürün 3: 1200 MT Coins + 200 Bonus (POPÜLER)**
```
Reference Name: 1200 MT Coins Mega Pack
Product ID: mafia_mt_1200
Type: Consumable

Price Schedule:
  Base Price: Tier 10 ($9.99)
  Start Date: Immediate

Display Name (Turkish): 1200 MT Coin + 200 Bonus
Description (Turkish): 1400 MT Coin ile ultimate güç! En popüler paket.

Display Name (English): 1200 MT Coins + 200 Bonus
Description (English): Ultimate starter pack with 1400 MT Coins! Our most popular package.

Review Notes: Best value pack - most popular choice among players.
Promotional Badge: "Most Popular"
```

#### **Ürün 4: 2500 MT Coins + 500 Bonus**
```
Reference Name: 2500 MT Coins Ultimate Pack
Product ID: mafia_mt_2500
Type: Consumable

Price Schedule:
  Base Price: Tier 20 ($19.99)
  Start Date: Immediate

Display Name (Turkish): 2500 MT Coin + 500 Bonus
Description (Turkish): 3000 MT Coin ile anında güçlen! Mega paket.

Display Name (English): 2500 MT Coins + 500 Bonus
Description (English): Mega pack with 3000 MT Coins! Become the most powerful boss instantly.

Review Notes: Premium mega pack for serious players who want maximum progress.
```

### 3.4. Tax Category
Tüm ürünler için: **Digital Goods and Services**

### 3.5. Availability
Tüm ürünler için: **All territories**

---

## 🖼️ Adım 4: App Store Görselleri Hazırlama

### 4.1. Gerekli Görseller

#### **App Icon**
```
Size: 1024x1024 px
Format: PNG (no alpha channel)
File: icon.png
İçerik: Mafia temalı logo (taç, silah, veya şehir silueti)
```

#### **Screenshots (iPhone 6.7" - iPhone 15 Pro Max)**
```
Size: 1290 x 2796 px (portrait)
Sayı: 3-10 adet
Format: PNG or JPG

Önerilen Ekran Görüntüleri:
1. Ana sayfa (XP, para, enerji gösterimi)
2. İşletmeler sayfası (business listesi)
3. Bölgeler haritası (territory map)
4. Suç yapma ekranı (crime modal)
5. Shop sayfası (MT Coins paketleri)
6. Aile sistemi (family screen)
```

#### **Screenshots (iPhone 6.5" - iPhone 11 Pro Max)**
```
Size: 1242 x 2688 px (portrait)
Aynı ekranlar
```

#### **Screenshots (iPad Pro 12.9")**
```
Size: 2048 x 2732 px (portrait)
Aynı ekranlar (tablet versiyonu)
```

### 4.2. App Preview Video (Opsiyonel)
```
Duration: 15-30 saniye
Size: 1920x1080 px (landscape) veya 1080x1920 px (portrait)
Format: MOV, M4V, veya MP4
Content: Oynanış videosu, özellik gösterimi
```

---

## 🔐 Adım 5: App Privacy (Gizlilik)

### 5.1. Privacy Policy URL
```
URL: https://mafiaempire.app/privacy-policy
(Bu sayfayı oluşturmanız gerekiyor)
```

### 5.2. Data Collection
App Store Connect'te **App Privacy** bölümünden:

```
✅ Do you or your third-party partners collect data from this app?
   YES

Data Types Collected:
□ Contact Info
  □ Name
  ☑ Email Address (for account)
  
□ Identifiers
  ☑ User ID (for game progress)
  ☑ Device ID (for analytics)

□ Purchases
  ☑ Purchase History (for MT Coins)

□ Usage Data
  ☑ Product Interaction (for game analytics)
  ☑ Advertising Data (if you use ads)

□ Diagnostics
  ☑ Crash Data
  ☑ Performance Data

Data Usage:
☑ App Functionality
☑ Analytics
☑ Product Personalization
□ Third-Party Advertising
```

---

## 🏗️ Adım 6: Expo EAS Build Yapma

### 6.1. Expo Account Setup
```bash
# Expo CLI yükle
npm install -g eas-cli

# Expo'ya login ol
eas login

# Projeyi başlat
eas build:configure
```

### 6.2. app.json Güncelle
Zaten güncellenmiş durumda, kontrol edin:
```json
{
  "expo": {
    "name": "Mafia Empire",
    "slug": "mafia-empire",
    "version": "1.0.0",
    "owner": "your-expo-username",
    "ios": {
      "bundleIdentifier": "com.mafiaempire.app",
      "buildNumber": "1"
    }
  }
}
```

### 6.3. iOS Build Komutları
```bash
# Development build (test için)
eas build --platform ios --profile development

# Production build (App Store için)
eas build --platform ios --profile production

# Build durumunu kontrol et
eas build:list
```

### 6.4. Build Tamamlandığında
1. EAS Dashboard'dan `.ipa` dosyasını indirin
2. Veya otomatik olarak App Store Connect'e submit edin:
```bash
eas submit --platform ios
```

---

## 📤 Adım 7: App Store'a Submit Etme

### 7.1. TestFlight ile Test (Önerilen)
1. Build tamamlandığında **TestFlight** sekmesine gidin
2. **Internal Testing** grubu oluşturun
3. Test kullanıcıları ekleyin (kendiniz dahil)
4. Uygulamayı test edin
5. Geri bildirimleri toplayın

### 7.2. App Store Review Gönderme
1. App Store Connect'te **App Store** sekmesine gidin
2. **Version 1.0.0** seçin
3. Tüm bilgilerin dolu olduğundan emin olun:
   - ✅ Görseller yüklendi
   - ✅ Açıklama yazıldı
   - ✅ In-App Purchases eklendi
   - ✅ Privacy Policy URL eklendi
   - ✅ Build seçildi

4. **App Store Version Information** bölümünde:
   ```
   Release Method: Manually release this version
   (veya)
   Release Method: Automatically release this version
   ```

5. **Rating** bilgilerini doldurun:
   ```
   Age Rating: 17+
   Realistic Violence: Frequent/Intense
   ```

6. **Export Compliance** soruları:
   ```
   Does your app use encryption? NO
   (eğer sadece HTTPS kullanıyorsanız)
   ```

7. **Add for Review** butonuna tıklayın
8. **Submit for Review** butonuna tıklayın

### 7.3. Review Süresi
- Normal: 24-48 saat
- İlk gönderim: 3-5 gün olabilir
- Reddedilirse düzeltip yeniden gönderin

---

## 💰 Adım 8: In-App Purchase Test Etme

### 8.1. Sandbox Test Account Oluşturma
1. App Store Connect > **Users and Access** > **Sandbox Testers**
2. **"+"** butonuna tıklayın
3. Yeni bir Apple ID email adresi girin (gerçek olmamalı):
   ```
   Email: test+sandbox@yourdomain.com
   Password: YourStrongPassword123!
   First Name: Test
   Last Name: User
   Country: Turkey
   ```
4. **Create** butonuna tıklayın

### 8.2. iOS Cihazda Test
1. iPhone'unuzda **Settings** > **App Store** > **Sandbox Account** açın
2. Test Apple ID ile giriş yapın
3. Uygulamayı çalıştırın
4. MT Coins satın almayı deneyin
5. Ödeme popup'ı gelecek: **[Sandbox] Buy for $0.99**
6. Test hesabı şifresini girin
7. Satın alma tamamlanır ama gerçek para çekilmez

---

## 🎯 Adım 9: RevenueCat Entegrasyonu

### 9.1. RevenueCat'te Apple ID Bağlama
1. RevenueCat Dashboard > **App Settings**
2. **Apple App Store** seçin
3. Bilgileri girin:
   ```
   App Name: Mafia Empire
   Bundle ID: com.mafiaempire.app
   Shared Secret: (App Store Connect'ten alın)
   ```

### 9.2. Shared Secret Alma
1. App Store Connect > **My Apps** > **Mafia Empire**
2. **App Information** sekmesi
3. **App Store Connect API** bölümünde **Generate** tıklayın
4. Shared Secret'i kopyalayın
5. RevenueCat'e yapıştırın

### 9.3. Server-to-Server Notifications (Önemli!)
1. App Store Connect > **App Information**
2. **App Store Server Notifications**
3. RevenueCat'ten aldığınız webhook URL'yi ekleyin:
   ```
   https://api.revenuecat.com/v1/subscribers/app_store_server_notification
   ```

---

## 📋 Kontrol Listesi (Launch Öncesi)

### Teknik
- [ ] Bundle ID doğru: `com.mafiaempire.app`
- [ ] Version: 1.0.0, Build: 1
- [ ] Icon 1024x1024 yüklendi
- [ ] Screenshots (3 cihaz boyutu) yüklendi
- [ ] Tüm In-App Purchases oluşturuldu ve Ready to Submit
- [ ] Privacy Policy URL aktif ve çalışıyor
- [ ] TestFlight ile test edildi

### App Store Connect
- [ ] App adı: Mafia Empire
- [ ] Açıklama ve keywords eklendi
- [ ] Age rating: 17+
- [ ] Export compliance: Uygun seçenek işaretlendi
- [ ] Build seçildi
- [ ] Release method seçildi

### RevenueCat
- [ ] Products oluşturuldu (4 adet)
- [ ] Apple App Store bağlandı
- [ ] Shared Secret eklendi
- [ ] Server notifications aktif

### Test
- [ ] Sandbox hesabı ile IAP test edildi
- [ ] Tüm ekranlar test edildi
- [ ] Crash yok
- [ ] Login/signup çalışıyor

---

## 🚨 Sık Karşılaşılan Sorunlar

### 1. "Invalid Bundle ID"
**Çözüm:** Apple Developer Console'da App ID oluşturduğunuzdan emin olun

### 2. "In-App Purchase Review Failed"
**Çözüm:** 
- Screenshot ekleyin
- Review notes'a açıklama yazın
- Sandbox hesabı ile test edilebilir olduğundan emin olun

### 3. "Missing Privacy Policy"
**Çözüm:** Gerçek bir privacy policy URL'i eklemelisiniz

### 4. "Binary Rejected - Performance Issues"
**Çözüm:**
- Crash olmadığından emin olun
- Memory leak kontrol edin
- TestFlight ile önce test edin

### 5. "Guideline 4.2 - Design - Minimum Functionality"
**Çözüm:**
- Daha fazla feature ekleyin
- UI/UX'i geliştirin
- App description'ı detaylandırın

---

## 📞 Destek ve Kaynaklar

### Apple Dokümantasyon
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [In-App Purchase Guide](https://developer.apple.com/in-app-purchase/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)

### RevenueCat Dokümantasyon
- [iOS SDK Documentation](https://docs.revenuecat.com/docs/ios)
- [In-App Purchase Setup](https://docs.revenuecat.com/docs/ios-products)

### Expo Dokümantasyon
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)

---

## 🎉 Başarılı Yayın Sonrası

### 1. İlk Günler
- [ ] Store listing'i optimize edin
- [ ] Kullanıcı geri bildirimlerini takip edin
- [ ] Crash reports kontrol edin (Sentry, Crashlytics)
- [ ] Analytics izleyin (RevenueCat, Mixpanel)

### 2. Güncelleme Döngüsü
- [ ] Bug fix'ler: Hemen
- [ ] Küçük feature'lar: 2 hafta
- [ ] Büyük güncellemeler: 1-2 ay

### 3. Monetization Optimizasyonu
- [ ] Conversion rate izleyin
- [ ] Fiyat testleri yapın (A/B test)
- [ ] Promosyon kampanyaları düzenleyin

---

**İyi şanslar! 🚀 Mafia Empire App Store'da başarılı olsun! 👑**
