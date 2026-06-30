import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

export default function Contacts() {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.bg2, borderColor: theme.border },
        ]}
      >
        <View style={[styles.iconCircle, { backgroundColor: theme.accentBg }]}>
          <Ionicons name="mail-outline" size={34} color={theme.accent} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>
          {t("contactsScreen.title")}
        </Text>
        <Text style={[styles.subtitle, { color: theme.text3 }]}>
          {t("contactsScreen.subtitle")}
        </Text>

        <View style={[styles.infoBox, { borderColor: theme.border }]}>
          <Text style={[styles.infoLabel, { color: theme.text3 }]}>
            {t("contactsScreen.email")}
          </Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>
            support@cheshireshelf.com
          </Text>
        </View>

        <View style={[styles.infoBox, { borderColor: theme.border }]}>
          <Text style={[styles.infoLabel, { color: theme.text3 }]}>
            {t("contactsScreen.phone")}
          </Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>
            +994 00 000 00 00
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
  },
  iconCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 18,
  },
  infoBox: {
    width: "100%",
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 14,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "700",
  },
});
