import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import az from "./az";
import en from "./en";
import ru from "./ru";

export const LANGUAGE_STORAGE_KEY = "app_language";

export const languages = ["en", "ru", "az"] as const;
export type AppLanguage = (typeof languages)[number];

const resources = {
  en: { translation: en },
  ru: { translation: ru },
  az: { translation: az },
};

const isAppLanguage = (value: string | null): value is AppLanguage => {
  return languages.includes(value as AppLanguage);
};

const getDeviceLanguage = (): AppLanguage => {
  const languageCode = Localization.getLocales()[0]?.languageCode;

  if (languageCode === "ru" || languageCode === "az" || languageCode === "en") {
    return languageCode;
  }

  return "en";
};

export const initI18n = async () => {
  if (i18n.isInitialized) {
    return i18n;
  }

  const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  const language = isAppLanguage(savedLanguage) ? savedLanguage : getDeviceLanguage();

  await i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: "en",
    compatibilityJSON: "v4",
    interpolation: {
      escapeValue: false,
    },
  });

  return i18n;
};

export const changeAppLanguage = async (language: AppLanguage) => {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  await i18n.changeLanguage(language);
};

export default i18n;
