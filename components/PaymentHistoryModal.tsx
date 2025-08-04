import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Modal, View, StyleSheet, Pressable, FlatList, TouchableOpacity, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { t } from '@/locales/i18n';
import { Property } from '@/utils/paymentCalculations';

function getPreviousMonth(monthId: string | null): string | null {
    if (!monthId) return null;
    const [year, month] = monthId.split('-').map(Number);
    if (month === 1) {
        return `${year - 1}-12`;
    }
    return `${year}-${String(month - 1).padStart(2, '0')}`;
}

export default function PaymentHistoryModal({ isVisible, onClose, property, onSave }: { isVisible: boolean, onClose: () => void, property: Property | null, onSave: (newLastPaidMonth: string | null) => void }) {
    if (!property) return null;

    const [year, setYear] = useState(new Date().getFullYear());
    const [lastPaidMonth, setLastPaidMonth] = useState(property.lastPaidMonth);
    const [tempLastPaidMonth, setTempLastPaidMonth] = useState(property.lastPaidMonth);

    useEffect(() => {
        setLastPaidMonth(property.lastPaidMonth);
        setTempLastPaidMonth(property.lastPaidMonth);
        setYear(new Date().getFullYear());
    }, [isVisible, property]);

    const cardColor = useThemeColor({}, 'card');
    const primaryColor = useThemeColor({}, 'primary');
    const textColor = useThemeColor({}, 'text');
    const mutedColor = useThemeColor({ light: '#E5E7EB', dark: '#374151' });
    const successColor = useThemeColor({ light: '#16A34A', dark: '#22C55E' });
    const paidBackgroundColor = useThemeColor({ light: '#F0FDF4', dark: '#16221A'});
    const disabledTextColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' });

    const handleMonthPress = (monthId: string) => {
        const isCurrentlySelected = tempLastPaidMonth && monthId <= tempLastPaidMonth;
    
        if (isCurrentlySelected) {
            const currentLastMonth = tempLastPaidMonth || '';
            const [lastYear, lastMonth] = currentLastMonth.split('-').map(Number);
            const [selectedYear, selectedMonth] = monthId.split('-').map(Number);
            
            const monthsDiff = (lastYear - selectedYear) * 12 + (lastMonth - selectedMonth);
            const count = monthsDiff +1;

            Alert.alert(
                t('unmark_payment_confirm_title'),
                t('unmark_payment_confirm_message_new', { count }),
                [
                    { text: t('cancel'), style: 'cancel' },
                    {
                        text: t('unmark'),
                        style: 'destructive',
                        onPress: () => {
                            setTempLastPaidMonth(getPreviousMonth(monthId));
                        },
                    },
                ]
            );
        } else {
            setTempLastPaidMonth(monthId);
        }
    };
    

    const handleSave = () => {
        onSave(tempLastPaidMonth);
        onClose();
    };

    const months = useMemo(() => Array.from({ length: 12 }, (_, i) => {
        const monthNum = i + 1;
        const monthId = `${year}-${String(monthNum).padStart(2, '0')}`;
        const date = new Date(year, i, 1);
        const monthName = date.toLocaleString('default', { month: 'long' });
        return { id: monthId, name: monthName };
    }), [year]);

    const newPaymentsCount = useMemo(() => {
        if (tempLastPaidMonth === lastPaidMonth) return 0;

        if (tempLastPaidMonth && (!lastPaidMonth || tempLastPaidMonth > lastPaidMonth)) {
            const start = lastPaidMonth ? new Date(lastPaidMonth.split('-')[0], lastPaidMonth.split('-')[1]) : new Date(property.createdAt || `${year}-01`);
            const end = new Date(tempLastPaidMonth.split('-')[0], tempLastPaidMonth.split('-')[1]-1);
            
            let count = 0;
            if (end > start) {
                count = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
            }
            return Math.max(0, count);
        }
        return 0;

    }, [tempLastPaidMonth, lastPaidMonth, property.createdAt, year]);


    const renderMonth = useCallback(({ item }) => {
        const isOriginallyPaid = lastPaidMonth && item.id <= lastPaidMonth;
        const isCurrentlySelected = tempLastPaidMonth && item.id <= tempLastPaidMonth;
        
        let iconName: 'checkmark-circle' | 'ellipse-outline' = 'ellipse-outline';
        let iconColor = textColor;
        let textStyle: any = { color: textColor };
        let buttonStyle: any[] = [styles.monthItem, { borderColor: mutedColor }];

        if (isCurrentlySelected) {
             if (isOriginallyPaid) {
                iconName = 'checkmark-circle';
                iconColor = successColor;
                buttonStyle.push({ backgroundColor: paidBackgroundColor, borderColor: successColor });
            } else {
                iconName = 'checkmark-circle';
                iconColor = 'white';
                buttonStyle.push({ backgroundColor: primaryColor, borderColor: primaryColor });
                textStyle = { color: 'white' };
            }
        } else {
            if(isOriginallyPaid) {
                 textStyle = { color: disabledTextColor, textDecorationLine: 'line-through' };
            }
            iconName = 'ellipse-outline';
            iconColor = disabledTextColor;
        }

        return (
            <TouchableOpacity style={buttonStyle} onPress={() => handleMonthPress(item.id)}>
                <Ionicons name={iconName} size={24} color={iconColor} />
                <Text style={[styles.monthText, textStyle]}>{item.name}</Text>
            </TouchableOpacity>
        );
    }, [lastPaidMonth, tempLastPaidMonth, textColor, mutedColor, successColor, paidBackgroundColor, primaryColor, disabledTextColor, handleMonthPress]);

    return (
        <Modal visible={isVisible} animationType="slide" transparent onRequestClose={onClose}>
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <Pressable style={[styles.modalContent, { backgroundColor: cardColor }]} onPress={e => e.stopPropagation()}>
                    <View style={styles.header}>
                        <ThemedText type="subtitle">{property.name}</ThemedText>
                        <TouchableOpacity onPress={onClose}><Ionicons name="close-circle" size={28} color={disabledTextColor} /></TouchableOpacity>
                    </View>
                    <View style={styles.yearSelector}>
                        <TouchableOpacity onPress={() => setYear(y => y - 1)}><Ionicons name="chevron-back" size={28} color={textColor} /></TouchableOpacity>
                        <Text style={[styles.yearText, {color: textColor}]}>{year}</Text>
                        <TouchableOpacity onPress={() => setYear(y => y + 1)} disabled={year >= new Date().getFullYear()}><Ionicons name="chevron-forward" size={28} color={year >= new Date().getFullYear() ? disabledTextColor : textColor} /></TouchableOpacity>
                    </View>
                    <FlatList
                        data={months}
                        renderItem={renderMonth}
                        keyExtractor={item => item.id}
                        numColumns={1}
                        contentContainerStyle={{ paddingHorizontal: 5 }}
                    />
                    <View style={styles.footer}>
                        {newPaymentsCount > 0 &&
                            <View style={styles.summary}>
                                <ThemedText>
                                    {`${t('you_are_paying_for')} ${newPaymentsCount} ${newPaymentsCount > 1 ? t('months_plural') : t('month')}`}
                                </ThemedText>
                                <ThemedText type='subtitle' style={{color: primaryColor}}>₹{(newPaymentsCount * (property.rentAmount || 0)).toFixed(2)}</ThemedText>
                            </View>
                        }
                        <TouchableOpacity style={[styles.saveButton, { backgroundColor: primaryColor }]} onPress={handleSave}>
                            <Text style={styles.saveButtonText}>{t('save_changes')}</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalContent: {
        height: '85%',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderColor: '#E5E7EB',
    },
    yearSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 20,
    },
    yearText: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    monthItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderRadius: 12,
        borderWidth: 1.5,
        marginBottom: 12,
    },
    monthText: {
        fontSize: 18,
        marginLeft: 15,
        fontWeight: '500'
    },
    footer: {
        marginTop: 'auto',
        paddingTop: 15,
        borderTopWidth: 1,
        borderColor: '#E5E7EB',
    },
    summary: {
        alignItems: 'center',
        marginBottom: 15,
        padding: 10,
    },
    saveButton: {
        paddingVertical: 18,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
    },
});