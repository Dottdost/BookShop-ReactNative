import { useTheme } from "@/context/ThemeContext";
import { changeAppLanguage, languages, type AppLanguage } from "@/i18n";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
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
      <Ionicons name="language-outline" size={20} color={theme.accent} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
