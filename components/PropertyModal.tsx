import React, { useState, useEffect } from 'react';
import { View, Modal, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Pressable, Alert, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { ThemedText } from './ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { t } from '@/locales/i18n';

export default function PropertyModal({ isVisible, onClose, onSave, property, onDelete }) {
  const [name, setName] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [tenantMobile, setTenantMobile] = useState('');

  const primaryColor = useThemeColor({}, 'primary');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');

  useEffect(() => {
    if (property) {
      setName(property.name);
      setTenantName(property.tenantName || '');
      setRentAmount(property.rentAmount ? property.rentAmount.toString() : '');
      setTenantMobile(property.tenantMobile || '');
    } else {
      setName('');
      setTenantName('');
      setRentAmount('');
      setTenantMobile('');
    }
  }, [property]);

  const handleSave = () => {
    if (!name || !rentAmount) {
      Alert.alert(t('heads_up'), t('fill_required_fields'));
      return;
    }

    if (tenantMobile && !/^\d{10}$/.test(tenantMobile)) {
        Alert.alert(t('heads_up'), t('invalid_mobile'));
        return;
    }

    onSave({
      id: property ? property.id : Date.now().toString(),
      name,
      tenantName,
      rentAmount: parseFloat(rentAmount),
      tenantMobile,
      dueDate: 1, // Defaulting due date to 1
      payments: property ? property.payments : [],
      createdAt: property ? property.createdAt : new Date().toISOString(),
    });
    onClose();
  };

  const handleDelete = () => {
    Alert.alert(
        t('delete_property_confirm').split('?')[0],
        t('delete_property_confirm').split('?')[1],
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: () => onDelete(property.id) },
      ]
    );
  };

  return (
    <Modal visible={isVisible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flexOne}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={[styles.container, {backgroundColor: cardColor}]}>
            <ThemedText type="title" style={styles.title}>{property ? t('edit_property') : t('add_property')}</ThemedText>
            <TextInput
              style={[styles.input, {color: textColor, backgroundColor: backgroundColor}]}
              placeholder={t('property_name')}
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={[styles.input, {color: textColor, backgroundColor: backgroundColor}]}
              placeholder={t('tenant_name')}
              placeholderTextColor="#9CA3AF"
              value={tenantName}
              onChangeText={setTenantName}
            />
            <TextInput
              style={[styles.input, {color: textColor, backgroundColor: backgroundColor}]}
              placeholder={t('rent_amount')}
              placeholderTextColor="#9CA3AF"
              value={rentAmount}
              onChangeText={setRentAmount}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, {color: textColor, backgroundColor: backgroundColor}]}
              placeholder={t('tenant_mobile_optional')}
              placeholderTextColor="#9CA3AF"
              value={tenantMobile}
              onChangeText={setTenantMobile}
              keyboardType="phone-pad"
            />
            <View style={styles.buttonContainer}>
              {property && (
                <Pressable style={styles.deleteButton} onPress={handleDelete}>
                    <ThemedText style={styles.buttonText}>{t('delete')}</ThemedText>
                </Pressable>
              )}
              <Pressable style={[styles.saveButton, {backgroundColor: primaryColor}]} onPress={handleSave}>
                 <ThemedText style={styles.buttonText}>{t('save')}</ThemedText>
              </Pressable>
            </View>

            <Pressable style={styles.cancelButton} onPress={onClose}>
                <ThemedText>{t('cancel')}</ThemedText>
            </Pressable>

          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
    flexOne: {
        flex: 1,
    },
    container: {
        flexGrow: 1,
        padding: 20,
        justifyContent: 'center',
      },
      title: {
        marginBottom: 30,
        textAlign: 'center',
      },
      input: {
        padding: 15,
        borderRadius: 10,
        fontSize: 16,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#374151'
      },
      buttonContainer: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
          marginTop: 20,
          gap: 10,
      },
      saveButton: {
        flex: 1,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
      },
      deleteButton: {
        flex: 1,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        backgroundColor: '#EF4444'
      },
      buttonText: {
        color: 'white',
        fontWeight: 'bold',
      },
      cancelButton: {
          marginTop: 20,
          alignItems: 'center',
      }
});