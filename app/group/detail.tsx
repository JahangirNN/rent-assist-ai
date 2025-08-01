import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState, useMemo } from 'react';
import { Alert, SectionList, Pressable, StyleSheet, TouchableOpacity, View, Linking } from 'react-native';
import { doc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';

import PaymentHistoryModal from '@/components/PaymentHistoryModal';
import PropertyModal from '@/components/PropertyModal';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useThemeColor } from '@/hooks/useThemeColor';
import { t } from '@/locales/i18n';
import { db } from '@/firebase/config';

const getMonthName = (monthStr, short = false) => {
    const monthKey = new Date(monthStr + '-02').toLocaleString('default', { month: 'long' }).toLowerCase();
    const monthNames = short ? t('shortMonths') : t('months');
    return monthNames[monthKey] || monthKey;
};

const PropertyCard = React.memo(({ item, onOpenPropertyModal, onOpenPaymentModal }) => {
    const cardColor = useThemeColor({}, 'card');
    const primaryColor = useThemeColor({}, 'primary');
    const iconColor = useThemeColor({}, 'icon');
    const overdueChipColor = useThemeColor({ light: '#FFF1F2', dark: '#441920' });
    const overdueChipTextColor = useThemeColor({ light: '#B91C1C', dark: '#FCA5A5' });

    const { status, overdueMonthsList, overpaidMonthsList } = useMemo(() => {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1;
        const currentDate = today.getDate();
        
        const overdue = [];
        for (let month = 1; month <= currentMonth; month++) {
            const monthStr = `${currentYear}-${String(month).padStart(2, '0')}`;
            if (!(item.payments || []).some(p => p.month === monthStr) && (month < currentMonth || (month === currentMonth && currentDate > (item.dueDate || 1)))) {
                overdue.push(monthStr);
            }
        }

        const overpaid = [];
        (item.payments || []).forEach(p => {
            const [year, month] = p.month.split('-').map(Number);
            if (year > currentYear || (year === currentYear && month > currentMonth)) {
                overpaid.push(p.month);
            }
        });

        let currentStatus;
        if (overdue.length > 0) currentStatus = { text: t('overdue'), color: '#EF4444' };
        else if (overpaid.length > 0) currentStatus = { text: t('overpaid'), color: '#10B981' };
        else {
            const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
            if ((item.payments || []).some(p => p.month === currentMonthStr)) currentStatus = { text: t('paid'), color: Colors.light.primary };
            else currentStatus = { text: t('pending'), color: '#F59E0B' };
        }
        
        return { status: currentStatus, overdueMonthsList: overdue, overpaidMonthsList: overpaid };
    }, [item.payments, item.dueDate, t]);

    const handleCall = (mobileNumber) => {
        if (!mobileNumber) return;
        Linking.openURL(`tel:+91${mobileNumber}`).catch(err => console.error('An error occurred', err));
    };

    return (
        <View style={[styles.propertyCard, { backgroundColor: cardColor }]}>
            <View style={styles.propertyHeader}>
                <ThemedText style={styles.propertyName}>{item.name}</ThemedText>
                <TouchableOpacity onPress={() => onOpenPropertyModal(item)} style={styles.editButton}>
                    <Ionicons name="pencil-outline" size={24} color={primaryColor} />
                </TouchableOpacity>
            </View>

            <View style={styles.detailsContainer}>
                <View style={styles.detailItem}>
                    <Ionicons name="person-outline" size={24} color={iconColor} style={styles.detailIcon} />
                    <View>
                        <ThemedText style={styles.detailLabel}>{t('tenant_name')}</ThemedText>
                        <ThemedText style={styles.detailValue}>{item.tenantName || 'N/A'}</ThemedText>
                    </View>
                </View>

                {item.tenantMobile && (
                    <TouchableOpacity onPress={() => handleCall(item.tenantMobile)} activeOpacity={0.7}>
                        <View style={styles.detailItem}>
                            <Ionicons name="call-outline" size={24} color={iconColor} style={styles.detailIcon} />
                            <View>
                                <ThemedText style={styles.detailLabel}>{t('tenant_mobile')}</ThemedText>
                                <ThemedText style={styles.detailValue}>+91 {item.tenantMobile}</ThemedText>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}

                <View style={styles.detailItem}>
                    <Ionicons name="cash-outline" size={24} color={iconColor} style={styles.detailIcon} />
                    <View>
                        <ThemedText style={styles.detailLabel}>{t('rent_amount')}</ThemedText>
                        <ThemedText style={styles.detailValue}>₹{item.rentAmount ? item.rentAmount.toFixed(2) : 'N/A'}</ThemedText>
                    </View>
                </View>

                <View style={styles.detailItem}>
                     <Ionicons name="information-circle-outline" size={24} color={iconColor} style={styles.detailIcon} />
                     <View>
                        <ThemedText style={styles.detailLabel}>{t('status')}</ThemedText>
                        <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
                            <ThemedText style={styles.statusBadgeText}>{status.text}</ThemedText>
                        </View>
                     </View>
                </View>
            </View>

            {overdueMonthsList.length > 0 && (
                <View style={styles.overdueSection}>
                    <View style={styles.overdueHeaderContainer}>
                        <Ionicons name="warning-outline" size={20} color={'#B91C1C'} />
                        <ThemedText style={styles.overdueHeader}>{t('pending_months')}:</ThemedText>
                    </View>
                    <View style={styles.overdueMonthsContainer}>
                        {overdueMonthsList.map(month => (
                            <View key={month} style={[styles.overdueMonthChip, {backgroundColor: overdueChipColor}]}>
                                <ThemedText style={[styles.overdueMonthText, {color: overdueChipTextColor}]}>{getMonthName(month, true)}</ThemedText>
                            </View>
                        ))}
                    </View>
                </View>
            )}
            
            {overpaidMonthsList.length > 0 && (
                 <View style={[styles.overdueSection, {backgroundColor: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.1)'}]}>
                    <View style={styles.overdueHeaderContainer}>
                        <Ionicons name="checkmark-circle-outline" size={20} color={'#059669'} />
                        <ThemedText style={[styles.overdueHeader, {color: '#059669'}]}>{t('overpaid_properties')}:</ThemedText>
                    </View>
                    <View style={styles.overdueMonthsContainer}>
                        {overpaidMonthsList.map(month => (
                            <View key={month} style={[styles.overdueMonthChip, {backgroundColor: '#D1FAE5'}]}>
                                <ThemedText style={[styles.overdueMonthText, {color: '#065F46'}]}>{getMonthName(month, true)}</ThemedText>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            <Pressable
                style={[styles.manageButton, { backgroundColor: primaryColor }]}
                onPress={() => onOpenPaymentModal(item)}
            >
                <Ionicons name="card-outline" size={20} color="white" style={styles.buttonIcon} />
                <ThemedText style={styles.buttonText}>{t('manage_payments')}</ThemedText>
            </Pressable>
        </View>
    );
});

export default function GroupDetailScreen() {
    const { groupId } = useLocalSearchParams();
    const [group, setGroup] = useState(null);
    const [sections, setSections] = useState([]);
    const [isPropertyModalVisible, setIsPropertyModalVisible] = useState(false);
    const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const router = useRouter();

    const textColor = useThemeColor({}, 'text');
    const primaryColor = useThemeColor({}, 'primary');
    const sectionHeaderColor = useThemeColor({ light: '#F9FAFB', dark: '#1F2937' });

    useFocusEffect(
        useCallback(() => {
            const docRef = doc(db, "rentaData", "userProfile");
            const unsubscribe = onSnapshot(docRef, (doc) => {
                if (doc.exists()) {
                    const locations = doc.data().locations || [];
                    const currentGroup = locations.find(g => g.id === groupId);
                    setGroup(currentGroup);

                    if (currentGroup && currentGroup.properties) {
                        const due = [], paid = [], overpaid = [];
                        currentGroup.properties.forEach(p => {
                            const today = new Date();
                            const overdue = getOverdueMonths(p.payments, p.dueDate);
                            const overpaidMonths = getOverpaidMonths(p.payments);

                            if (overdue.length > 0) due.push(p);
                            else if (overpaidMonths.length > 0) overpaid.push(p);
                            else paid.push(p);
                        });
                        
                        const sectionData = [
                            { title: t('due_properties'), data: due },
                            { title: t('paid_properties'), data: paid },
                            { title: t('overpaid_properties'), data: overpaid },
                        ].filter(s => s.data.length > 0);
                        setSections(sectionData);
                    } else {
                        setSections([]);
                    }
                } else {
                    setGroup(null);
                    setSections([]);
                }
            }, (error) => {
                Alert.alert("Error", "Failed to load location details.");
            });
            return () => unsubscribe();
        }, [groupId, t])
    );
    
    const getOverdueMonths = (payments, dueDate) => {
        const overdue = [];
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1;
        const currentDate = today.getDate();
        for (let month = 1; month <= currentMonth; month++) {
            const monthStr = `${currentYear}-${String(month).padStart(2, '0')}`;
            if (!(payments || []).some(p => p.month === monthStr) && (month < currentMonth || (month === currentMonth && currentDate > (dueDate || 1)))) {
                overdue.push(monthStr);
            }
        }
        return overdue;
    };

    const getOverpaidMonths = (payments) => {
        const overpaid = [];
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1;
        (payments || []).forEach(p => {
            const [year, month] = p.month.split('-').map(Number);
            if (year > currentYear || (year === currentYear && month > currentMonth)) {
                overpaid.push(p.month);
            }
        });
        return overpaid;
    };

    const updateFirestoreLocations = async (updatedGroup) => {
        const docRef = doc(db, "rentaData", "userProfile");
        try {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const existingLocations = docSnap.data().locations || [];
                const newLocations = existingLocations.map(loc => loc.id === updatedGroup.id ? updatedGroup : loc);
                await updateDoc(docRef, { locations: newLocations });
            }
        } catch (error) {
            Alert.alert("Error", "Failed to save changes.");
            console.error("Firestore update error: ", error);
        }
    };
    
    const handleSaveProperty = (property) => {
        if (!group) return;
        const updatedProperties = selectedProperty
          ? group.properties.map(p => (p.id === property.id ? property : p))
          : [...group.properties, property];
        
        updateFirestoreLocations({ ...group, properties: updatedProperties });
        setIsPropertyModalVisible(false);
        setSelectedProperty(null);
    };
    
    const handleDeleteProperty = (propertyId) => {
        if (!group) return;
        const updatedProperties = group.properties.filter(p => p.id !== propertyId);
        updateFirestoreLocations({ ...group, properties: updatedProperties });
        setIsPropertyModalVisible(false);
        setSelectedProperty(null);
    };
    
    const handleSavePayments = (newPayments) => {
        if (!group || !selectedProperty) return;
        const updatedProperties = group.properties.map(p => 
          p.id === selectedProperty.id ? { ...p, payments: newPayments } : p
        );
        updateFirestoreLocations({ ...group, properties: updatedProperties });
    };

    const openPropertyModal = useCallback((property) => {
        setSelectedProperty(property);
        setIsPropertyModalVisible(true);
    }, []);
    
    const openPaymentModal = useCallback((property) => {
        setSelectedProperty(property);
        setIsPaymentModalVisible(true);
    }, []);

    const renderProperty = useCallback(({ item }) => (
        <PropertyCard 
            item={item} 
            onOpenPropertyModal={openPropertyModal} 
            onOpenPaymentModal={openPaymentModal} 
        />
    ), [openPropertyModal, openPaymentModal]);

    return (
        <ThemedView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={28} color={textColor} />
                </TouchableOpacity>
                <ThemedText type="title" style={{ flex: 1, textAlign: 'center' }}>{group ? group.name : ''}</ThemedText>
                <View style={{width: 28}} />
            </View>
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={renderProperty}
            renderSectionHeader={({ section: { title } }) => (
              <View style={[styles.sectionHeaderContainer, {backgroundColor: sectionHeaderColor}]}>
                <ThemedText style={styles.sectionHeaderText}>{title}</ThemedText>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 120 }}
            ListEmptyComponent={<ThemedText style={styles.emptyText}>{t('no_properties')}</ThemedText>}
          />
          
          {isPropertyModalVisible && (
            <PropertyModal
                isVisible={isPropertyModalVisible}
                onClose={() => {setIsPropertyModalVisible(false); setSelectedProperty(null);}}
                onSave={handleSaveProperty}
                onDelete={handleDeleteProperty}
                property={selectedProperty}
            />
           )}
    
          {selectedProperty && (
            <PaymentHistoryModal
                isVisible={isPaymentModalVisible}
                onClose={() => {setIsPaymentModalVisible(false); setSelectedProperty(null);}}
                property={selectedProperty}
                onSave={handleSavePayments}
            />
          )}
    
           <TouchableOpacity 
            style={[styles.fab, { backgroundColor: primaryColor }]} 
            onPress={() => openPropertyModal(null)}
          >
            <Ionicons name="add" size={32} color="white" />
          </TouchableOpacity>
        </ThemedView>
      );
    }
    
    const styles = StyleSheet.create({
        container: {
            flex: 1,
        },
        header: {
            paddingTop: 60,
            paddingHorizontal: 20,
            paddingBottom: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        sectionHeaderContainer: {
            paddingHorizontal: 20,
            paddingVertical: 10,
        },
        sectionHeaderText: {
            fontSize: 20,
            fontWeight: 'bold',
        },
        propertyCard: {
            borderRadius: 20,
            marginHorizontal: 15,
            marginTop: 20,
            marginBottom: 5,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
            elevation: 5,
        },
        propertyHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
        },
        propertyName: {
            fontSize: 24,
            fontWeight: 'bold',
            flex: 1,
        },
        editButton: {
            padding: 5,
        },
        detailsContainer: {},
        detailItem: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 18,
        },
        detailIcon: {
            marginRight: 15,
        },
        detailLabel: {
            fontSize: 14,
            color: '#888',
            marginBottom: 2,
        },
        detailValue: {
            fontSize: 18,
            fontWeight: '600',
        },
        statusBadge: {
            paddingVertical: 4,
            paddingHorizontal: 12,
             borderRadius: 20,
            alignSelf: 'flex-start'
        },
        statusBadgeText: {
            color: 'white',
            fontWeight: 'bold',
            fontSize: 14,
        },
        overdueSection: {
            marginTop: 15,
            padding: 15,
            backgroundColor: 'rgba(239, 68, 68, 0.05)',
            borderRadius: 10,
            borderWidth: 1,
            borderColor: 'rgba(239, 68, 68, 0.1)',
        },
        overdueHeaderContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 10,
        },
        overdueHeader: {
            fontSize: 18,
            fontWeight: 'bold',
            color: '#B91C1C',
            marginLeft: 8,
        },
        overdueMonthsContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginLeft: 28,
        },
        overdueMonthChip: {
            borderRadius: 8,
            paddingVertical: 6,
            paddingHorizontal: 12,
            marginRight: 8,
            marginBottom: 8,
        },
        overdueMonthText: {
            fontSize: 14,
            fontWeight: '500',
        },
        manageButton: {
            flexDirection: 'row',
            marginTop: 25,
            paddingVertical: 15,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
        },
        buttonIcon: {
            marginRight: 10,
        },
        buttonText: {
            color: 'white',
            fontWeight: 'bold',
            fontSize: 18,
        },
        fab: {
            position: 'absolute',
            bottom: 30,
            right: 30,
            width: 60,
            height: 60,
            borderRadius: 30,
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 8,
        },
        emptyText: {
            textAlign: 'center',
            marginTop: 50,
            fontSize: 18,
            color: '#9CA3AF'
        },
    });