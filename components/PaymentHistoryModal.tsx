import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Modal, View, StyleSheet, Pressable, FlatList, TouchableOpacity, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { t } from '@/locales/i18n';

export default function PaymentHistoryModal({ isVisible, onClose, property, onSave }) {
    if (!property) return null;

    const [year, setYear] = useState(new Date().getFullYear());
    const [payments, setPayments] = useState(new Set(property.payments.map(p => p.month)));
    const [tempPayments, setTempPayments] = useState(new Set(payments));

    useEffect(() => {
        setPayments(new Set(property.payments.map(p => p.month)));
        setTempPayments(new Set(property.payments.map(p => p.month)));
    }, [isVisible, property]);

    const cardColor = useThemeColor({}, 'card');
    const primaryColor = useThemeColor({}, 'primary');
    const textColor = useThemeColor({}, 'text');
    const mutedColor = useThemeColor({ light: '#E5E7EB', dark: '#374151' });
    const successColor = useThemeColor({ light: '#16A34A', dark: '#22C55E' });
    const paidBackgroundColor = useThemeColor({ light: '#F0FDF4', dark: '#16221A'});
    const disabledTextColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' });

    const handleMonthPress = (monthId) => {
        const newTempPayments = new Set(tempPayments);
        const [monthYear, monthNum] = monthId.split('-').map(Number);
        const allMonthsInYear = Array.from(newTempPayments).filter(m => m.startsWith(`${monthYear}-`));
        const maxPaidMonth = Math.max(0, ...allMonthsInYear.map(m => parseInt(m.split('-')[1], 10)));
    
        if (newTempPayments.has(monthId)) {
            if (monthNum === maxPaidMonth) {
                Alert.alert(
                    t('unmark_payment_confirm_title'),
                    t('unmark_payment_confirm_message'),
                    [
                        { text: t('cancel'), style: 'cancel' },
                        {
                            text: t('unmark'),
                            style: 'destructive',
                            onPress: () => {
                                newTempPayments.delete(monthId);
                                setTempPayments(newTempPayments);
                            },
                        },
                    ]
                );
            } else {
                Alert.alert(
                    t('unmarking_not_allowed_title'),
                    t('unmarking_not_allowed_message')
                );
            }
        } else {
            for (let i = 1; i <= monthNum; i++) {
                const currentMonthId = `${monthYear}-${String(i).padStart(2, '0')}`;
                newTempPayments.add(currentMonthId);
            }
            setTempPayments(newTempPayments);
        }
    };
    

    const handleSave = () => {
        const finalPayments = Array.from(tempPayments).map(month => ({
            month,
            date: new Date().toISOString(),
        }));
        onSave(finalPayments);
        onClose();
    };

    const months = useMemo(() => Array.from({ length: 12 }, (_, i) => {
        const monthNum = i + 1;
        const monthId = `${year}-${String(monthNum).padStart(2, '0')}`;
        const date = new Date(year, i, 1);
        const monthName = date.toLocaleString('default', { month: 'long' });
        return { id: monthId, name: monthName };
    }), [year]);

    const newPaymentsCount = Array.from(tempPayments).filter(p => !payments.has(p)).length;

    const renderMonth = useCallback(({ item }) => {
        const isOriginallyPaid = payments.has(item.id);
        const isCurrentlySelected = tempPayments.has(item.id);
        
        let iconName: 'checkmark-circle' | 'ellipse-outline' = 'ellipse-outline';
        let iconColor = textColor;
        let textStyle: any = { color: textColor };
        let buttonStyle: any[] = [styles.monthItem, { borderColor: mutedColor }];

        if (isCurrentlySelected) {
            if (isOriginallyPaid) {
                // State: Was paid, and is still marked as paid.
                iconName = 'checkmark-circle';
                iconColor = successColor;
                buttonStyle.push({ backgroundColor: paidBackgroundColor, borderColor: successColor });
                textStyle = { color: disabledTextColor, textDecorationLine: 'line-through' };
            } else {
                // State: Was unpaid, now newly selected for payment.
                iconName = 'checkmark-circle';
                iconColor = 'white';
                buttonStyle.push({ backgroundColor: primaryColor, borderColor: primaryColor });
                textStyle = { color: 'white' };
            }
        } else {
            // State: Not currently selected (is either unpaid or was just unmarked).
            iconName = 'ellipse-outline';
            iconColor = disabledTextColor;
        }

        return (
            <TouchableOpacity style={buttonStyle} onPress={() => handleMonthPress(item.id)}>
                <Ionicons name={iconName} size={24} color={iconColor} />
                <Text style={[styles.monthText, textStyle]}>{item.name}</Text>
            </TouchableOpacity>
        );
    }, [payments, tempPayments, textColor, mutedColor, successColor, paidBackgroundColor, primaryColor, disabledTextColor, handleMonthPress]);

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
                        <TouchableOpacity onPress={() => setYear(y => y + 1)}><Ionicons name="chevron-forward" size={28} color={textColor} /></TouchableOpacity>
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