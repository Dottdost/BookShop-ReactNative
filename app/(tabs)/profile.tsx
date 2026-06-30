import { useAuth } from "@/app/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const PROFILE_PHOTO_KEY = "cheshire_profile_photo";

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

async function saveProfilePhotoEverywhere(key: string, value: string) {
  try {
    await AsyncStorage.setItem(key, value);
    await AsyncStorage.setItem(PROFILE_PHOTO_KEY, value);
  } catch (e) {
    console.log("AsyncStorage profile photo save failed:", e);
  }

  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(key, value);
      localStorage.setItem(PROFILE_PHOTO_KEY, value);
    } catch (e) {
      console.log("localStorage profile photo save failed:", e);
    }
  }
}

async function getProfilePhotoEverywhere(key: string) {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    const fromLocalUser = localStorage.getItem(key);
    const fromLocalGeneric = localStorage.getItem(PROFILE_PHOTO_KEY);

    if (fromLocalUser) return fromLocalUser;
    if (fromLocalGeneric) return fromLocalGeneric;
  }

  try {
    const fromAsyncUser = await AsyncStorage.getItem(key);
    const fromAsyncGeneric = await AsyncStorage.getItem(PROFILE_PHOTO_KEY);

    return fromAsyncUser || fromAsyncGeneric || "";
  } catch (e) {
    console.log("AsyncStorage profile photo load failed:", e);
    return "";
  }
}

async function removeProfilePhotoEverywhere(key: string) {
  try {
    await AsyncStorage.removeItem(key);
    await AsyncStorage.removeItem(PROFILE_PHOTO_KEY);
  } catch (e) {
    console.log("AsyncStorage profile photo remove failed:", e);
  }

  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(key);
      localStorage.removeItem(PROFILE_PHOTO_KEY);
    } catch (e) {
      console.log("localStorage profile photo remove failed:", e);
    }
  }
}

function getStoredUserIdFallback() {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    return localStorage.getItem("userId") || "";
  }

  return "";
}

