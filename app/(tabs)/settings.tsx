import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Modal, Pressable, TouchableOpacity, FlatList, ActivityIndicator, Text } from 'react-native';
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

// A simple, stateless progress bar component for visualization
const ProgressBar = ({ progress, color }) => (
    <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: color }]} />
    </View>
);

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
    const warningColor = useThemeColor({ light: '#F59E0B', dark: '#FBBF24'});

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
        let totalPotential = 0;
        let totalCollected = 0;
        const currentMonthStr = new Date().toISOString().slice(0, 7);
        
        const groupsWithCollections = locations.map(group => {
            let groupTotalCollected = 0;
            const propertiesWithCollection = group.properties.map(property => {
                const rentAmount = property.rentAmount || 0;
                totalPotential += rentAmount;
                
                let propertyCollected = 0;
                if (property.payments && property.payments.some(p => p.month === currentMonthStr)) {
                    propertyCollected = rentAmount;
                    totalCollected += rentAmount;
                    groupTotalCollected += rentAmount;
                }
                return { ...property, collectedAmount: propertyCollected };
            }).filter(p => p.collectedAmount > 0);

            return { ...group, properties: propertiesWithCollection, groupTotal: groupTotalCollected };
        }).filter(g => g.groupTotal > 0);

        const totalPending = totalPotential - totalCollected;
        const collectionRate = totalPotential > 0 ? (totalCollected / totalPotential) * 100 : 0;

        return { totalPotential, totalCollected, totalPending, collectionRate, groups: groupsWithCollections };
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

    const renderProperty = useCallback(({ item }) => (
        <View style={styles.propertyItem}>
            <ThemedText style={styles.propertyName}>{item.name}</ThemedText>
            <Text style={[styles.propertyAmount, { color: primaryColor }]}>₹{item.collectedAmount.toFixed(2)}</Text>
        </View>
    ), [primaryColor]);

    const renderGroup = useCallback(({ item }) => (
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
    ), [cardColor, primaryColor, mutedColor, renderProperty]);

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
            
            {/* --- Improved Financial Summary UI --- */}
            <View style={[styles.summaryContainer, {backgroundColor: cardColor}]}>
                <View style={styles.summaryHeader}>
                    <ThemedText type="subtitle">{t('this_month_summary')}</ThemedText>
                    <ThemedText style={{fontSize: 18, fontWeight: 'bold', color: primaryColor}}>{financialSummary.collectionRate.toFixed(0)}%</ThemedText>
                </View>
                <ProgressBar progress={financialSummary.collectionRate} color={primaryColor} />
                <View style={styles.summaryMetrics}>
                    <View style={styles.metricItem}>
                        <ThemedText style={styles.metricValue}>₹{financialSummary.totalCollected.toFixed(2)}</ThemedText>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                           <View style={[styles.metricDot, {backgroundColor: successColor}]} />
                           <ThemedText style={styles.metricLabel}>{t('total_collected')}</ThemedText>
                        </View>
                    </View>
                     <View style={styles.metricItem}>
                        <ThemedText style={styles.metricValue}>₹{financialSummary.totalPending.toFixed(2)}</ThemedText>
                         <View style={{flexDirection: 'row', alignItems: 'center'}}>
                           <View style={[styles.metricDot, {backgroundColor: warningColor}]} />
                           <ThemedText style={styles.metricLabel}>{t('pending')}</ThemedText>
                        </View>
                    </View>
                </View>
                 <ThemedText style={styles.potentialText}>{t('potential')}: ₹{financialSummary.totalPotential.toFixed(2)}</ThemedText>
            </View>

            <FlatList
                data={financialSummary.groups}
                renderItem={renderGroup}
                keyExtractor={(group) => group.id}
                contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="information-circle-outline" size={40} color={Colors[colorScheme ?? 'light'].text} />
                        <ThemedText style={{textAlign: 'center', marginTop: 10}}>{t('no_collections_this_month')}</ThemedText>
                    </View>
                }
            />
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
    // --- New Summary Styles ---
    summaryContainer: {
        padding: 20,
        borderRadius: 15,
        marginBottom: 15,
    },
    summaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 15,
    },
    progressBar: {
        height: '100%',
        borderRadius: 4,
    },
    summaryMetrics: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    metricItem: {
        alignItems: 'flex-start',
    },
    metricValue: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    metricLabel: {
        fontSize: 14,
        color: '#6B7280',
    },
    metricDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    potentialText: {
        textAlign: 'center',
        fontSize: 12,
        color: '#9CA3AF',
        borderTopWidth: 1,
        borderColor: '#E5E7EB',
        paddingTop: 10,
        marginTop: 5,
    },
    // --- End New Summary Styles ---
    groupCard: {
        padding: 15,
        borderRadius: 15,
        marginBottom: 15,
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