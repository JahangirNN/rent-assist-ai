import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View, Pressable, Linking, Alert } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useThemeColor } from '@/hooks/useThemeColor';
import { getLocale, t } from '@/locales/i18n';

export default function ExploreScreen() {
  const [dashboardData, setDashboardData] = useState({
    totalCollected: 0,
    overdueProperties: [],
  });
  const [loading, setLoading] = useState(true);
  const cardColor = useThemeColor({}, 'card');
  const mutedColor = useThemeColor({light: '#F3F4F6', dark: '#374151'});
  const primaryColor = useThemeColor({}, 'primary');

  const getOverdueDetails = (property) => {
    const today = new Date();
    const propertyStartDate = property.createdAt ? new Date(property.createdAt) : new Date(today.getFullYear(), 0, 1);

    const sortedPayments = [...property.payments].sort((a, b) => b.month.localeCompare(a.month));
    const lastPaidMonthStr = sortedPayments.length > 0 ? sortedPayments[0].month : null;

    let firstOverdueDate;
    if (lastPaidMonthStr) {
        const [year, month] = lastPaidMonthStr.split('-').map(Number);
        firstOverdueDate = new Date(year, month, 1); // JS month is 1-based from split, but constructor is 0-indexed. This gets us to the next month.
    } else {
        firstOverdueDate = propertyStartDate;
    }

    let overdueMonthsCount = 0;
    let checkDate = new Date(firstOverdueDate);

    while (checkDate < today) {
        const year = checkDate.getFullYear();
        const month = checkDate.getMonth();
        const isPastDue = (today.getFullYear() > year || 
                          (today.getFullYear() === year && today.getMonth() > month)) ||
                          (today.getFullYear() === year && today.getMonth() === month && today.getDate() > (property.dueDate || 1));

        if (isPastDue) {
            overdueMonthsCount++;
        }
        checkDate.setMonth(checkDate.getMonth() + 1);
    }
    
    const totalOverdueAmount = overdueMonthsCount * (property.rentAmount || 0);
    const firstOverdueMonthName = new Date(firstOverdueDate).toLocaleString(getLocale(), { month: 'long', year: 'numeric' });

    return { 
        monthsDue: overdueMonthsCount,
        totalOverdueAmount,
        firstOverdueMonth: firstOverdueMonthName
    };
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const storedGroups = await AsyncStorage.getItem('groups');
      const groups = storedGroups ? JSON.parse(storedGroups) : [];
      
      let totalCollected = 0;
      let overdueProperties = [];
      const currentMonthStr = new Date().toISOString().slice(0, 7);

      for (const group of groups) {
        for (const property of group.properties) {
          if (property.payments.some(p => p.month === currentMonthStr)) {
            totalCollected += property.rentAmount || 0;
          }

          const { monthsDue, totalOverdueAmount, firstOverdueMonth } = getOverdueDetails(property);
          if (monthsDue > 0) {
            overdueProperties.push({ 
              ...property, 
              groupName: group.name,
              monthsDue,
              totalOverdueAmount,
              firstOverdueMonth
            });
          }
        }
      }

      setDashboardData({ totalCollected, overdueProperties });
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


  const renderOverdueTenant = ({ item }) => {
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
            {item.firstOverdueMonth} {t('since_date')}
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
  )};

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>{t('dashboard')}</ThemedText>
        <View style={[styles.summaryCard, {backgroundColor: cardColor}]}>
            <ThemedText style={styles.summaryLabel}>{t('collected_this_month')}</ThemedText>
            <ThemedText type="subtitle" style={styles.summaryValue}>₹{dashboardData.totalCollected.toFixed(2)}</ThemedText>
        </View>

        <ThemedText type="subtitle" style={styles.listHeader}>{t('overdue_payments')}</ThemedText>
        <FlatList
          data={dashboardData.overdueProperties}
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
    title: {
        marginBottom: 20,
        textAlign: 'center',
    },
    summaryCard: {
        padding: 20,
        borderRadius: 15,
        alignItems: 'center',
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    summaryLabel: {
        color: '#6B7280',
        marginBottom: 5,
        fontSize: 16
    },
    summaryValue: {
        fontWeight: 'bold',
        fontSize: 24
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