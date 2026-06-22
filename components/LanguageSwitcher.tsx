import { changeAppLanguage, languages, type AppLanguage } from "@/i18n";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";

export default function LanguageSwitcher() {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const [changing, setChanging] = useState(false);

  const currentLanguage = languages.includes(i18n.language as AppLanguage)
    ? (i18n.language as AppLanguage)
    : "en";

  const switchLanguage = async () => {
    if (changing) return;

    const currentIndex = languages.indexOf(currentLanguage);
    const nextLanguage = languages[(currentIndex + 1) % languages.length];

    try {
      setChanging(true);
      await changeAppLanguage(nextLanguage);
    } finally {
      setChanging(false);
    }
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={t("language.label")}
      activeOpacity={0.75}
      onPress={switchLanguage}
      style={[
        styles.button,
        {
          backgroundColor: theme.accentBg,
          borderColor: theme.border,
        },
      ]}
    >
      <Ionicons name="language-outline" size={16} color={theme.accent} />
      <Text style={[styles.text, { color: theme.text }]}>
        {t("language.short")}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 38,
    minWidth: 58,
    paddingHorizontal: 10,
    borderRadius: 19,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  text: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
