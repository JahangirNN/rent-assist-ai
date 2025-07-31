import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

export default function AiAssistantScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">AI Assistant</ThemedText>
      <ThemedText>Coming soon...</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});