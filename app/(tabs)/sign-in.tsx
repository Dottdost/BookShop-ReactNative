import API_URL from "@/.expo/config/api";
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
      Alert.alert("Error", "All fields are required");
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
        "Login failed",
        error.response?.data?.message || "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <View style={styles.logoCircle}>
          <Ionicons name="book" size={36} color="#8b5cf6" />
        </View>
        <Text style={styles.logo}>Cheshire Shelf</Text>
        <Text style={styles.tagline}>Your world of stories awaits</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Welcome back</Text>

        <View style={styles.inputWrapper}>
          <Ionicons
            name="person-outline"
            size={18}
            color="#555"
            style={styles.inputIcon}
          />
          <TextInput
            placeholder="Username"
            placeholderTextColor="#555"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputWrapper}>
          <Ionicons
            name="lock-closed-outline"
            size={18}
            color="#555"
            style={styles.inputIcon}
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor="#555"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            secureTextEntry={!showPass}
          />
          <TouchableOpacity
            onPress={() => setShowPass(!showPass)}
            style={styles.eyeBtn}
          >
            <Ionicons
              name={showPass ? "eye-off-outline" : "eye-outline"}
              size={18}
              color="#555"
            />
          </TouchableOpacity>
        </View>

        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.primaryBtnText}>Signing in...</Text>
            ) : (
              <>
                <Ionicons name="log-in-outline" size={20} color="white" />
                <Text style={styles.primaryBtnText}>Sign In</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          onPress={() => router.push("/sign-up")}
          style={styles.linkRow}
        >
          <Text style={styles.linkText}>Don't have an account? </Text>
          <Text style={styles.linkAccent}>Sign up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0b10",
    justifyContent: "center",
    padding: 24,
  },
  topSection: {
    alignItems: "center",
    marginBottom: 36,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(139,92,246,0.12)",
    borderWidth: 2,
    borderColor: "rgba(139,92,246,0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  logo: {
    color: "#a78bfa",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  tagline: {
    color: "#555",
    fontSize: 14,
    marginTop: 4,
  },
  card: {
    backgroundColor: "#13131f",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.15)",
  },
  cardTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0b0b10",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.2)",
    marginBottom: 14,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    color: "white",
    fontSize: 15,
    paddingVertical: 14,
  },
  eyeBtn: { padding: 4 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7c3aed",
    borderRadius: 14,
    paddingVertical: 16,
    gap: 10,
    marginTop: 4,
  },
  primaryBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  linkText: { color: "#555", fontSize: 14 },
  linkAccent: { color: "#8b5cf6", fontSize: 14, fontWeight: "600" },
});
