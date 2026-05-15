import { Ionicons } from "@expo/vector-icons";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { useNavigation } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

function BurgerButton({ onPress }: { onPress: () => void }) {
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
          { transform: [{ translateY: topY }, { rotate: topRotDeg }] },
        ]}
      />
      <Animated.View style={[styles.line, { opacity: mid }]} />
      <Animated.View
        style={[
          styles.line,
          { transform: [{ translateY: botY }, { rotate: botRotDeg }] },
        ]}
      />
    </TouchableOpacity>
  );
}

function CustomHeader({ title }: { title: string }) {
  const navigation = useNavigation<DrawerNavigationProp<any>>();

  return (
    <View style={styles.header}>
      <BurgerButton onPress={() => navigation.openDrawer()} />
      <Text style={styles.headerTitle}>{title}</Text>
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={() => navigation.navigate("profile")}
      >
        <Ionicons name="person-outline" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}

export default function Layout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: true,
        header: ({ options }) => (
          <CustomHeader title={options.title ?? "Cheshire Shelf"} />
        ),
        drawerStyle: {
          backgroundColor: "#13131a",
          width: 260,
        },
        overlayColor: "rgba(0,0,0,0.5)",
        drawerLabelStyle: {
          color: "white",
          fontSize: 16,
        },
        drawerActiveTintColor: "#8b5cf6",
        drawerInactiveTintColor: "#aaa",
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: "Cheshire Shelf",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="books"
        options={{
          title: "Books",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="about"
        options={{
          title: "About Us",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="information-circle" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="contacts"
        options={{
          title: "Contacts",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="call" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="profile"
        options={{
          title: "Profile",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="wishlist"
        options={{
          title: "Wishlist",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="heart" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="sign-in"
        options={{
          title: "Sign In",
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="sign-up"
        options={{
          title: "Sign Up",
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="book/[id]"
        options={{
          title: "Book",
          drawerItemStyle: { display: "none" },
        }}
      />
      <Drawer.Screen
        name="cart"
        options={{
          title: "Cart",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="cart-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="checkout"
        options={{
          title: "Checkout",
          drawerItemStyle: { display: "none" },
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 80,
    backgroundColor: "#0b0b10",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(139,92,246,0.25)",
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(139,92,246,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  burgerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(139,92,246,0.15)",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  line: {
    width: 18,
    height: 2,
    borderRadius: 2,
    backgroundColor: "white",
  },
});
