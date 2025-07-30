import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import en from './en.json';
import gu from './gu.json';
import hi from './hi.json';
import AsyncStorage from '@react-native-async-storage/async-storage';

const i18n = new I18n({
  en,
  gu,
  hi,
});

i18n.enableFallback = true;
i18n.defaultLocale = 'en';

// A check to see if we are on the client side
const isClient = typeof window !== 'undefined';

// Load the saved locale
const loadLocale = async () => {
    const locale = await AsyncStorage.getItem('locale');
    i18n.locale = locale || Localization.getLocales()[0].languageCode;
};

if (isClient) {
    loadLocale();
} else {
    // Set a default locale for server-side rendering
    i18n.locale = Localization.getLocales()[0].languageCode;
}


export const setLocale = async (locale) => {
    i18n.locale = locale;
    if (isClient) {
        await AsyncStorage.setItem('locale', locale);
    }
};

export const getLocale = () => i18n.locale;

export const t = (name, params = {}) => i18n.t(name, params);
