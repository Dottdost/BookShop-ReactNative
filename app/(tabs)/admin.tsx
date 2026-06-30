import { useAuth } from "@/app/hooks/useAuth";
import BookManager from "@/components/admin/BookManager";
import GenreManager from "@/components/admin/GenreManager";
import OrderManager from "@/components/admin/OrderManager";
import PromoManager from "@/components/admin/PromoManager";
import SupportManager from "@/components/admin/SupportManager";
import UserManager from "@/components/admin/UserManager";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

const TABS = [
  { key: "books", labelKey: "adminScreen.books", icon: "book-outline" },
  { key: "users", labelKey: "adminScreen.users", icon: "people-outline" },
  { key: "orders", labelKey: "adminScreen.orders", icon: "receipt-outline" },
  {
    key: "support",
    labelKey: "adminScreen.support",
    icon: "chatbubbles-outline",
  },
  { key: "promos", labelKey: "adminScreen.promos", icon: "pricetag-outline" },
  { key: "genres", labelKey: "adminScreen.genres", icon: "bookmark-outline" },
];

export default function AdminPanel() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isAdmin, isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("books");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }).start();
    }, []),
  );

  if (!isAdmin) {
    return (
      <View
        style={[
          s.container,
          {
            backgroundColor: theme.bg,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <Ionicons name="lock-closed-outline" size={64} color={theme.text3} />

        <Text style={[s.denied, { color: theme.text }]}>
          {t("adminScreen.accessDenied")}
        </Text>

        <Text style={{ color: theme.text3, marginTop: 8, textAlign: "center" }}>
          {t("adminScreen.privilegesRequired")}
        </Text>

        <TouchableOpacity
          style={[s.backBtn, { backgroundColor: theme.accent }]}
          onPress={() => router.replace("/profile")}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>
            {t("adminScreen.goBack")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Animated.View
      style={[s.container, { backgroundColor: theme.bg, opacity: fadeAnim }]}
    >
      <View style={[s.header, { borderBottomColor: theme.border }]}>
        <View>
          <Text style={[s.headerTitle, { color: theme.text }]}>
            {t("adminScreen.adminPanel")}
          </Text>

          <Text style={[s.headerRole, { color: theme.accent }]}>
            {isSuperAdmin
              ? t("adminScreen.superAdmin")
              : t("adminScreen.admin")}
          </Text>
        </View>

        <View
          style={[
            s.shield,
            {
              backgroundColor: theme.accentBg,
              borderColor: theme.border,
            },
          ]}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={22}
            color={theme.accent}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[s.tabBar, { borderBottomColor: theme.border }]}
        contentContainerStyle={{ paddingHorizontal: 14, gap: 8 }}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.key;

          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[
                s.tab,
                {
                  backgroundColor: active ? theme.accent : theme.bg2,
                  borderColor: active ? theme.accent : theme.border,
                },
              ]}
            >
              <Ionicons
                name={tab.icon as any}
                size={13}
                color={active ? "white" : theme.text2}
              />

              <Text
                style={{
                  color: active ? "white" : theme.text2,
                  fontSize: 13,
                  fontWeight: active ? "600" : "400",
                }}
              >
                {t(tab.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={{ flex: 1, padding: 16 }}>
        {activeTab === "books" && <BookManager />}
        {activeTab === "users" && <UserManager />}
        {activeTab === "orders" && <OrderManager />}
        {activeTab === "support" && <SupportManager />}
        {activeTab === "promos" && <PromoManager />}
        {activeTab === "genres" && <GenreManager />}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
  },

  headerRole: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },

  shield: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },

  tabBar: {
    flexGrow: 0,
    borderBottomWidth: 1,
    paddingVertical: 12,
  },

  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },

  denied: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 16,
  },

  backBtn: {
    marginTop: 24,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
  },
});
