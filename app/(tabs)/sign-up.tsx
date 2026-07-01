import { useTheme } from "@/context/ThemeContext";
import API_URL from "@/services/config/api";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function SignUp() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const btnScale = useRef(new Animated.Value(1)).current;

  const pressAnim = () => {
    Animated.sequence([
      Animated.timing(btnScale, {
        toValue: 0.96,
        duration: 80,
        useNativeDriver: false,
      }),
      Animated.spring(btnScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handleRegister = async () => {
    if (!username || !email || !password || !confirmPassword) {
      Alert.alert(t("common.error"), t("auth.allFieldsRequired"));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t("common.error"), t("auth.passwordsDoNotMatch"));
      return;
    }
    pressAnim();
    try {
      setLoading(true);
      await axios.post(
        `${API_URL}/api/v1/Account/Register`,
        {
          username: username.trim(),
          email: email.trim(),
          password,
          confirmPassword,
        },
        { headers: { "Content-Type": "application/json" } },
      );
      Alert.alert(t("common.success"), t("auth.accountCreated"));
      router.replace("/sign-in");
    } catch (error: any) {
      const data = error.response?.data;
      let message = t("common.somethingWentWrong");
      if (
        data?.innerException?.includes("Users.email") ||
        data?.message?.includes("Users.email")
      )
        message = t("auth.emailTaken");
      else if (
        data?.innerException?.includes("Users.username") ||
        data?.message?.includes("Users.username")
      )
        message = t("auth.usernameTaken");
      else if (data?.message) message = data.message;
      Alert.alert(t("auth.registrationFailed"), message);
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    {
      icon: "person-outline",
      placeholder: t("auth.username"),
      value: username,
      set: setUsername,
      secure: false,
      type: "none",
    },
    {
      icon: "mail-outline",
      placeholder: t("auth.email"),
      value: email,
      set: setEmail,
      secure: false,
      type: "email-address",
    },
    {
      icon: "lock-closed-outline",
      placeholder: t("auth.password"),
      value: password,
      set: setPassword,
      secure: !showPass,
      toggle: () => setShowPass(!showPass),
      showToggle: showPass,
    },
    {
      icon: "shield-checkmark-outline",
      placeholder: t("auth.confirmPassword"),
      value: confirmPassword,
      set: setConfirmPassword,
      secure: !showConfirm,
      toggle: () => setShowConfirm(!showConfirm),
      showToggle: showConfirm,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.topSection}>
        <View
          style={[
            styles.logoCircle,
            { backgroundColor: theme.accentBg, borderColor: theme.border },
          ]}
        >
          <Ionicons name="book" size={36} color={theme.accent} />
        </View>
        <Text style={[styles.logo, { color: theme.accent }]}>
          Cheshire Shelf
        </Text>
        <Text style={[styles.tagline, { color: theme.text3 }]}>
          {t("auth.signUpTagline")}
        </Text>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: theme.bg2, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: theme.text }]}>
          {t("auth.createAccount")}
        </Text>

        {fields.map(
          ({
            icon,
            placeholder,
            value,
            set,
            secure,
            type,
            toggle,
            showToggle,
          }) => (
            <View
              key={placeholder}
              style={[
                styles.inputWrapper,
                { backgroundColor: theme.bg, borderColor: theme.border },
              ]}
            >
              <Ionicons
                name={icon as any}
                size={18}
                color={theme.text3}
                style={styles.inputIcon}
              />
              <TextInput
                placeholder={placeholder}
                placeholderTextColor={theme.text3}
                value={value}
                onChangeText={set}
                style={[styles.input, { color: theme.text }]}
                secureTextEntry={secure}
                keyboardType={(type as any) || "default"}
                autoCapitalize="none"
              />
              {toggle && (
                <TouchableOpacity onPress={toggle} style={styles.eyeBtn}>
                  <Ionicons
                    name={showToggle ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={theme.text3}
                  />
                </TouchableOpacity>
              )}
            </View>
          ),
        )}

        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.primaryBtnText}>{t("auth.creating")}</Text>
            ) : (
              <>
                <Ionicons name="person-add-outline" size={20} color="white" />
                <Text style={styles.primaryBtnText}>
                  {t("auth.createAccount")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          onPress={() => router.push("/sign-in")}
          style={styles.linkRow}
        >
          <Text style={[styles.linkText, { color: theme.text3 }]}>
            {t("auth.hasAccount")}{" "}
          </Text>
          <Text style={[styles.linkAccent, { color: theme.accent }]}>
            {t("auth.signIn")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  topSection: { alignItems: "center", marginBottom: 36 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  logo: { fontSize: 30, fontWeight: "800", letterSpacing: 0.5 },
  tagline: { fontSize: 14, marginTop: 4 },
  card: { borderRadius: 24, padding: 24, borderWidth: 1 },
  cardTitle: { fontSize: 20, fontWeight: "700", marginBottom: 20 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 56,
    marginBottom: 14,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  eyeBtn: { padding: 4 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 16,
    gap: 10,
    marginTop: 4,
  },
  primaryBtnText: { color: "white", fontWeight: "700", fontSize: 16 },
  linkRow: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  linkText: { fontSize: 14 },
  linkAccent: { fontSize: 14, fontWeight: "600" },
});
