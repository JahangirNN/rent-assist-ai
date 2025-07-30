import React, { useState } from 'react';
import { View, StyleSheet, Modal, Pressable, TouchableOpacity } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { setLocale, t } from '@/locales/i18n';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
    const [modalVisible, setModalVisible] = useState(false);
    const colorScheme = useColorScheme();
    const router = useRouter();

    const languages = [
        { code: 'en', name: 'English' },
        { code: 'gu', name: 'ગુજરાતી' },
        { code: 'hi', name: 'हिन्दी' },
    ];

    const handleLanguageChange = (langCode) => {
        setLocale(langCode).then(() => {
            setModalVisible(false);
            // Force a re-render to see the language change immediately.
            // A more robust solution might use a state management library.
            router.replace('/(tabs)/settings');
        });
    };

    const currentLanguage = languages.find(lang => lang.code === (t('language') === 'Language' ? 'en' : t('language') === 'ભાષા' ? 'gu' : 'hi'))?.name || 'English';

    return (
        <ThemedView style={styles.container}>
            <ThemedText type="title" style={styles.title}>{t('settings')}</ThemedText>
            
            <View style={styles.settingItem}>
                <ThemedText type="subtitle">{t('language')}</ThemedText>
                <Pressable style={styles.pickerButton} onPress={() => setModalVisible(true)}>
                    <ThemedText>{currentLanguage}</ThemedText>
                </Pressable>
            </View>

            <Modal
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <ThemedView style={styles.modalContent}>
                        <ThemedText type="subtitle" style={styles.modalTitle}>{t('select_language')}</ThemedText>
                        {languages.map(lang => (
                            <TouchableOpacity 
                                key={lang.code} 
                                style={styles.languageOption} 
                                onPress={() => handleLanguageChange(lang.code)}
                            >
                                <ThemedText>{lang.name}</ThemedText>
                            </TouchableOpacity>
                        ))}
                    </ThemedView>
                </View>
            </Modal>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 70,
        paddingHorizontal: 20,
    },
    title: {
        marginBottom: 30,
        textAlign: 'center',
    },
    settingItem: {
        marginBottom: 20,
    },
    pickerButton: {
        padding: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        marginTop: 10,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        width: '80%',
        padding: 20,
        borderRadius: 15,
    },
    modalTitle: {
        marginBottom: 20,
        textAlign: 'center',
    },
    languageOption: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    }
});