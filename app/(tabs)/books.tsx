import { Ionicons } from "@expo/vector-icons";
import { Link, router, useFocusEffect } from "expo-router";
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
import API_URL from "../../.expo/config/api";

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
  get: (): string[] => {
    if (Platform.OS !== "web") return [];
    try {
      return JSON.parse(localStorage.getItem("wishlist") || "[]");
    } catch {
      return [];
    }
  },
  set: (list: string[]) => {
    if (Platform.OS === "web")
      localStorage.setItem("wishlist", JSON.stringify(list));
  },
  toggle: (id: string): boolean => {
    const list = wishlistStorage.get();
    const idx = list.indexOf(id);
    if (idx === -1) {
      list.push(id);
      wishlistStorage.set(list);
      return true;
    } else {
      list.splice(idx, 1);
      wishlistStorage.set(list);
      return false;
    }
  },
  isLiked: (id: string): boolean => wishlistStorage.get().includes(id),
};

function BookCard({ item, isLoggedIn }: { item: Book; isLoggedIn: boolean }) {
  const [flipped, setFlipped] = useState(false);
  const [liked, setLiked] = useState(() => wishlistStorage.isLiked(item.id));
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeInfo = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

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
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.card}
      onPress={() => router.push(`/book/${item.id}` as any)}
    >
      <Animated.View
        style={[
          styles.imageContainer,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Image source={{ uri: item.imageUrl }} style={styles.image} />

        <View style={styles.priceTag}>
          <Text style={styles.priceText}>${item.price}</Text>
        </View>

        {/* ❤️ только залогиненным */}
        {isLoggedIn && (
          <TouchableOpacity style={styles.likeBtn} onPress={handleLike}>
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Ionicons
                name={liked ? "heart" : "heart-outline"}
                size={18}
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
            size={16}
            color="white"
          />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View style={[styles.infoPanel, { opacity: fadeInfo }]}>
        <Text style={styles.infoTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.infoAuthor}>{item.author}</Text>
        <View style={styles.genreRow}>
          <Ionicons name="bookmark-outline" size={11} color="#8b5cf6" />
          <Text style={styles.infoGenre}> {item.genreName}</Text>
        </View>
        <Link href={`/book/${item.id}` as any} asChild>
          <TouchableOpacity
            style={styles.cartBtn}
            onPress={(e) => e.stopPropagation?.()}
          >
            <Ionicons name="bag-add-outline" size={14} color="white" />
            <Text style={styles.cartText}> View book</Text>
          </TouchableOpacity>
        </Link>
      </Animated.View>

      {!flipped && (
        <View style={styles.staticInfo}>
          <Text style={styles.bookTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.author} numberOfLines={1}>
            {item.author}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function Books() {
  const [books, setBooks] = useState<Book[]>([]);
  const [filtered, setFiltered] = useState<Book[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // проверяем логин каждый раз при фокусе
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
        const bookList: Book[] = Array.isArray(booksData)
          ? booksData
          : (booksData.$values ?? []);
        const genreList: Genre[] = Array.isArray(genresData)
          ? genresData
          : (genresData.$values ?? []);
        setBooks(bookList);
        setFiltered(bookList);
        setGenres(genreList);
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
    if (selectedGenre) {
      result = result.filter((b) => b.genreName === selectedGenre);
    }
    setFiltered(result);
  }, [search, selectedGenre, books]);

  return (
    <View style={styles.container}>
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={18} color="#555" />
        <TextInput
          placeholder="Search by title or author..."
          placeholderTextColor="#555"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-outline" size={20} color="#555" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={genres}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => String(item.id)}
        style={styles.genreList}
        contentContainerStyle={{ paddingRight: 16 }}
        renderItem={({ item }) => {
          const active = selectedGenre === item.name;
          return (
            <TouchableOpacity
              onPress={() => setSelectedGenre(active ? null : item.name)}
              style={[styles.genreChip, active && styles.genreChipActive]}
            >
              <Text
                style={[styles.genreText, active && styles.genreTextActive]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {!loading && !error && (
        <Text style={styles.countText}>
          {filtered.length} book{filtered.length !== 1 ? "s" : ""} found
        </Text>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading books...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="warning-outline" size={32} color="#f87171" />
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorHint}>Check that the server is running</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="book-outline" size={40} color="#333" />
          <Text style={styles.emptyText}>No books found</Text>
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
  container: {
    flex: 1,
    backgroundColor: "#0b0b10",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a25",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.2)",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: "white",
    fontSize: 14,
  },
  genreList: {
    marginBottom: 14,
    flexGrow: 0,
  },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: "#1a1a25",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.2)",
  },
  genreChipActive: {
    backgroundColor: "#7c3aed",
    borderColor: "#7c3aed",
  },
  genreText: { color: "#888", fontSize: 13 },
  genreTextActive: { color: "white", fontWeight: "600" },
  countText: { color: "#555", fontSize: 12, marginBottom: 12 },
  card: {
    width: "48%",
    height: 280,
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: "#13131f",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.15)",
  },
  imageContainer: {
    width: "100%",
    height: 220,
    position: "relative",
  },
  image: { width: "100%", height: "100%" },
  priceTag: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(124,58,237,0.9)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  priceText: { color: "white", fontSize: 12, fontWeight: "700" },
  likeBtn: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  flipBtn: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  staticInfo: { padding: 8 },
  bookTitle: { color: "white", fontSize: 12, fontWeight: "600" },
  author: { color: "#888", fontSize: 11, marginTop: 2 },
  infoPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 280,
    backgroundColor: "#1a1025",
    padding: 14,
    justifyContent: "center",
    gap: 6,
  },
  infoTitle: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  infoAuthor: { color: "#aaa", fontSize: 12 },
  genreRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  infoGenre: { color: "#8b5cf6", fontSize: 11 },
  cartBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7c3aed",
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 8,
  },
  cartText: { color: "white", fontSize: 13, fontWeight: "600" },
  row: { justifyContent: "space-between" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  loadingText: { color: "#555", marginTop: 12 },
  errorText: { color: "#f87171", fontSize: 14 },
  errorHint: { color: "#555", fontSize: 12 },
  emptyText: { color: "#555", fontSize: 16, marginTop: 8 },
});
