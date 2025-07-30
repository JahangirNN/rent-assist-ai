import { View, TextInput, FlatList, StyleSheet, TouchableOpacity, Alert, Keyboard, Pressable, Platform } from 'react-native';
import React, { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { t } from '@/locales/i18n';

export default function HomeScreen() {
  const [groups, setGroups] = useState([]);
  const [groupName, setGroupName] = useState('');
  const router = useRouter();
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');

  const loadGroups = async () => {
    try {
      const storedGroups = await AsyncStorage.getItem('groups');
      setGroups(storedGroups ? JSON.parse(storedGroups) : []);
    } catch (e) {
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'Failed to load locations.');
      } else {
        console.error('Failed to load locations.', e);
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [])
  );

  const saveGroups = async (newGroups) => {
    try {
      await AsyncStorage.setItem('groups', JSON.stringify(newGroups));
      setGroups(newGroups);
    } catch (e) {
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'Failed to save locations.');
      } else {
        console.error('Failed to save locations.', e);
      }
    }
  };

  const addGroup = () => {
    if (groupName.trim() === '') return;
    const newGroup = { id: Date.now().toString(), name: groupName, properties: [] };
    saveGroups([...groups, newGroup]);
    setGroupName('');
    Keyboard.dismiss();
  };

  const deleteGroup = (groupId) => {
    const deleteAction = () => {
      const newGroups = groups.filter(g => g.id !== groupId);
      saveGroups(newGroups);
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`${t('delete_location_confirm').split('?')[0]} ${t('delete_location_confirm').split('?')[1]}`)) {
        deleteAction();
      }
    } else {
      Alert.alert(
        t('delete_location_confirm').split('?')[0],
        t('delete_location_confirm').split('?')[1],
        [
          { text: t('cancel'), style: 'cancel' },
          { text: t('delete'), style: 'destructive', onPress: deleteAction },
        ]
      );
    }
  }

  const renderGroup = ({ item }) => (
    <Pressable onPress={() => router.push({ pathname: '/group/detail', params: { groupId: item.id }})}>
      <View style={[styles.groupCard, { backgroundColor: cardColor }]}>
        <View style={styles.cardHeader}>
            <ThemedText type="subtitle">{item.name}</ThemedText>
            <TouchableOpacity onPress={() => deleteGroup(item.id)}>
                <Ionicons name="trash-outline" size={22} color={iconColor} />
            </TouchableOpacity>
        </View>
        <ThemedText style={styles.propertyCount}>
          {item.properties.length} {item.properties.length === 1 ? t('property') : t('properties')}
        </ThemedText>
      </View>
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>{t('welcome')}</ThemedText>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { backgroundColor: cardColor, color: textColor }]}
          placeholder={t('add_location')}
          placeholderTextColor="#9CA3AF"
          value={groupName}
          onChangeText={setGroupName}
          onSubmitEditing={addGroup}
        />
        <TouchableOpacity style={styles.addButton} onPress={addGroup}>
            <Ionicons name="add-circle" size={40} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={groups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<ThemedText style={styles.emptyText}>{t('no_locations')}</ThemedText>}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 70,
    paddingHorizontal: 20,
  },
  title: {
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
  },
  addButton: {
    marginLeft: 10,
  },
  listContainer: {
    paddingBottom: 100,
  },
  groupCard: {
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  propertyCount: {
    marginTop: 5,
    color: '#6B7280',
  },
  emptyText: {
      textAlign: 'center',
      marginTop: 50,
      color: '#9CA3AF'
  }
});