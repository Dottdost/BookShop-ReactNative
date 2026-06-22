import { useAuth } from "@/app/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
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
  const { theme } = useTheme();
  const [loggedIn, setLoggedIn] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const { isAdmin } = useAuth();

  useFocusEffect(
    useCallback(() => {
      checkAuth();
    }, []),
  );

  const animate = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
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
          {
            backgroundColor: theme.bg,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: theme.accentBg, borderColor: theme.border },
          ]}
        >
          <Ionicons name="person-outline" size={48} color={theme.accent} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>
          You're not logged in
        </Text>
        <Text style={[styles.subtitle, { color: theme.text3 }]}>
          Sign in to access your shelf, orders and wishlist
        </Text>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
          onPress={() => router.push("/sign-in")}
        >
          <Ionicons name="log-in-outline" size={20} color="white" />
          <Text style={styles.primaryBtnText}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: theme.border }]}
          onPress={() => router.push("/sign-up")}
        >
          <Ionicons name="person-add-outline" size={20} color={theme.accent} />
          <Text style={[styles.secondaryBtnText, { color: theme.accent }]}>
            Create Account
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.bg,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.avatarWrapper}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: theme.accentBg, borderColor: theme.accent },
          ]}
        >
          <Ionicons name="person" size={48} color={theme.accent} />
        </View>
        <View style={[styles.onlineDot, { borderColor: theme.bg }]} />
      </View>

      <Text style={[styles.title, { color: theme.text }]}>Welcome back</Text>
      <Text style={[styles.subtitle, { color: theme.text3 }]}>
        You are signed in to Cheshire Shelf
      </Text>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View
        style={[
          styles.menuCard,
          { backgroundColor: theme.bg2, borderColor: theme.border },
        ]}
      >
        {[
          { icon: "bag-outline", label: "My Orders", onPress: () => {} },
          {
            icon: "heart-outline",
            label: "Wishlist",
            onPress: () => router.push("/wishlist"),
          },
          {
            icon: "cart-outline",
            label: "Cart",
            onPress: () => router.push("/cart"),
          },
          { icon: "settings-outline", label: "Settings", onPress: () => {} },
          ...(isAdmin
            ? [
                {
                  icon: "shield-outline",
                  label: "Admin Panel",
                  onPress: () => router.push("/admin"),
                },
              ]
            : []),
        ].map((item, i, arr) => (
          <View key={item.label}>
            <TouchableOpacity style={styles.menuItem} onPress={item.onPress}>
              <Ionicons
                name={item.icon as any}
                size={20}
                color={item.label === "Admin Panel" ? "#f59e0b" : theme.accent}
              />
              <Text style={[styles.menuText, { color: theme.text }]}>
                {item.label}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.text3} />
            </TouchableOpacity>
            {i < arr.length - 1 && (
              <View
                style={[styles.menuDivider, { backgroundColor: theme.border }]}
              />
            )}
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color="#f87171" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", padding: 24, paddingTop: 40 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  avatarWrapper: { position: "relative", marginBottom: 24 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
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
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  subtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  divider: { width: "100%", height: 1, marginVertical: 28 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    marginBottom: 12,
  },
  primaryBtnText: { color: "white", fontWeight: "700", fontSize: 16 },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  secondaryBtnText: { fontWeight: "700", fontSize: 16 },
  menuCard: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 14,
  },
  menuText: { flex: 1, fontSize: 15, fontWeight: "500" },
  menuDivider: { height: 1, marginHorizontal: 18 },
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
  logoutText: { color: "#f87171", fontWeight: "600", fontSize: 15 },
});
