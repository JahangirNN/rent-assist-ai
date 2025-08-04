import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Modal, Pressable, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { setLocale, t } from '@/locales/i18n';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useRouter, useFocusEffect } from 'expo-router';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { getMonthlySummary } from '@/utils/paymentCalculations';

export default function SettingsScreen() {
    const [modalVisible, setModalVisible] = useState(false);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const colorScheme = useColorScheme();
    const router = useRouter();
    const cardColor = useThemeColor({}, 'card');
    const mutedColor = useThemeColor({ light: '#F9FAFB', dark: '#374151' });
    const primaryColor = useThemeColor({}, 'primary');
    const successColor = useThemeColor({ light: '#10B981', dark: '#34D399'});
    const dangerColor = useThemeColor({light: '#EF4444', dark: '#F87171'});

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            const docRef = doc(db, "rentaData", "userProfile");
            const unsubscribe = onSnapshot(docRef, (doc) => {
                if (doc.exists()) {
                    setLocations(doc.data().locations || []);
                } else {
                    setLocations([]);
                }
                setLoading(false);
            }, (error) => {
                console.error('Failed to load settings data.', error);
                setLoading(false);
            });

            return () => unsubscribe();
        }, [])
    );

    const financialSummary = useMemo(() => {
        const allProperties = locations.flatMap(group => group.properties);
        return getMonthlySummary(allProperties);
    }, [locations]);

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

    const lastMonthName = useMemo(() => {
        if (!financialSummary.lastMonthString) return '';
        const [year, month] = financialSummary.lastMonthString.split('-');
        const monthIndex = parseInt(month, 10) - 1;
        const monthNameKey = Object.keys(t('months'))[monthIndex];
        return t(`months.${monthNameKey}`);
    }, [financialSummary.lastMonthString]);


    if (loading) {
        return (
            <ThemedView style={styles.centered}>
                <ActivityIndicator size="large" />
            </ThemedView>
        );
    }
    
    return (
        <ThemedView style={styles.container}>
            <ThemedText type="title" style={styles.title}>{t('settings')}</ThemedText>
            
            {/* Language Selection Card */}
            <View style={[styles.card, { backgroundColor: cardColor }]}>
                <ThemedText type="subtitle" style={styles.cardTitle}>{t('language')}</ThemedText>
                <Pressable style={[styles.pickerButton, { backgroundColor: mutedColor }]} onPress={() => setModalVisible(true)}>
                    <ThemedText style={styles.pickerButtonText}>{currentLanguageName}</ThemedText>
                    <Ionicons name="chevron-down-outline" size={20} color={Colors[colorScheme ?? 'light'].text} />
                </Pressable>
            </View>

            {/* Language Selection Modal */}
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
                                <ThemedText style={styles.languageOptionText}>{lang.name}</ThemedText>
                            </TouchableOpacity>
                        ))}
                    </ThemedView>
                </Pressable>
            </Modal>
            
            {/* Monthly Collections Summary */}
            <ThemedText type="subtitle" style={styles.sectionHeader}>{t('monthly_collections')}</ThemedText>
            
            <View style={[styles.summaryCard, {backgroundColor: cardColor}]}>
                <ThemedText type="title" style={styles.summaryTitle}>{t('last_month_summary_for', { month: lastMonthName })}</ThemedText>
                
                <View style={[styles.summaryMetricRow, {borderColor: mutedColor}]}>
                    <ThemedText style={styles.summaryMetricLabel}>{t('total_potential')}</ThemedText>
                    <ThemedText style={[styles.summaryMetricValue, {color: primaryColor}]}>₹{financialSummary.totalRent.toFixed(2)}</ThemedText>
                </View>

                <View style={[styles.summaryMetricRow, {borderColor: mutedColor}]}>
                    <ThemedText style={styles.summaryMetricLabel}>{t('total_collected')}</ThemedText>
                    <ThemedText style={[styles.summaryMetricValue, {color: successColor}]}>₹{financialSummary.totalCollected.toFixed(2)}</ThemedText>
                </View>

                <View style={[styles.summaryMetricRow, {borderBottomWidth: 0, borderColor: mutedColor}]}>
                    <ThemedText style={styles.summaryMetricLabel}>{t('total_remaining')}</ThemedText>
                    <ThemedText style={[styles.summaryMetricValue, {color: dangerColor}]}>₹{financialSummary.totalRemaining.toFixed(2)}</ThemedText>
                </View>

            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50,
        paddingHorizontal: 20,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    pickerButton: {
        padding: 15,
        borderRadius: 10,
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pickerButtonText: {
        fontSize: 16,
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
    languageOptionText: {
        fontSize: 16,
    },
    sectionHeader: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 15,
        marginTop: 10,
    },
    // --- Refined Summary Card Styles ---
    summaryCard: {
        padding: 20,
        borderRadius: 15,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    summaryTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    summaryMetricRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    summaryMetricLabel: {
        fontSize: 16,
        color: '#6B7280',
    },
    summaryMetricValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    // --- End Refined Summary Card Styles ---
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
        borderBottomWidth: 1,
        borderColor: '#E5E7EB',
    },
    groupName: {
        fontWeight: 'bold',
        fontSize: 18,
    },
    groupTotal: {
        fontWeight: 'bold',
        fontSize: 18,
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
    },
});