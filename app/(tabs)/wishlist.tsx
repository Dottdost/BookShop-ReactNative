import API_URL from "@/.expo/config/api";
import { Ionicons } from "@expo/vector-icons";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ✅ тот же объект что в book/[id].tsx и books.tsx
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
};

interface Book {
  id: string;
  title: string;
  author: string;
  imageUrl: string;
  price: number;
  genreName: string;
}

function WishlistCard({
  item,
  onRemove,
}: {
  item: Book;
  onRemove: (id: string) => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  const handleRemove = () => {
    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.4,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start(() => onRemove(item.id));
  };

  return (
    <Animated.View
      style={[
        styles.card,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Link href={`/book/${item.id}` as any} asChild>
        <TouchableOpacity style={styles.cardInner} activeOpacity={0.85}>
          <Image source={{ uri: item.imageUrl }} style={styles.image} />
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.author}>{item.author}</Text>
            <View style={styles.genreRow}>
              <Ionicons name="bookmark-outline" size={11} color="#8b5cf6" />
              <Text style={styles.genre}> {item.genreName}</Text>
            </View>
            <Text style={styles.price}>${item.price}</Text>
          </View>
        </TouchableOpacity>
      </Link>

      <TouchableOpacity style={styles.removeBtn} onPress={handleRemove}>
        <Animated.View style={{ transform: [{ scale: heartScale }] }}>
          <Ionicons name="heart" size={22} color="#f43f5e" />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function Wishlist() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const headerAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      const loggedIn =
        Platform.OS === "web" ? !!localStorage.getItem("token") : false;
      setIsLoggedIn(loggedIn);
      if (loggedIn) loadWishlist();
      else setLoading(false);

      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }, []),
  );

  const loadWishlist = async () => {
    setLoading(true);
    try {
      const ids = wishlistStorage.get();
      if (ids.length === 0) {
        setBooks([]);
        setLoading(false);
        return;
      }
      const results = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`${API_URL}/api/books/${id}`);
          return res.json();
        }),
      );
      setBooks(results);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (id: string) => {
    wishlistStorage.toggle(id);
    setBooks((prev) => prev.filter((b) => b.id !== id));
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyCenter}>
          <Ionicons name="heart-dislike-outline" size={64} color="#333" />
          <Text style={styles.emptyTitle}>Sign in to use Wishlist</Text>
          <Text style={styles.emptySubtitle}>
            Save books you love and come back to them anytime
          </Text>
          <Link href="/sign-in" asChild>
            <TouchableOpacity style={styles.signInBtn}>
              <Ionicons name="log-in-outline" size={18} color="white" />
              <Text style={styles.signInBtnText}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.header, { opacity: headerAnim }]}>
        <Text style={styles.headerTitle}>My Wishlist</Text>
        <Text style={styles.headerCount}>
          {books.length} book{books.length !== 1 ? "s" : ""}
        </Text>
      </Animated.View>

      {loading ? (
        <View style={styles.emptyCenter}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : books.length === 0 ? (
        <View style={styles.emptyCenter}>
          <Ionicons name="heart-outline" size={64} color="#333" />
          <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
          <Text style={styles.emptySubtitle}>
            Tap the heart on any book to save it here
          </Text>
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <WishlistCard item={item} onRemove={handleRemove} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b10" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { color: "white", fontSize: 24, fontWeight: "800" },
  headerCount: { color: "#8b5cf6", fontSize: 14, fontWeight: "600" },
  card: {
    backgroundColor: "#13131f",
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.15)",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
  },
  cardInner: { flex: 1, flexDirection: "row", padding: 12, gap: 14 },
  image: {
    width: 80,
    height: 110,
    borderRadius: 12,
    backgroundColor: "#1a1a25",
  },
  info: { flex: 1, justifyContent: "center", gap: 4 },
  title: { color: "white", fontSize: 15, fontWeight: "700", lineHeight: 20 },
  author: { color: "#888", fontSize: 13 },
  genreRow: { flexDirection: "row", alignItems: "center" },
  genre: { color: "#8b5cf6", fontSize: 11 },
  price: { color: "#c084fc", fontSize: 18, fontWeight: "800", marginTop: 4 },
  removeBtn: { padding: 16, justifyContent: "center", alignItems: "center" },
  emptyCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 40,
  },
  emptyTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtitle: {
    color: "#555",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  signInBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7c3aed",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 8,
  },
  signInBtnText: { color: "white", fontWeight: "700", fontSize: 15 },
});
