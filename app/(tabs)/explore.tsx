import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View, Pressable, Linking, Alert } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { getLocale, t } from '@/locales/i18n';
import { db } from '@/firebase/config';
import { getPaymentStatus, Property } from '@/utils/paymentCalculations';
import { generateAndSharePdf } from '@/utils/pdfGenerator';


export default function ExploreScreen() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const cardColor = useThemeColor({}, 'card');
  const mutedColor = useThemeColor({light: '#F3F4F6', dark: '#374151'});
  const primaryColor = useThemeColor({}, 'primary');

  
  useEffect(() => {
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
        console.error('Failed to load dashboard data.', error);
        setLoading(false);
    });
    return () => unsubscribe();
  }, [])

  const overdueProperties = useMemo(() => {
    let overdue: (Property & { groupName: string, monthsDue: number, totalOverdueAmount: number, firstOverdueMonth: string })[] = [];
    (locations || []).forEach(group => {
      (group.properties || []).forEach((property: Property) => {
        const { overdueMonthsCount, totalOverdueAmount, overdueMonthsList } = getPaymentStatus(property);
        if (overdueMonthsCount > 0) {

          const firstOverdueMonthName = new Date(overdueMonthsList[0]).toLocaleString(getLocale(), { month: 'long', year: 'numeric' });

          overdue.push({ 
            ...property, 
            groupName: group.name,
            monthsDue: overdueMonthsCount,
            totalOverdueAmount,
            firstOverdueMonth: firstOverdueMonthName
          });
        }
      });
    });
    return overdue;
  }, [locations]);

  const handleCall = (mobileNumber) => {
    const phoneNumber = `tel:+91${mobileNumber}`;
    Linking.canOpenURL(phoneNumber)
        .then(supported => {
            if (!supported) {
                Alert.alert("Error", "This device does not support phone calls.");
            } else {
                return Linking.openURL(phoneNumber);
            }
        })
        .catch(err => console.error('An error occurred', err));
  };


  const renderOverdueTenant = useCallback(({ item }) => {
    return (<View style={[styles.itemCard, { backgroundColor: cardColor }]}>
        <View style={styles.itemHeader}>
            <View style={styles.propertyInfo}>
                <ThemedText type="subtitle" style={styles.propertyName}>{item.name}</ThemedText>
                <ThemedText style={styles.tenantName}>{item.tenantName || 'N/A'}</ThemedText>
            </View>
            <View style={[styles.locationContainer, {backgroundColor: mutedColor}]}>
                <Ionicons name="location-outline" size={16} color="#6B7280" />
                <ThemedText style={styles.location}>{item.groupName}</ThemedText>
            </View>
        </View>

        <View style={styles.overdueDetails}>
            <View style={styles.overdueAmountContainer}>
                <ThemedText style={styles.overdueAmount}>
                    {`₹${item.totalOverdueAmount.toFixed(2)}`}
                </ThemedText>
                <ThemedText style={styles.overdueLabel}>{t('dues')}</ThemedText>
            </View>
            <View style={styles.monthsDueContainer}>
                <ThemedText style={styles.monthsDue}>
                    {item.monthsDue}
                </ThemedText>
                <ThemedText style={styles.overdueLabel}>{t('months_due')}</ThemedText>
            </View>
        </View>
        <ThemedText style={styles.sinceDate}>
           {t('since_date')} {item.firstOverdueMonth} 
        </ThemedText>

        {item.tenantMobile && (
            <Pressable
                style={[styles.callButton, { backgroundColor: primaryColor }]}
                onPress={() => handleCall(item.tenantMobile)}
            >
                <Ionicons name="call-outline" size={20} color="white" style={{ marginRight: 10 }} />
                <ThemedText style={styles.callButtonText}>{t('call_tenant')}</ThemedText>
            </Pressable>
        )}
    </View>
  )}, [cardColor, mutedColor, primaryColor, t]);

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  const allProperties = locations.flatMap(group => group.properties);

  return (
    <ThemedView style={styles.container}>
        <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>{t('dashboard')}</ThemedText>
            <Pressable onPress={() => generateAndSharePdf(allProperties, setIsPdfLoading)} disabled={isPdfLoading}>
                {isPdfLoading ? <ActivityIndicator size="small" color={primaryColor} /> : <Ionicons name="download-outline" size={24} color={primaryColor} />}
            </Pressable>
        </View>

        <ThemedText type="subtitle" style={styles.listHeader}>{t('overdue_payments')}</ThemedText>
        <FlatList
          data={overdueProperties}
          renderItem={renderOverdueTenant}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-circle-outline" size={40} color="#22C55E"/>
                <ThemedText style={styles.emptyText}>{t('no_overdue')}</ThemedText>
            </View>
          }
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
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        textAlign: 'center',
        flex: 1,
    },
    listHeader: {
        marginBottom: 15,
    },
    itemCard: {
        padding: 20,
        borderRadius: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingBottom: 10,
        marginBottom: 10,
        borderBottomWidth: 1,
        borderColor: '#E5E7EB',
    },
    propertyInfo: {
        flex: 1,
    },
    propertyName: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    tenantName: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 2,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    location: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        marginLeft: 5,
    },
    overdueDetails: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 10,
        marginBottom: 10,
    },
    overdueAmountContainer: {
        alignItems: 'center',
        flex: 1,
        borderRightWidth: 1,
        borderColor: '#E5E7EB',
    },
    monthsDueContainer: {
        alignItems: 'center',
        flex: 1,
    },
    overdueAmount: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#EF4444',
    },
    monthsDue: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    overdueLabel: {
        color: '#6B7280',
        fontSize: 12,
        marginTop: 2,
    },
    sinceDate: {
        textAlign: 'center',
        color: '#6B7280',
        fontSize: 12,
        marginBottom: 15,
    },
    emptyContainer: {
        marginTop: 40,
        alignItems: 'center',
        justifyContent: 'center'
    },
    emptyText: {
        marginTop: 10,
        color: '#6B7280'
    },
    callButton: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
    },
    callButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});