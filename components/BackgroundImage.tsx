import React from 'react';
import { ImageBackground, StyleSheet, ViewStyle } from 'react-native';

interface BackgroundImageProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function BackgroundImage({ children, style }: BackgroundImageProps) {
  return (
    <ImageBackground
      source={require('../assets/images/city-background.png')}
      style={[styles.background, style]}
      imageStyle={styles.imageStyle}
      resizeMode="cover"
    >
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  imageStyle: {
    opacity: 0.7, // Görsel daha belirgin
  },
});
