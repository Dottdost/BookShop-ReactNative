import { useAuth } from "@/app/hooks/useAuth";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SupportChatWidget from "@/components/support/SupportChatWidget";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { useNavigation } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

const STATUS_BAR_HEIGHT = Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0;
const HEADER_SAFE_TOP = Platform.OS === "android" ? STATUS_BAR_HEIGHT + 44 : 38;
const HEADER_HEIGHT = Platform.OS === "android" ? STATUS_BAR_HEIGHT + 142 : 132;

function CheshireGif() {
  return (
    <View style={styles.gifWrap}>
      <Image
        source={require("../../assets/images/sticker.webp")}
        style={styles.cheshireGif}
        resizeMode="contain"
      />
    </View>
  );
}

function BurgerButton({
  onPress,
  lineColor,
}: {
  onPress: () => void;
  lineColor: string;
}) {
  const [open, setOpen] = useState(false);
  const mid = useRef(new Animated.Value(1)).current;
  const topRot = useRef(new Animated.Value(0)).current;
  const botRot = useRef(new Animated.Value(0)).current;
  const topY = useRef(new Animated.Value(0)).current;
  const botY = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const toOpen = !open;
    setOpen(toOpen);
    onPress();

    if (toOpen) {
      Animated.parallel([
        Animated.timing(mid, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(topY, {
          toValue: 8,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(botY, {
          toValue: -8,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.spring(topRot, {
          toValue: 1,
          useNativeDriver: false,
          friction: 6,
        }),
        Animated.spring(botRot, {
          toValue: 1,
          useNativeDriver: false,
          friction: 6,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(mid, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(topY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(botY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.spring(topRot, {
          toValue: 0,
          useNativeDriver: false,
          friction: 6,
        }),
        Animated.spring(botRot, {
          toValue: 0,
          useNativeDriver: false,
          friction: 6,
        }),
      ]).start();
    }
  };

  const topRotDeg = topRot.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  const botRotDeg = botRot.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-45deg"],
  });

  return (
    <TouchableOpacity
      onPress={toggle}
      style={styles.burgerBtn}
      activeOpacity={0.7}
    >
      <Animated.View
        style={[
          styles.line,
          {
            backgroundColor: lineColor,
            transform: [{ translateY: topY }, { rotate: topRotDeg }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.line,
          {
            backgroundColor: lineColor,
            opacity: mid,
          },
        ]}
      />

      <Animated.View
        style={[
          styles.line,
          {
            backgroundColor: lineColor,
            transform: [{ translateY: botY }, { rotate: botRotDeg }],
          },
        ]}
      />
    </TouchableOpacity>
  );
}

function CustomHeader() {
  const navigation = useNavigation<DrawerNavigationProp<Record<string, object | undefined>>>();
  const { theme, toggleTheme } = useTheme();

  return (
    <View
      style={[
        styles.header,
        {
          height: HEADER_HEIGHT,
          paddingTop: HEADER_SAFE_TOP,
          backgroundColor: theme.headerBg,
          borderBottomColor: theme.border,
        },
      ]}
    >
      <BurgerButton
        onPress={() => navigation.openDrawer()}
        lineColor={theme.text}
      />

      <TouchableOpacity
        onPress={() => navigation.navigate("index")}
        activeOpacity={0.8}
        style={styles.logoBtn}
      >
        <CheshireGif />
      </TouchableOpacity>

      <View style={styles.headerRight}>
        <LanguageSwitcher />

        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: theme.accentBg }]}
          onPress={toggleTheme}
        >
          <Ionicons
            name={theme.dark ? "sunny-outline" : "moon-outline"}
            size={24}
            color={theme.accent}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: theme.accentBg }]}
          onPress={() => navigation.navigate("profile")}
        >
          <Ionicons name="person-outline" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function Layout() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isAdmin, isSuperAdmin } = useAuth();

  const showSupportWidget = !isAdmin && !isSuperAdmin;

  return (
    <View style={styles.root}>
      <Drawer
        screenOptions={{
          headerShown: true,
          header: () => <CustomHeader />,
          drawerStyle: {
            backgroundColor: theme.drawerBg,
            width: 260,
          },
          overlayColor: "rgba(0,0,0,0.5)",
          drawerLabelStyle: {
            color: theme.text,
            fontSize: 16,
          },
          drawerActiveTintColor: theme.accent,
          drawerInactiveTintColor: theme.text2,
        }}
      >
        <Drawer.Screen
          name="index"
          options={{
            title: t("navigation.home"),
            drawerIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />

        <Drawer.Screen
          name="books"
          options={{
            title: t("navigation.books"),
            drawerIcon: ({ color, size }) => (
              <Ionicons name="book" size={size} color={color} />
            ),
          }}
        />

        <Drawer.Screen
          name="about"
          options={{
            title: t("navigation.about"),
            drawerIcon: ({ color, size }) => (
              <Ionicons name="information-circle" size={size} color={color} />
            ),
          }}
        />

        <Drawer.Screen
          name="contacts"
          options={{
            title: t("navigation.contacts"),
            drawerIcon: ({ color, size }) => (
              <Ionicons name="call" size={size} color={color} />
            ),
          }}
        />

        <Drawer.Screen
          name="profile"
          options={{
            title: t("navigation.profile"),
            drawerIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />

        <Drawer.Screen
          name="orders"
          options={{
            title: t("profileScreen.myOrders"),
            drawerItemStyle: { display: "none" },
          }}
        />

        <Drawer.Screen
          name="wishlist"
          options={{
            title: t("navigation.wishlist"),
            drawerIcon: ({ color, size }) => (
              <Ionicons name="heart" size={size} color={color} />
            ),
          }}
        />

        <Drawer.Screen
          name="cart"
          options={{
            title: t("navigation.cart"),
            drawerIcon: ({ color, size }) => (
              <Ionicons name="cart-outline" size={size} color={color} />
            ),
          }}
        />

        <Drawer.Screen
          name="sign-in"
          options={{
            title: t("navigation.signIn"),
            drawerItemStyle: { display: "none" },
          }}
        />

        <Drawer.Screen
          name="sign-up"
          options={{
            title: t("navigation.signUp"),
            drawerItemStyle: { display: "none" },
          }}
        />

        <Drawer.Screen
          name="book/[id]"
          options={{
            title: t("navigation.book"),
            drawerItemStyle: { display: "none" },
          }}
        />

        <Drawer.Screen
          name="checkout"
          options={{
            title: t("navigation.checkout"),
            drawerItemStyle: { display: "none" },
          }}
        />

        <Drawer.Screen
          name="admin"
          options={{
            title: t("navigation.admin"),
            drawerIcon: ({ color, size }) => (
              <Ionicons name="shield-outline" size={size} color={color} />
            ),
          }}
        />
      </Drawer>

      {showSupportWidget && <SupportChatWidget />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 26,
    borderBottomWidth: 1,
  },

  logoBtn: {
    position: "absolute",
    left: "50%",
    marginLeft: -76,
    width: 152,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    bottom: 24,
  },

  gifWrap: {
    width: 152,
    height: 80,
    borderRadius: 0,
    overflow: "visible",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },

  cheshireGif: {
    width: 152,
    height: 80,
    opacity: 0.98,
  },

  headerRight: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },

  iconBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
  },

  burgerBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },

  line: {
    width: 24,
    height: 3,
    borderRadius: 3,
  },
});
