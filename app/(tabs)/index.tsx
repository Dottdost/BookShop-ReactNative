import API_URL from "@/.expo/config/api";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

interface Book {
  id: string;
  title: string;
  author: string;
  imageUrl: string;
}

function BookCard({ item, index }: { item: Book; index: number }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 120,
        useNativeDriver: false,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: index * 120,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  return (
    <Link href={`/book/${item.id}` as any} asChild>
      <Animated.View
        style={[
          styles.cardWrapper,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.card,
            { backgroundColor: theme.bg2, borderColor: theme.border },
          ]}
        >
          <Image source={{ uri: item.imageUrl }} style={styles.image} />

          <View style={styles.cardBadge}>
            <Ionicons name="star" size={10} color="#f59e0b" />
            <Text style={styles.cardBadgeText}>{t("homeScreen.new")}</Text>
          </View>

          <View
            style={[
              styles.overlay,
              {
                backgroundColor: theme.dark
                  ? "rgba(0,0,0,0.75)"
                  : "rgba(255,253,247,0.92)",
              },
            ]}
          >
            <Text
              style={[styles.bookTitle, { color: theme.text }]}
              numberOfLines={2}
            >
              {item.title}
            </Text>

            <Text style={[styles.cardAuthor, { color: theme.text2 }]}> 
              {item.author}
            </Text>

            <View style={styles.readBtn}>
              <Ionicons name="book-outline" size={11} color={theme.accent} />
              <Text style={[styles.readBtnText, { color: theme.accent }]}> 
                {t("homeScreen.view")}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Link>
  );
}

