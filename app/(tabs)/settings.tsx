import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Modal, Pressable, TouchableOpacity, FlatList, ActivityIndicator, Text } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { setLocale, t } from '@/locales/i18n';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
    const [modalVisible, setModalVisible] = useState(false);
    const colorScheme = useColorScheme();
    const router = useRouter();
    const cardColor = useThemeColor({}, 'card');
    const mutedColor = useThemeColor({ light: '#F9FAFB', dark: '#374151' });
    const primaryColor = useThemeColor({}, 'primary');
    
    const [dashboardData, setDashboardData] = useState({
        totalCollected: 0,
        groups: [],
    });
    const [loading, setLoading] = useState(true);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const storedGroups = await AsyncStorage.getItem('groups');
            const groups = storedGroups ? JSON.parse(storedGroups) : [];
            
            let totalCollected = 0;
            const currentMonthStr = new Date().toISOString().slice(0, 7);
            
            const processedGroups = groups.map(group => {
                let groupTotal = 0;
                const propertiesWithCollection = group.properties.map(property => {
                    let propertyCollected = 0;
                    if (property.payments.some(p => p.month === currentMonthStr)) {
                        propertyCollected = property.rentAmount || 0;
                        totalCollected += propertyCollected;
                        groupTotal += propertyCollected;
                    }
                    return { ...property, collectedAmount: propertyCollected };
                }).filter(p => p.collectedAmount > 0);

                return { ...group, properties: propertiesWithCollection, groupTotal };
            }).filter(g => g.groupTotal > 0);

            setDashboardData({ totalCollected, groups: processedGroups });
        } catch (e) {
            console.error('Failed to load dashboard data.', e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadDashboardData();
        }, [])
    );

    const languages = [
        { code: 'en', name: 'English' },
        { code: 'gu', name: 'ગુજરાતી' },
        { code: 'hi', name: 'हिन्दी' },
    ];

    const handleLanguageChange = (langCode) => {
        setLocale(langCode).then(() => {
            setModalVisible(false);
            router.replace('/(tabs)/settings');
        });
    };

    const currentLanguageName = languages.find(lang => lang.code === (t('language') === 'Language' ? 'en' : t('language') === 'ભાષા' ? 'gu' : 'hi'))?.name || 'English';

    const renderProperty = ({ item }) => (
        <View style={styles.propertyItem}>
            <ThemedText style={styles.propertyName}>{item.name}</ThemedText>
            <Text style={[styles.propertyAmount, { color: primaryColor }]}>₹{item.collectedAmount.toFixed(2)}</Text>
        </View>
    );

    const renderGroup = ({ item }) => (
        <View style={[styles.groupCard, { backgroundColor: cardColor }]}>
            <View style={styles.groupHeader}>
                <ThemedText type="subtitle" style={styles.groupName}>{item.name}</ThemedText>
                <ThemedText type="subtitle" style={[styles.groupTotal, { color: primaryColor }]}>₹{item.groupTotal.toFixed(2)}</ThemedText>
            </View>
            <FlatList
                data={item.properties}
                renderItem={renderProperty}
                keyExtractor={(property) => property.id}
                ItemSeparatorComponent={() => <View style={[styles.separator, {backgroundColor: mutedColor}]} />}
            />
        </View>
    );

    return (
        <ThemedView style={styles.container}>
            <ThemedText type="title" style={styles.title}>{t('settings')}</ThemedText>
            
            <View style={[styles.card, { backgroundColor: cardColor }]}>
                <ThemedText type="subtitle">{t('language')}</ThemedText>
                <Pressable style={[styles.pickerButton, { backgroundColor: mutedColor }]} onPress={() => setModalVisible(true)}>
                    <ThemedText>{currentLanguageName}</ThemedText>
                    <Ionicons name="chevron-down-outline" size={20} color={Colors[colorScheme ?? 'light'].text} />
                </Pressable>
            </View>

            <Modal
                transparent={true}
                animationType="slide"
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
                    <ThemedView style={[styles.modalContent, {backgroundColor: cardColor}]}>
                        <ThemedText type="subtitle" style={styles.modalTitle}>{t('select_language')}</ThemedText>
                        {languages.map(lang => (
                            <TouchableOpacity 
                                key={lang.code} 
                                style={[styles.languageOption, {borderBottomColor: mutedColor}]} 
                                onPress={() => handleLanguageChange(lang.code)}
                            >
                                <ThemedText>{lang.name}</ThemedText>
                            </TouchableOpacity>
                        ))}
                    </ThemedView>
                </Pressable>
            </Modal>
            
            <ThemedText type="title" style={styles.listHeader}>{t('monthly_collections')}</ThemedText>
            {loading ? (
                <ActivityIndicator size="large" color={primaryColor} style={{ marginTop: 20 }}/>
            ) : (
                <>
                    <View style={[styles.summaryCard, {backgroundColor: primaryColor}]}>
                        <ThemedText style={styles.summaryLabel}>{t('total_collected')}</ThemedText>
                        <ThemedText type="subtitle" style={styles.summaryValue}>₹{dashboardData.totalCollected.toFixed(2)}</ThemedText>
                    </View>
                    <FlatList
                        data={dashboardData.groups}
                        renderItem={renderGroup}
                        keyExtractor={(group) => group.id}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="information-circle-outline" size={40} color={Colors[colorScheme ?? 'light'].text} />
                                <ThemedText style={{textAlign: 'center', marginTop: 10}}>{t('no_collections')}</ThemedText>
                            </View>
                        }
                    />
                </>
            )}
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50,
        paddingHorizontal: 20,
    },
    title: {
        textAlign: 'center',
        marginBottom: 20,
    },
    card: {
        padding: 20,
        borderRadius: 15,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    pickerButton: {
        padding: 15,
        borderRadius: 10,
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
    },
    modalTitle: {
        marginBottom: 20,
        textAlign: 'center',
    },
    languageOption: {
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    listHeader: {
        textAlign: 'center',
        marginBottom: 15,
    },
    summaryCard: {
        padding: 20,
        borderRadius: 15,
        alignItems: 'center',
        marginBottom: 20,
    },
    summaryLabel: {
        color: 'white',
        marginBottom: 5,
        fontSize: 16
    },
    summaryValue: {
        fontWeight: 'bold',
        fontSize: 32,
        color: 'white'
    },
    groupCard: {
        padding: 15,
        borderRadius: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    groupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingBottom: 10,
        marginBottom: 10,
    },
    groupName: {
        fontWeight: 'bold',
    },
    groupTotal: {
        fontWeight: 'bold',
    },
    propertyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 5,
    },
    propertyName: {
        fontSize: 16,
    },
    propertyAmount: {
        fontSize: 16,
        fontWeight: '600',
    },
    separator: {
        height: 1,
    },
    emptyContainer: {
        marginTop: 40,
        alignItems: 'center',
        justifyContent: 'center'
    }
});