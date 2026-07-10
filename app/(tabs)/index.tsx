import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

type IoniconName = keyof typeof Ionicons.glyphMap;

type GenreItem = {
  key: string;
  label: string;
  icon: IoniconName;
};

type QuickAction = {
  title: string;
  subtitle: string;
  icon: IoniconName;
  route: Href;
};

type FeatureItem = {
  title: string;
  subtitle: string;
  icon: IoniconName;
};

const TEXT_SCALE = 1.08;

export default function HomeScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();

  const [activeGenre, setActiveGenre] = useState("romance");

  const headerAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  const isSmallPhone = width < 380;
  const isLargePhone = width >= 430;
  const sidePadding = isSmallPhone ? 16 : 20;
  const quickGap = 12;
  const quickCardWidth = (width - sidePadding * 2 - quickGap) / 2;

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
      title: t("homeScreen.browseLibrary"),
      subtitle: t("homeScreen.browseLibrarySubtitle"),
      icon: "library-outline",
      route: "/books",
    },
    {
      title: t("homeScreen.myCart"),
      subtitle: t("homeScreen.myCartSubtitle"),
      icon: "cart-outline",
      route: "/cart",
    },
    {
      title: t("homeScreen.wishlist"),
      subtitle: t("homeScreen.wishlistSubtitle"),
      icon: "heart-outline",
      route: "/wishlist",
    },
    {
      title: t("homeScreen.myOrders"),
      subtitle: t("homeScreen.myOrdersSubtitle"),
      icon: "bag-check-outline",
      route: "/orders",
    },
  ];

  const features: FeatureItem[] = [
    {
      title: t("homeScreen.personalShelf"),
      subtitle: t("homeScreen.personalShelfSubtitle"),
      icon: "bookmark-outline",
    },
    {
      title: t("homeScreen.fastCheckout"),
      subtitle: t("homeScreen.fastCheckoutSubtitle"),
      icon: "flash-outline",
    },
    {
      title: t("homeScreen.liveOrderUpdates"),
      subtitle: t("homeScreen.liveOrderUpdatesSubtitle"),
      icon: "sync-outline",
    },
  ];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 650,
        useNativeDriver: false,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 650,
        useNativeDriver: false,
      }),
    ]).start();
  }, [headerAnim, slideAnim]);

  const goTo = (route: Href) => {
    router.push(route);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}> 
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: isSmallPhone ? 92 : 108 },
        ]}
      >
        <Animated.View
          style={[
            styles.hero,
            {
              paddingHorizontal: sidePadding,
              opacity: headerAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroTextBox}>
              <Text
                maxFontSizeMultiplier={TEXT_SCALE}
                style={[
                  styles.greeting,
                  {
                    color: theme.accent,
                    fontSize: isSmallPhone ? 13 : 14,
                  },
                ]}
              >
                {t("homeScreen.greeting")}
              </Text>

              <Text
                maxFontSizeMultiplier={TEXT_SCALE}
                style={[
                  styles.heroTitle,
                  {
                    color: theme.text,
                    fontSize: isSmallPhone ? 27 : isLargePhone ? 32 : 30,
                    lineHeight: isSmallPhone ? 34 : isLargePhone ? 39 : 37,
                  },
                ]}
              >
                {t("homeScreen.title")}
              </Text>

              <Text
                maxFontSizeMultiplier={TEXT_SCALE}
                style={[
                  styles.heroSubtitle,
                  {
                    color: theme.text3,
                    fontSize: isSmallPhone ? 12.5 : 13.5,
                    lineHeight: isSmallPhone ? 18 : 20,
                  },
                ]}
              >
                {t("homeScreen.subtitle")}
              </Text>
            </View>

            <View
              style={[
                styles.catIcon,
                {
                  backgroundColor: theme.accentBg,
                  borderColor: theme.border,
                  width: isSmallPhone ? 48 : 54,
                  height: isSmallPhone ? 48 : 54,
                  borderRadius: isSmallPhone ? 24 : 27,
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
                icon: "library-outline" as IoniconName,
                num: "2.4k",
                label: t("homeScreen.books"),
              },
              {
                icon: "people-outline" as IoniconName,
                num: "18k",
                label: t("homeScreen.readers"),
              },
              {
                icon: "star-outline" as IoniconName,
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
                  <Ionicons name={item.icon} size={20} color={theme.accent} />

                  <Text
                    maxFontSizeMultiplier={TEXT_SCALE}
                    style={[styles.statNum, { color: theme.text }]}
                  >
                    {item.num}
                  </Text>

                  <Text
                    maxFontSizeMultiplier={TEXT_SCALE}
                    style={[styles.statLabel, { color: theme.text3 }]}
                  >
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
            {
              marginHorizontal: sidePadding,
              backgroundColor: theme.bg2,
              borderColor: theme.border,
            },
          ]}
          activeOpacity={0.85}
          onPress={() => goTo("/books")}
        >
          <Ionicons name="search-outline" size={19} color={theme.text3} />

          <Text
            maxFontSizeMultiplier={TEXT_SCALE}
            style={[styles.searchPlaceholder, { color: theme.text3 }]}
            numberOfLines={1}
          >
            {t("homeScreen.searchPlaceholder")}
          </Text>

          <View
            style={[styles.searchFilter, { backgroundColor: theme.accentBg }]}
          >
            <Ionicons name="arrow-forward-outline" size={17} color={theme.accent} />
          </View>
        </TouchableOpacity>

        <View style={[styles.sectionHeader, { paddingHorizontal: sidePadding }]}> 
          <Text
            maxFontSizeMultiplier={TEXT_SCALE}
            style={[styles.sectionTitle, { color: theme.text }]}
          >
            {t("homeScreen.genres")}
          </Text>

          <TouchableOpacity
            style={styles.seeAllBtn}
            onPress={() => goTo("/books")}
            activeOpacity={0.85}
          >
            <Text
              maxFontSizeMultiplier={TEXT_SCALE}
              style={[styles.seeAll, { color: theme.accent }]}
            >
              {t("homeScreen.seeAll")}
            </Text>

            <Ionicons name="chevron-forward" size={15} color={theme.accent} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={genres}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          contentContainerStyle={[
            styles.genreList,
            { paddingHorizontal: sidePadding },
          ]}
          style={styles.genreListWrap}
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
                  name={item.icon}
                  size={15}
                  color={active ? "white" : theme.text2}
                />

                <Text
                  maxFontSizeMultiplier={TEXT_SCALE}
                  style={[
                    styles.genreText,
                    {
                      color: active ? "white" : theme.text2,
                      fontWeight: active ? "800" : "600",
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        <View style={[styles.sectionHeader, { paddingHorizontal: sidePadding }]}> 
          <Text
            maxFontSizeMultiplier={TEXT_SCALE}
            style={[styles.sectionTitle, { color: theme.text }]}
          >
            {t("homeScreen.readingHub")}
          </Text>
        </View>

        <View
          style={[
            styles.quickGrid,
            {
              paddingHorizontal: sidePadding,
              gap: quickGap,
            },
          ]}
        >
          {quickActions.map((item) => (
            <TouchableOpacity
              key={item.title}
              activeOpacity={0.85}
              onPress={() => goTo(item.route)}
              style={[
                styles.quickCard,
                {
                  width: quickCardWidth,
                  minHeight: isSmallPhone ? 126 : 136,
                  backgroundColor: theme.bg2,
                  borderColor: theme.border,
                },
              ]}
            >
              <View
                style={[styles.quickIcon, { backgroundColor: theme.accentBg }]}
              >
                <Ionicons name={item.icon} size={22} color={theme.accent} />
              </View>

              <Text
                maxFontSizeMultiplier={TEXT_SCALE}
                style={[styles.quickTitle, { color: theme.text }]}
                numberOfLines={1}
              >
                {item.title}
              </Text>

              <Text
                maxFontSizeMultiplier={TEXT_SCALE}
                style={[styles.quickSubtitle, { color: theme.text3 }]}
                numberOfLines={2}
              >
                {item.subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.sectionHeader, { paddingHorizontal: sidePadding }]}> 
          <Text
            maxFontSizeMultiplier={TEXT_SCALE}
            style={[styles.sectionTitle, { color: theme.text }]}
          >
            {t("homeScreen.whyCheshire")}
          </Text>
        </View>

        <View style={[styles.featureList, { paddingHorizontal: sidePadding }]}> 
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
                style={[styles.featureIcon, { backgroundColor: theme.accentBg }]}
              >
                <Ionicons name={item.icon} size={20} color={theme.accent} />
              </View>

              <View style={styles.featureTextBox}>
                <Text
                  maxFontSizeMultiplier={TEXT_SCALE}
                  style={[styles.featureTitle, { color: theme.text }]}
                >
                  {item.title}
                </Text>

                <Text
                  maxFontSizeMultiplier={TEXT_SCALE}
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
              marginHorizontal: sidePadding,
              backgroundColor: theme.accentBg,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.finalTextBox}>
            <Text
              maxFontSizeMultiplier={TEXT_SCALE}
              style={[styles.finalTitle, { color: theme.text }]}
            >
              {t("homeScreen.readyTitle")}
            </Text>

            <Text
              maxFontSizeMultiplier={TEXT_SCALE}
              style={[styles.finalSubtitle, { color: theme.text2 }]}
            >
              {t("homeScreen.readySubtitle")}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.finalBtn, { backgroundColor: theme.accent }]}
            activeOpacity={0.85}
            onPress={() => goTo("/books")}
          >
            <Text maxFontSizeMultiplier={TEXT_SCALE} style={styles.finalBtnText}>
              {t("homeScreen.goToBooks")}
            </Text>

            <Ionicons name="arrow-forward" size={15} color="white" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollContent: {
    paddingTop: 22,
  },

  hero: {
    marginBottom: 16,
  },

  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
    gap: 12,
  },

  heroTextBox: {
    flex: 1,
    minWidth: 0,
  },

  greeting: {
    fontWeight: "800",
    letterSpacing: 0.3,
    marginBottom: 8,
  },

  heroTitle: {
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  heroSubtitle: {
    marginTop: 11,
    maxWidth: 330,
  },

  catIcon: {
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  statsRow: {
    flexDirection: "row",
    borderRadius: 22,
    paddingVertical: 15,
    paddingHorizontal: 8,
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
    fontSize: 19,
    fontWeight: "900",
  },

  statLabel: {
    fontSize: 11.5,
    fontWeight: "600",
  },

  statDivider: {
    width: 1,
    height: 42,
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    marginBottom: 24,
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderWidth: 1,
    gap: 10,
  },

  searchPlaceholder: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: "600",
  },

  searchFilter: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: 0.1,
  },

  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },

  seeAll: {
    fontSize: 14,
    fontWeight: "800",
  },

  genreListWrap: {
    marginBottom: 24,
  },

  genreList: {
    gap: 10,
  },

  genreChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
  },

  genreText: {
    fontSize: 13.5,
  },

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 24,
  },

  quickCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 15,
  },

  quickIcon: {
    width: 43,
    height: 43,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },

  quickTitle: {
    fontSize: 15.5,
    fontWeight: "900",
    marginBottom: 6,
  },

  quickSubtitle: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "600",
  },

  featureList: {
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

  featureTextBox: {
    flex: 1,
    minWidth: 0,
  },

  featureTitle: {
    fontSize: 14.5,
    fontWeight: "900",
    marginBottom: 4,
  },

  featureSubtitle: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "600",
  },

  finalCard: {
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
    fontWeight: "600",
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