export default function HomeScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGenre, setActiveGenre] = useState("romance");
  const headerAnim = useRef(new Animated.Value(0)).current;

  const genres = [
    { key: "romance", label: t("homeScreen.romance"), icon: "heart-outline" },
    { key: "mystery", label: t("homeScreen.mystery"), icon: "search-outline" },
    { key: "dark", label: t("homeScreen.darkFiction"), icon: "moon-outline" },
    { key: "fantasy", label: t("homeScreen.fantasy"), icon: "sparkles-outline" },
  ];

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, []);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);

        const bookIds = [
          "4292644e-5757-48ea-a9f1-5781b0f8afb8",
          "0d6d635e-03f9-48b6-bef6-bb4b90373588",
          "43fd1bbf-7a04-4789-8833-18d1b54be9f5",
          "ec249b5f-918e-4ef0-9ee2-21a4383a45ee",
          "d14eb84f-22f0-4edf-91c5-ec512d2450da",
          "3d47df4d-22a6-4da8-9aa4-1c492f773c4b",
          "ed00555e-5375-41bb-87c5-e562c558a4d5",
        ];

        const responses = await Promise.all(
          bookIds.map(async (id) => {
            const res = await fetch(`${API_URL}/api/books/${id}`);
            if (!res.ok) throw new Error("API error");
            return res.json();
          }),
        );

        setBooks(responses);
      } catch (error) {
        console.log("BACKEND ERROR:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}> 
      <FlatList
        data={[]}
        keyExtractor={() => "home"}
        renderItem={null}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Animated.View style={[styles.hero, { opacity: headerAnim }]}> 
              <View style={styles.heroTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.greeting, { color: theme.accent }]}> 
                    {t("homeScreen.greeting")}
                  </Text>

                  <Text style={[styles.heroTitle, { color: theme.text }]}> 
                    {t("homeScreen.title")}
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
                  { icon: "library-outline", num: "2.4k", label: t("homeScreen.books") },
                  { icon: "people-outline", num: "18k", label: t("homeScreen.readers") },
                  { icon: "star-outline", num: "4.9", label: t("homeScreen.rating") },
                ].map((s, i) => (
                  <View key={s.label} style={{ flexDirection: "row", flex: 1 }}>
                    {i > 0 && (
                      <View
                        style={[
                          styles.statDivider,
                          { backgroundColor: theme.border },
                        ]}
                      />
                    )}

                    <View style={styles.statCard}>
                      <Ionicons
                        name={s.icon as any}
                        size={20}
                        color={theme.accent}
                      />
                      <Text style={[styles.statNum, { color: theme.text }]}> 
                        {s.num}
                      </Text>
                      <Text style={[styles.statLabel, { color: theme.text3 }]}> 
                        {s.label}
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
                  name="options-outline"
                  size={16}
                  color={theme.accent}
                />
              </View>
            </TouchableOpacity>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}> 
                {t("homeScreen.genres")}
              </Text>

              <TouchableOpacity style={styles.seeAllBtn}>
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
              keyExtractor={(g) => g.key}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
              style={{ marginBottom: 24 }}
              renderItem={({ item: g }) => {
                const active = activeGenre === g.key;

                return (
                  <TouchableOpacity
                    onPress={() => setActiveGenre(g.key)}
                    style={[
                      styles.genreChip,
                      {
                        backgroundColor: active ? theme.accent : theme.bg2,
                        borderColor: active ? theme.accent : theme.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={g.icon as any}
                      size={14}
                      color={active ? "white" : theme.text2}
                    />

                    <Text
                      style={[
                        styles.genreText,
                        {
                          color: active ? "white" : theme.text2,
                          fontWeight: active ? "600" : "400",
                        },
                      ]}
                    >
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}> 
                {t("homeScreen.picksForYou")}
              </Text>

              <Link href="/books" asChild>
                <TouchableOpacity style={styles.seeAllBtn}>
                  <Text style={[styles.seeAll, { color: theme.accent }]}> 
                    {t("homeScreen.seeAll")}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={theme.accent}
                  />
                </TouchableOpacity>
              </Link>
            </View>

            {loading ? (
              <ActivityIndicator
                size="large"
                color={theme.accent}
                style={{ marginVertical: 24 }}
              />
            ) : (
              <FlatList
                data={books}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                  <BookCard item={item} index={index} />
                )}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={164}
                decelerationRate="fast"
                contentContainerStyle={{
                  paddingHorizontal: 20,
                  paddingBottom: 8,
                }}
              />
            )}

            {books[0] && (
              <>
                <View style={[styles.sectionHeader, { marginTop: 24 }]}> 
                  <Text style={[styles.sectionTitle, { color: theme.text }]}> 
                    {t("homeScreen.bookOfTheWeek")}
                  </Text>
                </View>

                <Link href={`/book/${books[0].id}` as any} asChild>
                  <TouchableOpacity
                    style={[
                      styles.featuredCard,
                      { backgroundColor: theme.bg2, borderColor: theme.border },
                    ]}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={{ uri: books[0].imageUrl }}
                      style={styles.featuredImage}
                    />

                    <View style={styles.featuredInfo}>
                      <View
                        style={[
                          styles.featuredBadge,
                          { backgroundColor: "rgba(245,158,11,0.1)" },
                        ]}
                      >
                        <Ionicons
                          name="trophy-outline"
                          size={11}
                          color="#f59e0b"
                        />
                        <Text style={styles.featuredBadgeText}> 
                          {t("homeScreen.editorsPick")}
                        </Text>
                      </View>

                      <Text
                        style={[styles.featuredTitle, { color: theme.text }]}
                        numberOfLines={2}
                      >
                        {books[0].title}
                      </Text>

                      <Text
                        style={[styles.featuredAuthor, { color: theme.text2 }]}
                      >
                        {books[0].author}
                      </Text>

                      <View style={styles.featuredFooter}>
                        <View style={styles.starsRow}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Ionicons
                              key={s}
                              name="star"
                              size={12}
                              color="#f59e0b"
                            />
                          ))}
                        </View>

                        <View
                          style={[
                            styles.featuredReadBtn,
                            { backgroundColor: theme.accent },
                          ]}
                        >
                          <Text style={styles.featuredReadText}> 
                            {t("homeScreen.readMore")}
                          </Text>
                          <Ionicons
                            name="arrow-forward"
                            size={12}
                            color="white"
                          />
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Link>
              </>
            )}

            <View style={{ height: 40 }} />
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 26 },
  hero: { paddingHorizontal: 20, marginBottom: 18 },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    gap: 12,
  },
  greeting: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 34,
    letterSpacing: 0.3,
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
  statCard: { flex: 1, alignItems: "center", gap: 4 },
  statNum: { fontSize: 18, fontWeight: "800" },
  statLabel: { fontSize: 11 },
  statDivider: { width: 1, height: 40 },
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
  searchPlaceholder: { flex: 1, fontSize: 14 },
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
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  seeAllBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAll: { fontSize: 13 },
  genreChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  genreText: { fontSize: 13 },
  cardWrapper: { marginRight: 14 },
  card: {
    width: 148,
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  image: { width: "100%", height: "100%" },
  cardBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  cardBadgeText: { color: "#f59e0b", fontSize: 10, fontWeight: "600" },
  overlay: { position: "absolute", bottom: 0, width: "100%", padding: 10, gap: 2 },
  bookTitle: { fontSize: 12, fontWeight: "600", lineHeight: 16 },
  cardAuthor: { fontSize: 10 },
  readBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  readBtnText: { fontSize: 10, fontWeight: "600" },
  featuredCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    height: 140,
  },
  featuredImage: { width: 100, height: "100%" },
  featuredInfo: { flex: 1, padding: 14, justifyContent: "space-between" },
  featuredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  featuredBadgeText: { color: "#f59e0b", fontSize: 10, fontWeight: "600" },
  featuredTitle: { fontSize: 15, fontWeight: "700", lineHeight: 20 },
  featuredAuthor: { fontSize: 12 },
  featuredFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  starsRow: { flexDirection: "row", gap: 2 },
  featuredReadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  featuredReadText: { color: "white", fontSize: 11, fontWeight: "600" },
});
