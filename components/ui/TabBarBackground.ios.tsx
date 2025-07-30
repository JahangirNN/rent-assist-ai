import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet } from 'react-native';

export function TabBarBackground() {
  return (
    <BlurView
      tint="light"
      intensity={90}
      style={StyleSheet.absoluteFill}
    />
  );
}