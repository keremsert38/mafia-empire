import React from 'react';
import { ImageBackground, StyleSheet, ViewStyle, View, Image } from 'react-native';

interface BackgroundImageProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function BackgroundImage({ children, style }: BackgroundImageProps) {
  // Fotoğraf dosyasının varlığını kontrol et
  let backgroundSource;
  try {
    backgroundSource = require('@/assets/images/city-background.jpg');
  } catch (error) {
    // Fotoğraf bulunamazsa alternatif kullan
    try {
      backgroundSource = require('@/assets/images/city-background.png');
    } catch (error2) {
      // Hiç fotoğraf yoksa karanlık arka plan kullan
      return (
        <View style={[styles.fallbackBackground, style]}>
          {children}
        </View>
      );
    }
  }

  return (
    <ImageBackground
      source={backgroundSource}
      style={[styles.background, style]}
      resizeMode="cover"
      imageStyle={styles.imageStyle}
    >
      {/* Karanlık overlay - tam siyah arka plan için */}
      <View style={styles.overlay} />
      {/* İçerik */}
      <View style={styles.contentContainer}>
        {children}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000', // Varsayılan siyah arka plan (resim yüklenemezse)
  },
  imageStyle: {
    opacity: 0.08, // Fotoğrafı çok şeffaf yap, neredeyse görünmez
  },
  fallbackBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000', // Tam siyah arka plan
  },
  overlay: {
    ...StyleSheet.absoluteFillObject, // top: 0, left: 0, right: 0, bottom: 0 ile aynı
    backgroundColor: '#000000', // Tam siyah overlay - resmin üzerine tamamen siyah katman
  },
  contentContainer: {
    flex: 1,
    zIndex: 1, // Overlay'in üstünde olması için
  },
});
