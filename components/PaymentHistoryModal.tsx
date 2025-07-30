import React, { useState, useMemo } from 'react';
import { Modal, View, StyleSheet, Pressable, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { t } from '@/locales/i18n';

export default function PaymentHistoryModal({ isVisible, onClose, property, onSave }) {
    if (!property) return null;
    
    const [year, setYear] = useState(new Date().getFullYear());
    const [payments, setPayments] = useState(property.payments || []);

    const textColor = useThemeColor({}, 'text');
    const cardColor = useThemeColor({}, 'card');
    const primaryColor = useThemeColor({}, 'primary');

    const togglePayment = (month) => {
        const isPaid = payments.some(p => p.month === month);
        let updatedPayments;
        if (isPaid) {
            updatedPayments = payments.filter(p => p.month !== month);
        } else {
            updatedPayments = [...payments, { month, date: new Date().toISOString() }];
        }
        setPayments(updatedPayments);
    };

    const handleSave = () => {
        onSave(payments);
        onClose();
    };

    const months = useMemo(() => [
        { id: `${year}-01`, name: 'January' }, { id: `${year}-02`, name: 'February' },
        { id: `${year}-03`, name: 'March' }, { id: `${year}-04`, name: 'April' },
        { id: `${year}-05`, name: 'May' }, { id: `${year}-06`, name: 'June' },
        { id: `${year}-07`, name: 'July' }, { id: `${year}-08`, name: 'August' },
        { id: `${year}-09`, name: 'September' }, { id: `${year}-10`, name: 'October' },
        { id: `${year}-11`, name: 'November' }, { id: `${year}-12`, name: 'December' }
    ], [year]);

    const renderMonth = ({ item: month }) => {
        const isPaid = payments.some(p => p.month === month.id);
        return (
            <TouchableOpacity 
                style={[styles.monthItem, { backgroundColor: isPaid ? primaryColor : cardColor, borderColor: primaryColor }]}
                onPress={() => togglePayment(month.id)}
            >
                <ThemedText style={{ color: isPaid ? 'white' : textColor }}>{month.name}</ThemedText>
                {isPaid && <Ionicons name="checkmark-circle" size={22} color="white" />}
            </TouchableOpacity>
        );
    };

    return (
        <Modal visible={isVisible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <ThemedView style={styles.modalOverlay}>
                <ThemedView style={[styles.modalContent, { backgroundColor: cardColor }]}>
                    <View style={styles.header}>
                        <ThemedText type="subtitle">{t('manage_payments')}</ThemedText>
                        <Pressable onPress={onClose}><Ionicons name="close-circle" size={28} color={textColor} /></Pressable>
                    </View>

                    <View style={styles.yearSelector}>
                        <TouchableOpacity onPress={() => setYear(year - 1)}>
                            <Ionicons name="chevron-back" size={28} color={textColor} />
                        </TouchableOpacity>
                        <ThemedText type="subtitle">{year}</ThemedText>
                        <TouchableOpacity onPress={() => setYear(year + 1)}>
                            <Ionicons name="chevron-forward" size={28} color={textColor} />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={months}
                        renderItem={renderMonth}
                        keyExtractor={item => item.id}
                        numColumns={2}
                        columnWrapperStyle={{justifyContent: 'space-between'}}
                        contentContainerStyle={{paddingVertical: 10}}
                    />
                    <Pressable style={[styles.saveButton, { backgroundColor: primaryColor }]} onPress={handleSave}>
                        <ThemedText style={styles.saveButtonText}>{t('save_changes')}</ThemedText>
                    </Pressable>
                </ThemedView>
            </ThemedView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        height: '75%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    yearSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        marginBottom: 10,
    },
    monthItem: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 10,
        marginHorizontal: 5,
    },
    saveButton: {
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
    },
    saveButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    }
});