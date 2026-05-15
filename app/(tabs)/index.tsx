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
import API_URL from "../../.expo/config/api";

interface Book {
  id: string;
  title: string;
  author: string;
  imageUrl: string;
}

function BookCard({ item, index }: { item: Book; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      delay: index * 200,
      useNativeDriver: false,
    }).start();
  }, []);

  return (
    <Link href={`/book/${item.id}` as any} asChild>
      <Animated.View style={[styles.cardWrapper, { opacity: fadeAnim }]}>
        <TouchableOpacity activeOpacity={0.75} style={styles.card}>
          <Image source={{ uri: item.imageUrl }} style={styles.image} />
          <View style={styles.overlay}>
            <Text style={styles.bookTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.author}>{item.author}</Text>
          </View>
          <View style={styles.glow} />
        </TouchableOpacity>
      </Animated.View>
    </Link>
  );
}

export default function HomeScreen() {
  const [text, setText] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  const fullText =
    "Welcome to Cheshire Shelf ✨ Step into a world where stories come to life";

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < fullText.length) {
        setText(fullText.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 20);
    return () => clearInterval(interval);
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
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>🐱📚</Text>
        <Text style={styles.heroTitle}>Cheshire Shelf</Text>
        <Text style={styles.heroSub}>{text}</Text>

        <View style={styles.tagsRow}>
          {["✦ Romance", "✦ Dark Fiction", "✦ Mystery"].map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.divider} />

      {/* 📚 Recommendations */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>✨ Recommendations</Text>
        <TouchableOpacity>
          <Text style={styles.seeAll}>See all →</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#8b5cf6"
          style={{ marginTop: 40 }}
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
          snapToInterval={196}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        />
      )}

      {/* 🔥 Trending */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🔥 Trending Now</Text>
      </View>

      <View style={styles.trendingRow}>
        {["Dark Romance", "Enemies to Lovers", "Gothic Mystery"].map(
          (genre, i) => (
            <TouchableOpacity
              key={genre}
              style={[
                styles.trendingChip,
                i === 0 && styles.trendingChipActive,
              ]}
            >
              <Text
                style={[
                  styles.trendingChipText,
                  i === 0 && styles.trendingChipTextActive,
                ]}
              >
                {genre}
              </Text>
            </TouchableOpacity>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0b10",
    paddingTop: 110,
  },

  hero: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  heroEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: "800",
    color: "white",
    letterSpacing: 1,
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 13,
    color: "#c4b5fd",
    lineHeight: 20,
    marginBottom: 16,
  },

  tagsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  tag: {
    borderWidth: 1,
    borderColor: "#7c3aed",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "rgba(124,58,237,0.1)",
  },
  tagText: {
    color: "#a78bfa",
    fontSize: 12,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(139,92,246,0.2)",
    marginHorizontal: 20,
    marginBottom: 24,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
  },
  seeAll: {
    color: "#8b5cf6",
    fontSize: 13,
  },

  cardWrapper: {
    marginRight: 16,
  },
  card: {
    width: 180,
    height: 270,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#111",
    shadowColor: "#8b5cf6",
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  bookTitle: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },
  author: {
    color: "#d4d4d8",
    fontSize: 11,
    marginTop: 2,
  },
  glow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: "rgba(139, 92, 246, 0.12)",
  },

  trendingRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    flexWrap: "wrap",
  },
  trendingChip: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  trendingChipActive: {
    backgroundColor: "#7c3aed",
    borderColor: "#7c3aed",
  },
  trendingChipText: {
    color: "#9ca3af",
    fontSize: 13,
  },
  trendingChipTextActive: {
    color: "white",
    fontWeight: "600",
  },
});