export default function Profile() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isAdmin, isSuperAdmin, userId } = useAuth();

  const [loggedIn, setLoggedIn] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const currentUserId = userId || getStoredUserIdFallback() || "guest";
  const profilePhotoKey = `${PROFILE_PHOTO_KEY}_${currentUserId}`;

  useFocusEffect(
    useCallback(() => {
      void checkAuth();
      void loadProfilePhoto();
    }, [currentUserId]),
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
    const accessToken = await storage.get("accessToken");

    setLoggedIn(!!token || !!accessToken);
    animate();
  };

  const loadProfilePhoto = async () => {
    const savedPhoto = await getProfilePhotoEverywhere(profilePhotoKey);
    setProfilePhoto(savedPhoto);
  };

  const pickProfilePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Please allow gallery access to choose a profile photo.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.55,
      base64: true,
    });

    if (result.canceled) return;

    const asset = result.assets[0];

    const photoValue = asset.base64
      ? `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`
      : asset.uri;

    setProfilePhoto(photoValue);
    await saveProfilePhotoEverywhere(profilePhotoKey, photoValue);

    Alert.alert("Saved", "Profile photo updated successfully.");
  };

  const removeProfilePhoto = async () => {
    if (!profilePhoto) {
      Alert.alert("No photo", "You do not have a profile photo yet.");
      return;
    }

    await removeProfilePhotoEverywhere(profilePhotoKey);
    setProfilePhoto("");

    Alert.alert("Removed", "Profile photo removed.");
  };

  const logout = async () => {
    await storage.delete("token");
    await storage.delete("accessToken");
    await storage.delete("refreshToken");
    await storage.delete("userId");

    setLoggedIn(false);
    router.replace("/sign-in");
  };

  if (!loggedIn) {
    return (
      <Animated.ScrollView
        style={[
          styles.scroll,
          {
            backgroundColor: theme.bg,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: theme.accentBg,
              borderColor: theme.border,
            },
          ]}
        >
          <Ionicons name="person-outline" size={48} color={theme.accent} />
        </View>

        <Text style={[styles.title, { color: theme.text }]}>
          {t("profileScreen.notLoggedIn")}
        </Text>

        <Text style={[styles.subtitle, { color: theme.text3 }]}>
          {t("profileScreen.notLoggedInSubtitle")}
        </Text>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
          onPress={() => router.push("/sign-in")}
        >
          <Ionicons name="log-in-outline" size={20} color="white" />

          <Text style={styles.primaryBtnText}>{t("auth.signIn")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: theme.border }]}
          onPress={() => router.push("/sign-up")}
        >
          <Ionicons name="person-add-outline" size={20} color={theme.accent} />

          <Text style={[styles.secondaryBtnText, { color: theme.accent }]}>
            {t("profileScreen.createAccount")}
          </Text>
        </TouchableOpacity>
      </Animated.ScrollView>
    );
  }

  const menuItems = [
    {
      icon: "image-outline",
      label: "Profile photo",
      onPress: pickProfilePhoto,
    },
    {
      icon: "trash-outline",
      label: "Remove profile photo",
      onPress: removeProfilePhoto,
      danger: true,
    },
    {
      icon: "bag-outline",
      label: t("profileScreen.myOrders"),
      onPress: () => router.push("/orders"),
    },
    {
      icon: "heart-outline",
      label: t("profileScreen.wishlist"),
      onPress: () => router.push("/wishlist"),
    },
    {
      icon: "cart-outline",
      label: t("profileScreen.cart"),
      onPress: () => router.push("/cart"),
    },
    ...(isAdmin || isSuperAdmin
      ? [
          {
            icon: "shield-outline",
            label: t("profileScreen.adminPanel"),
            onPress: () => router.push("/admin"),
          },
        ]
      : []),
  ];

  return (
    <Animated.ScrollView
      style={[
        styles.scroll,
        {
          backgroundColor: theme.bg,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.avatarWrapper}
        onPress={pickProfilePhoto}
      >
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: theme.accentBg,
              borderColor: theme.accent,
            },
          ]}
        >
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={48} color={theme.accent} />
          )}
        </View>

        <View style={[styles.editDot, { borderColor: theme.bg }]}>
          <Ionicons name="camera-outline" size={13} color="white" />
        </View>

        <View style={[styles.onlineDot, { borderColor: theme.bg }]} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: theme.text }]}>
        {t("profileScreen.welcomeBack")}
      </Text>

      <Text style={[styles.subtitle, { color: theme.text3 }]}>
        {profilePhoto
          ? "Your profile photo is saved on this device."
          : "Tap the avatar or Profile photo to add your picture."}
      </Text>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View
        style={[
          styles.menuCard,
          {
            backgroundColor: theme.bg2,
            borderColor: theme.border,
          },
        ]}
      >
        {menuItems.map((item, i, arr) => (
          <View key={item.label}>
            <TouchableOpacity style={styles.menuItem} onPress={item.onPress}>
              <Ionicons
                name={item.icon as any}
                size={20}
                color={
                  item.icon === "shield-outline"
                    ? "#f59e0b"
                    : item.danger
                      ? "#f87171"
                      : theme.accent
                }
              />

              <Text
                style={[
                  styles.menuText,
                  { color: item.danger ? "#f87171" : theme.text },
                ]}
              >
                {item.label}
              </Text>

              <Ionicons name="chevron-forward" size={16} color={theme.text3} />
            </TouchableOpacity>

            {i < arr.length - 1 && (
              <View
                style={[
                  styles.menuDivider,
                  {
                    backgroundColor: theme.border,
                  },
                ]}
              />
            )}
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color="#f87171" />

        <Text style={styles.logoutText}>{t("profileScreen.logOut")}</Text>
      </TouchableOpacity>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 40,
    paddingBottom: 120,
  },

  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },

  avatarWrapper: {
    position: "relative",
    marginBottom: 24,
  },

  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 56,
  },

  editDot: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#8b5cf6",
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },

  onlineDot: {
    position: "absolute",
    bottom: 8,
    left: 4,
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
    textAlign: "center",
  },

  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },

  divider: {
    width: "100%",
    height: 1,
    marginVertical: 24,
  },

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
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },

  secondaryBtnText: {
    fontWeight: "700",
    fontSize: 16,
  },

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

  menuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },

  menuDivider: {
    height: 1,
    marginHorizontal: 18,
  },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "rgba(248,113,113,0.08)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.2)",
    marginBottom: 20,
  },

  logoutText: {
    color: "#f87171",
    fontWeight: "600",
    fontSize: 15,
  },
});
