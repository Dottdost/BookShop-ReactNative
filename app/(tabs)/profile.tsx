import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

//localStorage на вебе, SecureStore на мобилке
const storage = {
  get: async (key: string) => {
    if (Platform.OS === "web") return localStorage.getItem(key);
    const SS = await import("expo-secure-store");
    return SS.getItemAsync(key);
  },
  delete: async (key: string) => {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return;
    }
    const SS = await import("expo-secure-store");
    return SS.deleteItemAsync(key);
  },
};

export default function Profile() {
  const [loggedIn, setLoggedIn] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useFocusEffect(
    useCallback(() => {
      checkAuth();
    }, []),
  );

  const animate = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const checkAuth = async () => {
    const token = await storage.get("token");
    setLoggedIn(!!token);
    animate();
  };

  const logout = async () => {
    await storage.delete("token");
    await storage.delete("userId");
    setLoggedIn(false);
    router.replace("/sign-in");
  };

  if (!loggedIn) {
    return (
      <Animated.View
        style={[
          styles.container,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.iconCircle}>
          <Ionicons name="person-outline" size={48} color="#8b5cf6" />
        </View>

        <Text style={styles.title}> You are not logged in</Text>
        <Text style={styles.subtitle}>
          Sign in to access your shelf, orders and wishlist
        </Text>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push("/sign-in")}
        >
          <Ionicons name="log-in-outline" size={20} color="white" />
          <Text style={styles.primaryBtnText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push("/sign-up")}
        >
          <Ionicons name="person-add-outline" size={20} color="#8b5cf6" />
          <Text style={styles.secondaryBtnText}>Create Account</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.avatarWrapper}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={48} color="#8b5cf6" />
        </View>
        <View style={styles.onlineDot} />
      </View>

      <Text style={styles.title}>Welcome back ✨</Text>
      <Text style={styles.subtitle}>You are signed in to Cheshire Shelf</Text>

      <View style={styles.divider} />

      <View style={styles.menuCard}>
        <TouchableOpacity
          style={styles.menuItem}
          // onPress={() => router.push("/orders")}
        >
          <Ionicons name="bag-outline" size={20} color="#8b5cf6" />
          <Text style={styles.menuText}>My Orders</Text>
          <Ionicons name="chevron-forward" size={16} color="#555" />
        </TouchableOpacity>
        <View style={styles.menuDivider} />
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/wishlist")}
        >
          <Ionicons name="heart-outline" size={20} color="#8b5cf6" />
          <Text style={styles.menuText}>Wishlist</Text>
          <Ionicons name="chevron-forward" size={16} color="#555" />
        </TouchableOpacity>
        <View style={styles.menuDivider} />
        <TouchableOpacity
          style={styles.menuItem}
          // onPress={() => router.push("/settings")}
        >
          <Ionicons name="settings-outline" size={20} color="#8b5cf6" />
          <Text style={styles.menuText}>Settings</Text>
          <Ionicons name="chevron-forward" size={16} color="#555" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color="#f87171" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0b10",
    alignItems: "center",
    padding: 24,
    paddingTop: 60,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(139,92,246,0.1)",
    borderWidth: 2,
    borderColor: "rgba(139,92,246,0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(139,92,246,0.1)",
    borderWidth: 2,
    borderColor: "#7c3aed",
    justifyContent: "center",
    alignItems: "center",
  },
  onlineDot: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#0b0b10",
  },
  title: {
    color: "white",
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  subtitle: {
    color: "#555",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(139,92,246,0.15)",
    marginVertical: 28,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    backgroundColor: "#7c3aed",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    marginBottom: 12,
  },
  primaryBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    backgroundColor: "transparent",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.4)",
    gap: 10,
  },
  secondaryBtnText: {
    color: "#8b5cf6",
    fontWeight: "700",
    fontSize: 16,
  },
  menuCard: {
    width: "100%",
    backgroundColor: "#13131f",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.15)",
    overflow: "hidden",
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 14,
  },
  menuText: {
    flex: 1,
    color: "white",
    fontSize: 15,
    fontWeight: "500",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginHorizontal: 18,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "rgba(248,113,113,0.08)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.2)",
  },
  logoutText: {
    color: "#f87171",
    fontWeight: "600",
    fontSize: 15,
  },
});
