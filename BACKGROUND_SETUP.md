# 🏙️ Şehir Arka Plan Fotoğrafı Kurulumu

## 📸 Fotoğraf Ekleme

Şehir arka plan fotoğrafını eklemek için:

1. **Fotoğrafı İndirin:** Verdiğiniz karanlık şehir fotoğrafını bilgisayarınıza kaydedin

2. **Dosya Konumu:** Fotoğrafı şu konuma kaydedin:
   ```
   project/assets/images/city-background.jpg
   ```

3. **Fotoğraf Özellikleri:**
   - **Format:** JPG veya PNG
   - **Boyut:** 1920x1080 veya daha yüksek çözünürlük
   - **Kalite:** Yüksek çözünürlük önerilir

## 🎨 Arka Plan Özellikleri

### **Görsel Efektler:**
- **Şeffaflık:** Fotoğraf %40 şeffaflık ile gösterilir
- **Overlay:** Karanlık overlay (%30) text okunabilirliğini artırır
- **Kapsamlı:** Tüm ekranlarda (Ana, Bölgeler, İşletmeler, Aile, Ayarlar) görünür

### **Şeffaf UI Elementleri:**
- **Header'lar:** %90 şeffaflık
- **Kartlar:** %90 şeffaflık  
- **Tab Bar:** %90 şeffaflık
- **XP Bar:** %90 şeffaflık

## 🔧 Teknik Detaylar

### **Dosya Yapısı:**
```
project/
├── components/
│   └── BackgroundImage.tsx    # Arka plan component'i
├── assets/
│   └── images/
│       └── city-background.jpg  # Şehir fotoğrafı
└── app/
    ├── _layout.tsx           # Ana layout (BackgroundImage wrapper)
    └── (tabs)/
        ├── _layout.tsx      # Tab layout
        ├── index.tsx        # Ana ekran
        ├── territory.tsx    # Bölgeler
        ├── businesses.tsx   # İşletmeler
        ├── family.tsx       # Aile
        └── settings.tsx     # Ayarlar
```

### **Component Kullanımı:**
```tsx
// _layout.tsx
<BackgroundImage>
  <AuthProvider>
    <Stack>
      {/* Tüm ekranlar */}
    </Stack>
  </AuthProvider>
</BackgroundImage>
```

## 🎯 Sonuç

Fotoğrafı ekledikten sonra:
- ✅ Tüm ekranlarda karanlık şehir arka planı görünür
- ✅ UI elementleri şeffaf ve okunabilir
- ✅ Mafya oyunu atmosferi tam olarak sağlanır
- ✅ Text okunabilirliği korunur

**Not:** Fotoğrafı eklemeden önce uygulama çalışmayacaktır. Lütfen fotoğrafı belirtilen konuma kaydedin.
