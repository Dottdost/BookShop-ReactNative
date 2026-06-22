import API_URL from "@/.expo/config/api";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

interface Book {
  id: string;
  title: string;
  author: string;
  imageUrl: string;
  genreName: string;
  price: number;
}

interface Genre {
  id: number;
  name: string;
}

const wishlistStorage = {
  _key: (): string => {
    if (Platform.OS !== "web") return "wishlist_guest";
    const userId = localStorage.getItem("userId") || "guest";
    return `wishlist_${userId}`;
  },
  get: (): string[] => {
    if (Platform.OS !== "web") return [];
    try {
      return JSON.parse(localStorage.getItem(wishlistStorage._key()) || "[]");
    } catch {
      return [];
    }
  },
  toggle: (id: string): boolean => {
    const list = wishlistStorage.get();
    const idx = list.indexOf(id);
    if (idx === -1) {
      list.push(id);
    } else {
      list.splice(idx, 1);
    }
    if (Platform.OS === "web")
      localStorage.setItem(wishlistStorage._key(), JSON.stringify(list));
    return idx === -1;
  },
  isLiked: (id: string): boolean => wishlistStorage.get().includes(id),
};

function BookCard({ item, isLoggedIn }: { item: Book; isLoggedIn: boolean }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [flipped, setFlipped] = useState(false);
  const [liked, setLiked] = useState(() => wishlistStorage.isLiked(item.id));
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeInfo = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }),
      Animated.timing(cardSlide, {
        toValue: 0,
        duration: 400,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  const handleLike = (e: any) => {
    e.stopPropagation?.();
    const newVal = wishlistStorage.toggle(item.id);
    setLiked(newVal);
    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.5,
        duration: 120,
        useNativeDriver: false,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const flip = () => {
    if (!flipped) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -220,
          duration: 350,
          useNativeDriver: false,
        }),
        Animated.timing(fadeInfo, {
          toValue: 1,
          duration: 350,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: false,
        }),
        Animated.timing(fadeInfo, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
    setFlipped(!flipped);
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: cardSlide }],
        width: "48%",
        marginBottom: 20,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        style={[
          styles.card,
          { backgroundColor: theme.bg2, borderColor: theme.border },
        ]}
        onPress={() => router.push(`/book/${item.id}` as any)}
      >
        <Animated.View
          style={[
            styles.imageContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Image source={{ uri: item.imageUrl }} style={styles.image} />
          <View style={styles.imageGradient} />

          <View style={styles.priceTag}>
            <Text style={styles.priceText}>${item.price}</Text>
          </View>

          {isLoggedIn && (
            <TouchableOpacity style={styles.likeBtn} onPress={handleLike}>
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Ionicons
                  name={liked ? "heart" : "heart-outline"}
                  size={16}
                  color={liked ? "#f43f5e" : "white"}
                />
              </Animated.View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.flipBtn}
            onPress={(e) => {
              e.stopPropagation?.();
              flip();
            }}
          >
            <Ionicons
              name={flipped ? "close-outline" : "eye-outline"}
              size={14}
              color="white"
            />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={[
            styles.infoPanel,
            {
              opacity: fadeInfo,
              backgroundColor: theme.dark ? "#1a1025" : "#f0e6ff",
            },
          ]}
        >
          <Text
            style={[styles.infoTitle, { color: theme.text }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <Text style={[styles.infoAuthor, { color: theme.text2 }]}> 
            {item.author}
          </Text>
          <View style={styles.genreRow}>
            <Ionicons name="bookmark-outline" size={11} color={theme.accent} />
            <Text style={[styles.infoGenre, { color: theme.accent }]}> {item.genreName}</Text>
          </View>
          <TouchableOpacity
            style={[styles.cartBtn, { backgroundColor: theme.accent }]}
            onPress={(e) => {
              e.stopPropagation?.();
              router.push(`/book/${item.id}` as any);
            }}
          >
            <Ionicons name="arrow-forward-outline" size={14} color="white" />
            <Text style={styles.cartText}>{t("booksScreen.viewBook")}</Text>
          </TouchableOpacity>
        </Animated.View>

        {!flipped && (
          <View style={[styles.staticInfo, { backgroundColor: theme.bg2 }]}> 
            <Text
              style={[styles.bookTitle, { color: theme.text }]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text
              style={[styles.bookAuthor, { color: theme.text2 }]}
              numberOfLines={1}
            >
              {item.author}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function Books() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [books, setBooks] = useState<Book[]>([]);
  const [filtered, setFiltered] = useState<Book[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === "web") {
        setIsLoggedIn(!!localStorage.getItem("token"));
      }
    }, []),
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [booksRes, genresRes] = await Promise.all([
          fetch(`${API_URL}/api/books?page=1&pageSize=50`),
          fetch(`${API_URL}/api/genres/all`),
        ]);
        const booksData = await booksRes.json();
        const genresData = await genresRes.json();
        setBooks(
          Array.isArray(booksData) ? booksData : (booksData.$values ?? []),
        );
        setFiltered(
          Array.isArray(booksData) ? booksData : (booksData.$values ?? []),
        );
        setGenres(
          Array.isArray(genresData) ? genresData : (genresData.$values ?? []),
        );
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    let result = books;
    if (search.trim()) {
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(search.toLowerCase()) ||
          b.author.toLowerCase().includes(search.toLowerCase()),
      );
    }
    if (selectedGenre)
      result = result.filter((b) => b.genreName === selectedGenre);
    setFiltered(result);
  }, [search, selectedGenre, books]);

  const genresWithAll = [{ id: -1, name: t("booksScreen.allGenres") }, ...genres];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}> 
      <View
        style={[
          styles.searchWrapper,
          { backgroundColor: theme.bg2, borderColor: theme.border },
        ]}
      >
        <Ionicons name="search-outline" size={18} color={theme.text3} />
        <TextInput
          placeholder={t("booksScreen.searchPlaceholder")}
          placeholderTextColor={theme.text3}
          value={search}
          onChangeText={setSearch}
          style={[styles.searchInput, { color: theme.text }]}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}> 
            <Ionicons name="close-outline" size={20} color={theme.text3} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={genresWithAll}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => String(item.id)}
        style={styles.genreList}
        contentContainerStyle={{ paddingRight: 16 }}
        renderItem={({ item }) => {
          const isAll = item.id === -1;
          const active = isAll ? !selectedGenre : selectedGenre === item.name;
          return (
            <TouchableOpacity
              onPress={() =>
                setSelectedGenre(isAll ? null : active ? null : item.name)
              }
              style={[
                styles.genreChip,
                {
                  backgroundColor: active ? theme.accent : theme.bg2,
                  borderColor: active ? theme.accent : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.genreText,
                  {
                    color: active ? "white" : theme.text2,
                    fontWeight: active ? "600" : "400",
                  },
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {!loading && !error && (
        <Text style={[styles.countText, { color: theme.text3 }]}> 
          {t("booksScreen.booksFound", { count: filtered.length })}
        </Text>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.text3 }]}> 
            {t("booksScreen.loadingBooks")}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="warning-outline" size={32} color="#f87171" />
          <Text style={[styles.errorText]}>{error}</Text>
          <Text style={[styles.errorHint, { color: theme.text3 }]}> 
            {t("booksScreen.serverHint")}
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="book-outline" size={40} color={theme.text3} />
          <Text style={[styles.emptyText, { color: theme.text3 }]}> 
            {t("booksScreen.empty")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <BookCard item={item} isLoggedIn={isLoggedIn} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  genreList: { marginBottom: 14, flexGrow: 0 },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  genreText: { fontSize: 13 },
  countText: { fontSize: 12, marginBottom: 12 },
  card: {
    width: "100%",
    height: 280,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
  },
  imageContainer: { width: "100%", height: 220, position: "relative" },
  image: { width: "100%", height: "100%" },
  imageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  priceTag: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(124,58,237,0.9)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  priceText: { color: "white", fontSize: 11, fontWeight: "700" },
  likeBtn: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  flipBtn: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  staticInfo: { padding: 10 },
  bookTitle: { fontSize: 12, fontWeight: "700" },
  bookAuthor: { fontSize: 11, marginTop: 2 },
  infoPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 280,
    padding: 14,
    justifyContent: "center",
    gap: 6,
  },
  infoTitle: { fontSize: 14, fontWeight: "700", lineHeight: 18 },
  infoAuthor: { fontSize: 12 },
  genreRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  infoGenre: { fontSize: 11 },
  cartBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 8,
    gap: 6,
  },
  cartText: { color: "white", fontSize: 13, fontWeight: "600" },
  row: { justifyContent: "space-between" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  loadingText: { marginTop: 12 },
  errorText: { color: "#f87171", fontSize: 14 },
  errorHint: { fontSize: 12 },
  emptyText: { fontSize: 16, marginTop: 8 },
});
