import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type GenreItem = {
  key: string;
  label: string;
  icon: string;
};

type QuickAction = {
  title: string;
  subtitle: string;
  icon: string;
  route: string;
};

type FeatureItem = {
  title: string;
  subtitle: string;
  icon: string;
};

export default function HomeScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [activeGenre, setActiveGenre] = useState("romance");

  const headerAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(22)).current;

  const genres: GenreItem[] = [
    { key: "romance", label: t("homeScreen.romance"), icon: "heart-outline" },
    { key: "mystery", label: t("homeScreen.mystery"), icon: "search-outline" },
    { key: "dark", label: t("homeScreen.darkFiction"), icon: "moon-outline" },
    {
      key: "fantasy",
      label: t("homeScreen.fantasy"),
      icon: "sparkles-outline",
    },
  ];

  const quickActions: QuickAction[] = [
    {
      title: "Browse library",
      subtitle: "Find your next favorite book",
      icon: "library-outline",
      route: "/books",
    },
    {
      title: "My cart",
      subtitle: "Continue your checkout",
      icon: "cart-outline",
      route: "/cart",
    },
    {
      title: "Wishlist",
      subtitle: "Return to saved stories",
      icon: "heart-outline",
      route: "/wishlist",
    },
    {
      title: "My orders",
      subtitle: "Track your book orders",
      icon: "bag-check-outline",
      route: "/orders",
    },
  ];

  const features: FeatureItem[] = [
    {
      title: "Personal shelf",
      subtitle:
        "Save books, build your wishlist and keep everything in one place.",
      icon: "bookmark-outline",
    },
    {
      title: "Fast checkout",
      subtitle: "Add your address, card and promo code in a few taps.",
      icon: "flash-outline",
    },
    {
      title: "Live order updates",
      subtitle: "Order status refreshes automatically while you wait.",
      icon: "sync-outline",
    },
  ];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 750,
        useNativeDriver: false,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 750,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  const goTo = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <FlatList
        data={[]}
        keyExtractor={() => "home"}
        renderItem={() => null}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Animated.View
              style={[
                styles.hero,
                {
                  opacity: headerAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.heroTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.greeting, { color: theme.accent }]}>
                    {t("homeScreen.greeting")}
                  </Text>

                  <Text style={[styles.heroTitle, { color: theme.text }]}>
                    {t("homeScreen.title")}
                  </Text>

                  <Text style={[styles.heroSubtitle, { color: theme.text3 }]}>
                    Discover, save, order and track your books in one cozy
                    shelf.
                  </Text>
                </View>

                <View
                  style={[
                    styles.catIcon,
                    {
                      backgroundColor: theme.accentBg,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Ionicons name="paw-outline" size={26} color={theme.accent} />
                </View>
              </View>

              <View
                style={[
                  styles.statsRow,
                  { backgroundColor: theme.bg2, borderColor: theme.border },
                ]}
              >
                {[
                  {
                    icon: "library-outline",
                    num: "2.4k",
                    label: t("homeScreen.books"),
                  },
                  {
                    icon: "people-outline",
                    num: "18k",
                    label: t("homeScreen.readers"),
                  },
                  {
                    icon: "star-outline",
                    num: "4.9",
                    label: t("homeScreen.rating"),
                  },
                ].map((item, index) => (
                  <View key={item.label} style={styles.statWrap}>
                    {index > 0 && (
                      <View
                        style={[
                          styles.statDivider,
                          { backgroundColor: theme.border },
                        ]}
                      />
                    )}

                    <View style={styles.statCard}>
                      <Ionicons
                        name={item.icon as any}
                        size={20}
                        color={theme.accent}
                      />

                      <Text style={[styles.statNum, { color: theme.text }]}>
                        {item.num}
                      </Text>

                      <Text style={[styles.statLabel, { color: theme.text3 }]}>
                        {item.label}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </Animated.View>

            <TouchableOpacity
              style={[
                styles.searchBar,
                { backgroundColor: theme.bg2, borderColor: theme.border },
              ]}
              activeOpacity={0.85}
              onPress={() => goTo("/books")}
            >
              <Ionicons name="search-outline" size={18} color={theme.text3} />

              <Text style={[styles.searchPlaceholder, { color: theme.text3 }]}>
                {t("homeScreen.searchPlaceholder")}
              </Text>

              <View
                style={[
                  styles.searchFilter,
                  { backgroundColor: theme.accentBg },
                ]}
              >
                <Ionicons
                  name="arrow-forward-outline"
                  size={16}
                  color={theme.accent}
                />
              </View>
            </TouchableOpacity>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {t("homeScreen.genres")}
              </Text>

              <TouchableOpacity
                style={styles.seeAllBtn}
                onPress={() => goTo("/books")}
                activeOpacity={0.85}
              >
                <Text style={[styles.seeAll, { color: theme.accent }]}>
                  {t("homeScreen.seeAll")}
                </Text>

                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={theme.accent}
                />
              </TouchableOpacity>
            </View>

            <FlatList
              data={genres}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.key}
              contentContainerStyle={styles.genreList}
              style={{ marginBottom: 24 }}
              renderItem={({ item }) => {
                const active = activeGenre === item.key;

                return (
                  <TouchableOpacity
                    onPress={() => setActiveGenre(item.key)}
                    style={[
                      styles.genreChip,
                      {
                        backgroundColor: active ? theme.accent : theme.bg2,
                        borderColor: active ? theme.accent : theme.border,
                      },
                    ]}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={14}
                      color={active ? "white" : theme.text2}
                    />

                    <Text
                      style={[
                        styles.genreText,
                        {
                          color: active ? "white" : theme.text2,
                          fontWeight: active ? "700" : "500",
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Reading hub
              </Text>
            </View>

            <View style={styles.quickGrid}>
              {quickActions.map((item) => (
                <TouchableOpacity
                  key={item.title}
                  activeOpacity={0.85}
                  onPress={() => goTo(item.route)}
                  style={[
                    styles.quickCard,
                    {
                      backgroundColor: theme.bg2,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.quickIcon,
                      { backgroundColor: theme.accentBg },
                    ]}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={21}
                      color={theme.accent}
                    />
                  </View>

                  <Text style={[styles.quickTitle, { color: theme.text }]}>
                    {item.title}
                  </Text>

                  <Text
                    style={[styles.quickSubtitle, { color: theme.text3 }]}
                    numberOfLines={2}
                  >
                    {item.subtitle}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Why Cheshire Shelf?
              </Text>
            </View>

            <View style={styles.featureList}>
              {features.map((item) => (
                <View
                  key={item.title}
                  style={[
                    styles.featureCard,
                    {
                      backgroundColor: theme.bg2,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.featureIcon,
                      { backgroundColor: theme.accentBg },
                    ]}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={theme.accent}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.featureTitle, { color: theme.text }]}>
                      {item.title}
                    </Text>

                    <Text
                      style={[styles.featureSubtitle, { color: theme.text3 }]}
                    >
                      {item.subtitle}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <View
              style={[
                styles.finalCard,
                {
                  backgroundColor: theme.accentBg,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.finalTextBox}>
                <Text style={[styles.finalTitle, { color: theme.text }]}>
                  Ready for a new story?
                </Text>

                <Text style={[styles.finalSubtitle, { color: theme.text2 }]}>
                  Open the library and choose your next read without random
                  recommendations on the home page.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.finalBtn, { backgroundColor: theme.accent }]}
                activeOpacity={0.85}
                onPress={() => goTo("/books")}
              >
                <Text style={styles.finalBtnText}>Go to books</Text>

                <Ionicons name="arrow-forward" size={15} color="white" />
              </TouchableOpacity>
            </View>

            <View style={{ height: 44 }} />
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 26,
  },

  hero: {
    paddingHorizontal: 14,
    marginBottom: 18,
  },

  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    gap: 12,
  },

  greeting: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 6,
  },

  heroTitle: {
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 34,
    letterSpacing: 0.3,
  },

  heroSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },

  catIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  statsRow: {
    flexDirection: "row",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    alignItems: "center",
  },

  statWrap: {
    flexDirection: "row",
    flex: 1,
  },

  statCard: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },

  statNum: {
    fontSize: 18,
    fontWeight: "900",
  },

  statLabel: {
    fontSize: 11,
  },

  statDivider: {
    width: 1,
    height: 40,
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 24,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    gap: 10,
  },

  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
  },

  searchFilter: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
  },

  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },

  seeAll: {
    fontSize: 13,
    fontWeight: "700",
  },

  genreList: {
    paddingHorizontal: 14,
    gap: 10,
  },

  genreChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },

  genreText: {
    fontSize: 13,
  },

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    gap: 12,
    marginBottom: 24,
  },

  quickCard: {
    width: "48%",
    minHeight: 138,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },

  quickIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  quickTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 5,
  },

  quickSubtitle: {
    fontSize: 12,
    lineHeight: 17,
  },

  featureList: {
    paddingHorizontal: 14,
    gap: 12,
    marginBottom: 24,
  },

  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },

  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  featureTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 4,
  },

  featureSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },

  finalCard: {
    marginHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 16,
  },

  finalTextBox: {
    gap: 6,
  },

  finalTitle: {
    fontSize: 20,
    fontWeight: "900",
  },

  finalSubtitle: {
    fontSize: 13,
    lineHeight: 19,
  },

  finalBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
  },

  finalBtnText: {
    color: "white",
    fontSize: 13,
    fontWeight: "900",
  },
});
