import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';

export const OfflineNotice = () => {
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');

  return (
    <ThemedView style={[styles.modalContent, { backgroundColor: cardColor }]}>
        <Ionicons name="cloud-offline-outline" size={50} color={textColor} />
        <ThemedText type="subtitle" style={styles.modalTitle}>No Internet Connection</ThemedText>
        <ThemedText style={styles.modalText}>Please check your connection and try again.</ThemedText>
        <ActivityIndicator size="small" color={textColor} style={{ marginTop: 20 }}/>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
    modalContent: {
        margin: 20,
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
      },
      modalTitle: {
        marginTop: 15,
        marginBottom: 10,
        textAlign: 'center',
        fontWeight: 'bold',
      },
      modalText: {
        marginBottom: 15,
        textAlign: 'center',
      },
});
