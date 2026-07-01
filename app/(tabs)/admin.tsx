import { useAuth } from "@/app/hooks/useAuth";
import BookManager from "@/components/admin/BookManager";
import GenreManager from "@/components/admin/GenreManager";
import OrderManager from "@/components/admin/OrderManager";
import PromoManager from "@/components/admin/PromoManager";
import PublisherManager from "@/components/admin/PublisherManager";
import SupportManager from "@/components/admin/SupportManager";
import UserManager from "@/components/admin/UserManager";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const TABS = [
  { key: "books", label: "Books", icon: "book-outline" },
  { key: "users", label: "Users", icon: "people-outline" },
  { key: "orders", label: "Orders", icon: "receipt-outline" },
  { key: "support", label: "Support", icon: "chatbubbles-outline" },
  { key: "promos", label: "Promos", icon: "pricetag-outline" },
  { key: "genres", label: "Genres", icon: "bookmark-outline" },
  { key: "publishers", label: "Publishers", icon: "business-outline" },
];

export default function AdminPanel() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { isAdmin, isSuperAdmin, loading } = useAuth();

  const [activeTab, setActiveTab] = useState("books");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: false,
      }).start();
    }, []),
  );

  if (loading) {
    return (
      <View style={[s.deniedContainer, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={[s.deniedContainer, { backgroundColor: theme.bg }]}>
        <Ionicons name="lock-closed-outline" size={64} color={theme.text3} />

        <Text style={[s.denied, { color: theme.text }]}>
          {t("adminScreen.accessDenied")}
        </Text>

        <Text style={[s.deniedSub, { color: theme.text3 }]}>
          {t("adminScreen.privilegesRequired")}
        </Text>

        <TouchableOpacity
          style={[s.backBtn, { backgroundColor: theme.accent }]}
          onPress={() => router.replace("/profile")}
        >
          <Text style={s.backBtnText}>{t("adminScreen.goBack")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        s.container,
        {
          backgroundColor: theme.bg,
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={[s.header, { borderBottomColor: theme.border }]}>
        <View style={{ flex: 1 }}>
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

      <View style={[s.tabsWrapper, { borderBottomColor: theme.border }]}>
        <View style={s.tabsGrid}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;

            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.85}
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
                  size={14}
                  color={active ? "white" : theme.text2}
                />

                <Text
                  style={[
                    s.tabText,
                    {
                      color: active ? "white" : theme.text2,
                      fontWeight: active ? "800" : "500",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={s.content}>
        {activeTab === "books" && <BookManager />}
        {activeTab === "users" && <UserManager />}
        {activeTab === "orders" && <OrderManager />}
        {activeTab === "support" && <SupportManager />}
        {activeTab === "promos" && <PromoManager />}
        {activeTab === "genres" && <GenreManager />}
        {activeTab === "publishers" && <PublisherManager />}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },

  deniedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  denied: {
    fontSize: 22,
    fontWeight: "900",
    marginTop: 16,
    textAlign: "center",
  },

  deniedSub: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },

  backBtn: {
    marginTop: 24,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
  },

  backBtnText: {
    color: "white",
    fontWeight: "800",
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
    fontSize: 24,
    fontWeight: "900",
  },

  headerRole: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 3,
  },

  shield: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },

  tabsWrapper: {
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  tabsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  tab: {
    width: "31.5%",
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },

  tabText: {
    fontSize: 12,
    maxWidth: 78,
  },

  content: {
    flex: 1,
    padding: 16,
  },
});
