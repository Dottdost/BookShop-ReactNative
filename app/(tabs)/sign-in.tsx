import API_URL from "@/.expo/config/api";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

const storage = {
  set: async (key: string, value: string) => {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }
    const SS = await import("expo-secure-store");
    return SS.setItemAsync(key, value);
  },
};

export default function SignIn() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
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

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert(t("common.error"), t("auth.allFieldsRequired"));
      return;
    }
    pressAnim();
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/api/v1/Auth/Login`, {
        username,
        password,
      });
      const token = response.data.data.accessToken;
      const userId = response.data.data.userId;
      await storage.set("token", token);
      await storage.set("userId", userId);
      router.replace("/profile");
    } catch (error: any) {
      Alert.alert(
        t("auth.loginFailed"),
        error.response?.data?.message || t("common.somethingWentWrong"),
      );
    } finally {
      setLoading(false);
    }
  };

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
        <Text style={[styles.logo, { color: theme.accent }]}>Cheshire Shelf</Text>
        <Text style={[styles.tagline, { color: theme.text3 }]}> 
          {t("auth.signInTagline")}
        </Text>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: theme.bg2, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: theme.text }]}> 
          {t("auth.welcomeBack")}
        </Text>

        <View
          style={[
            styles.inputWrapper,
            { backgroundColor: theme.bg, borderColor: theme.border },
          ]}
        >
          <Ionicons
            name="person-outline"
            size={18}
            color={theme.text3}
            style={styles.inputIcon}
          />
          <TextInput
            placeholder={t("auth.username")}
            placeholderTextColor={theme.text3}
            value={username}
            onChangeText={setUsername}
            style={[styles.input, { color: theme.text }]}
            autoCapitalize="none"
          />
        </View>

        <View
          style={[
            styles.inputWrapper,
            { backgroundColor: theme.bg, borderColor: theme.border },
          ]}
        >
          <Ionicons
            name="lock-closed-outline"
            size={18}
            color={theme.text3}
            style={styles.inputIcon}
          />
          <TextInput
            placeholder={t("auth.password")}
            placeholderTextColor={theme.text3}
            value={password}
            onChangeText={setPassword}
            style={[styles.input, { color: theme.text }]}
            secureTextEntry={!showPass}
          />
          <TouchableOpacity
            onPress={() => setShowPass(!showPass)}
            style={styles.eyeBtn}
          >
            <Ionicons
              name={showPass ? "eye-off-outline" : "eye-outline"}
              size={18}
              color={theme.text3}
            />
          </TouchableOpacity>
        </View>

        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.primaryBtnText}>{t("auth.signingIn")}</Text>
            ) : (
              <>
                <Ionicons name="log-in-outline" size={20} color="white" />
                <Text style={styles.primaryBtnText}>{t("auth.signIn")}</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          onPress={() => router.push("/sign-up")}
          style={styles.linkRow}
        >
          <Text style={[styles.linkText, { color: theme.text3 }]}> 
            {t("auth.noAccount")} {" "}
          </Text>
          <Text style={[styles.linkAccent, { color: theme.accent }]}> 
            {t("auth.signUp")}
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
    marginBottom: 14,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, paddingVertical: 14 },
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
