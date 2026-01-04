import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface BackgroundImageProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function BackgroundImage({ children, style }: BackgroundImageProps) {
  return (
    <View style={[styles.background, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
});

