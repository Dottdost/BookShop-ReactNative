import { useAuth } from "@/app/hooks/useAuth";
import wishlistStorage from "@/app/hooks/wishlistStorage";
import { useTheme } from "@/context/ThemeContext";
import API_URL from "@/services/config/api";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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

interface Book {
  id: string;
  title: string;
  author: string;
  imageUrl: string;
  price: number;
  genreName: string;
}

function unwrapBook(data: any) {
  return data?.data ?? data?.book ?? data;
}

function normalizeBook(item: any): Book {
  return {
    id: String(item.id ?? item.bookId ?? item.Id ?? item.BookId ?? ""),
    title: String(item.title ?? item.Title ?? ""),
    author: String(item.author ?? item.Author ?? ""),
    imageUrl: String(item.imageUrl ?? item.ImageUrl ?? ""),
    price: Number(item.price ?? item.Price ?? 0),
    genreName: String(item.genreName ?? item.GenreName ?? ""),
  };
}

function WishlistCard({
  item,
  onRemove,
}: {
  item: Book;
  onRemove: (id: string) => void;
}) {
  const { theme } = useTheme();

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
        {
          backgroundColor: theme.bg2,
          borderColor: theme.border,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.cardInner}
        activeOpacity={0.85}
        onPress={() => router.push(`/book/${item.id}` as any)}
      >
        <Image
          source={{
            uri:
              item.imageUrl ||
              "https://placehold.co/160x220/241633/d8b4fe?text=Book",
          }}
          style={[styles.image, { backgroundColor: theme.bg3 }]}
        />

        <View style={styles.info}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {item.title}
          </Text>

          <Text style={[styles.author, { color: theme.text2 }]}>
            {item.author}
          </Text>

          <View style={styles.genreRow}>
            <Ionicons name="bookmark-outline" size={11} color={theme.accent} />

            <Text style={[styles.genre, { color: theme.accent }]}>
              {item.genreName || "No genre"}
            </Text>
          </View>

          <Text style={[styles.price, { color: theme.accent }]}>
            ${item.price}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.removeBtn} onPress={handleRemove}>
        <Animated.View style={{ transform: [{ scale: heartScale }] }}>
          <Ionicons name="heart" size={22} color="#f43f5e" />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function Wishlist() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { token, userId, loading: authLoading } = useAuth();

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const headerAnim = useRef(new Animated.Value(0)).current;

  const isLoggedIn = !!token && !!userId;

  const loadWishlist = async () => {
    if (!userId) {
      setBooks([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const ids = await wishlistStorage.getAsync(userId);

      if (ids.length === 0) {
        setBooks([]);
        return;
      }

      const results = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`${API_URL}/api/books/${id}`);
          const data = await res.json();

          return normalizeBook(unwrapBook(data));
        }),
      );

      setBooks(results.filter((book) => book.id));
    } catch (error) {
      console.log("Wishlist load error:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (isLoggedIn) {
        void loadWishlist();
      } else {
        setBooks([]);
        setLoading(false);
      }

      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }, [isLoggedIn, userId]),
  );

  const handleRemove = async (id: string) => {
    await wishlistStorage.removeAsync(id, userId);
    setBooks((prev) => prev.filter((book) => book.id !== id));
  };

  if (authLoading || loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.emptyCenter}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.emptyCenter}>
          <Ionicons
            name="heart-dislike-outline"
            size={64}
            color={theme.text3}
          />

          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {t("wishlistScreen.signInTitle")}
          </Text>

          <Text style={[styles.emptySubtitle, { color: theme.text3 }]}>
            {t("wishlistScreen.signInSubtitle")}
          </Text>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.accent }]}
            onPress={() => router.push("/sign-in")}
          >
            <Ionicons name="log-in-outline" size={18} color="white" />

            <Text style={styles.actionBtnText}>{t("auth.signIn")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Animated.View style={[styles.header, { opacity: headerAnim }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {t("wishlistScreen.myWishlist")}
        </Text>

        <Text style={[styles.headerCount, { color: theme.accent }]}>
          {t("wishlistScreen.bookCount", { count: books.length })}
        </Text>
      </Animated.View>

      {books.length === 0 ? (
        <View style={styles.emptyCenter}>
          <Ionicons name="heart-outline" size={64} color={theme.text3} />

          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {t("wishlistScreen.emptyTitle")}
          </Text>

          <Text style={[styles.emptySubtitle, { color: theme.text3 }]}>
            {t("wishlistScreen.emptySubtitle")}
          </Text>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.accent }]}
            onPress={() => router.push("/books")}
          >
            <Ionicons name="book-outline" size={18} color="white" />

            <Text style={styles.actionBtnText}>Browse books</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(item, index) => item.id || String(index)}
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
  container: { flex: 1 },

  header: {
    paddingHorizontal: 14,
    paddingTop: 20,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTitle: { fontSize: 24, fontWeight: "800" },

  headerCount: { fontSize: 14, fontWeight: "600" },

  card: {
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
  },

  cardInner: { flex: 1, flexDirection: "row", padding: 12, gap: 14 },

  image: { width: 80, height: 110, borderRadius: 12 },

  info: { flex: 1, justifyContent: "center", gap: 4 },

  title: { fontSize: 15, fontWeight: "700", lineHeight: 20 },

  author: { fontSize: 13 },

  genreRow: { flexDirection: "row", alignItems: "center", gap: 4 },

  genre: { fontSize: 11 },

  price: { fontSize: 18, fontWeight: "800", marginTop: 4 },

  removeBtn: { padding: 16, justifyContent: "center", alignItems: "center" },

  emptyCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 40,
  },

  emptyTitle: { fontSize: 20, fontWeight: "700", textAlign: "center" },

  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 8,
  },

  actionBtnText: { color: "white", fontWeight: "700", fontSize: 15 },
});
