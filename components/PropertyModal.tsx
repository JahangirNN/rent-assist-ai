import React, { useState, useEffect, memo } from 'react';
import { View, Modal, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Pressable, Alert, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { ThemedText } from './ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { t } from '@/locales/i18n';

const MemoizedTextInput = memo(({ style, placeholder, value, onChangeText, keyboardType, placeholderTextColor }) => (
    <TextInput
        style={style}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
    />
));

export default function PropertyModal({ isVisible, onClose, onSave, property, onDelete }) {
  const [formData, setFormData] = useState({
    name: '',
    tenantName: '',
    rentAmount: '',
    tenantMobile: '',
    maintenanceFee: '',
    otherFees: '',
    deposit: '',
  });

  const primaryColor = useThemeColor({}, 'primary');
  const cardColor = useThemeColor({}, 'card');
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');

  useEffect(() => {
    if (property) {
      setFormData({
        name: property.name,
        tenantName: property.tenantName || '',
        rentAmount: property.rentAmount ? property.rentAmount.toString() : '',
        tenantMobile: property.tenantMobile || '',
        maintenanceFee: property.maintenanceFee ? property.maintenanceFee.toString() : '',
        otherFees: property.otherFees ? property.otherFees.toString() : '',
        deposit: property.deposit ? property.deposit.toString() : '',
      });
    } else {
      setFormData({
        name: '',
        tenantName: '',
        rentAmount: '',
        tenantMobile: '',
        maintenanceFee: '',
        otherFees: '',
        deposit: '',
      });
    }
  }, [property]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.name || !formData.rentAmount) {
      Alert.alert(t('heads_up'), t('fill_required_fields'));
      return;
    }

    if (formData.tenantMobile && !/^\d{10}$/.test(formData.tenantMobile)) {
        Alert.alert(t('heads_up'), t('invalid_mobile'));
        return;
    }

    const newPropertyData = {
        ...property,
        id: property ? property.id : Date.now().toString(),
        name: formData.name,
        tenantName: formData.tenantName,
        rentAmount: parseFloat(formData.rentAmount) || 0,
        tenantMobile: formData.tenantMobile,
        maintenanceFee: parseFloat(formData.maintenanceFee) || 0,
        otherFees: parseFloat(formData.otherFees) || 0,
        deposit: parseFloat(formData.deposit) || 0,
        createdAt: property ? property.createdAt : new Date().toISOString(),
        lastPaidMonth: property ? property.lastPaidMonth : null,
    };
    
    onSave(newPropertyData);
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
            <MemoizedTextInput
              style={[styles.input, {color: textColor, backgroundColor: backgroundColor}]}
              placeholder={t('property_name')}
              placeholderTextColor="#9CA3AF"
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
            />
            <MemoizedTextInput
              style={[styles.input, {color: textColor, backgroundColor: backgroundColor}]}
              placeholder={t('tenant_name')}
              placeholderTextColor="#9CA3AF"
              value={formData.tenantName}
              onChangeText={(value) => handleInputChange('tenantName', value)}
            />
            <MemoizedTextInput
              style={[styles.input, {color: textColor, backgroundColor: backgroundColor}]}
              placeholder={t('rent_amount')}
              placeholderTextColor="#9CA3AF"
              value={formData.rentAmount}
              onChangeText={(value) => handleInputChange('rentAmount', value)}
              keyboardType="numeric"
            />
            <MemoizedTextInput
              style={[styles.input, {color: textColor, backgroundColor: backgroundColor}]}
              placeholder={t('tenant_mobile_optional')}
              placeholderTextColor="#9CA3AF"
              value={formData.tenantMobile}
              onChangeText={(value) => handleInputChange('tenantMobile', value)}
              keyboardType="phone-pad"
            />
            <MemoizedTextInput
              style={[styles.input, {color: textColor, backgroundColor: backgroundColor}]}
              placeholder={t('maintenance_fee_optional')}
              placeholderTextColor="#9CA3AF"
              value={formData.maintenanceFee}
              onChangeText={(value) => handleInputChange('maintenanceFee', value)}
              keyboardType="numeric"
            />
            <MemoizedTextInput
              style={[styles.input, {color: textColor, backgroundColor: backgroundColor}]}
              placeholder={t('other_fees_optional')}
              placeholderTextColor="#9CA3AF"
              value={formData.otherFees}
              onChangeText={(value) => handleInputChange('otherFees', value)}
              keyboardType="numeric"
            />
            <MemoizedTextInput
              style={[styles.input, {color: textColor, backgroundColor: backgroundColor}]}
              placeholder={t('deposit_optional')}
              placeholderTextColor="#9CA3AF"
              value={formData.deposit}
              onChangeText={(value) => handleInputChange('deposit', value)}
              keyboardType="numeric"
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