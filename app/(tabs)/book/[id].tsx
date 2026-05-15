import API_URL from "@/.expo/config/api";
import cartStorage from "../../hooks/cartStorage";

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ✅ вишлист привязан к userId
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

function SkeletonLoader() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: false,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, []);

  const bg = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: ["#1a1a25", "#2a2a3a"],
  });

  return (
    <View style={styles.skeletonContainer}>
      <Animated.View style={[styles.skeletonImage, { backgroundColor: bg }]} />
      <View style={styles.skeletonContent}>
        <Animated.View
          style={[styles.skeletonLine, { width: "70%", backgroundColor: bg }]}
        />
        <Animated.View
          style={[styles.skeletonLine, { width: "45%", backgroundColor: bg }]}
        />
        <Animated.View
          style={[styles.skeletonLine, { width: "30%", backgroundColor: bg }]}
        />
        <Animated.View
          style={[styles.skeletonBlock, { backgroundColor: bg }]}
        />
      </View>
    </View>
  );
}

export default function BookDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [book, setBook] = useState<any>(null);
  const [added, setAdded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleImg = useRef(new Animated.Value(1.08)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const heartRotate = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === "web") {
        setIsLoggedIn(!!localStorage.getItem("token"));
      }
      setLiked(wishlistStorage.isLiked(String(id)));
    }, [id]),
  );

  useEffect(() => {
    loadBook();
  }, []);

  const loadBook = async () => {
    try {
      const res = await fetch(`${API_URL}/api/books/${id}`);
      const data = await res.json();
      setBook(data);
      setLiked(wishlistStorage.isLiked(String(id)));

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }),
        Animated.timing(scaleImg, {
          toValue: 1,
          duration: 600,
          useNativeDriver: false,
        }),
      ]).start();
    } catch (err) {
      console.log(err);
    }
  };

  const handleAddToCart = () => {
    Animated.sequence([
      Animated.timing(btnScale, {
        toValue: 0.92,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.spring(btnScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: false,
      }),
    ]).start();

    if (book) {
      cartStorage.add({
        bookId: String(id),
        title: book.title,
        author: book.author,
        imageUrl: book.imageUrl,
        price: book.price,
      });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };
  const handleLike = () => {
    const newVal = wishlistStorage.toggle(String(id));
    setLiked(newVal);
    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.6,
        duration: 120,
        useNativeDriver: false,
      }),
      Animated.timing(heartRotate, {
        toValue: 1,
        duration: 80,
        useNativeDriver: false,
      }),
      Animated.timing(heartRotate, {
        toValue: -1,
        duration: 80,
        useNativeDriver: false,
      }),
      Animated.timing(heartRotate, {
        toValue: 0,
        duration: 80,
        useNativeDriver: false,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const heartRotateDeg = heartRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-15deg", "0deg", "15deg"],
  });

  if (!book) return <SkeletonLoader />;

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[styles.imageWrapper, { transform: [{ scale: scaleImg }] }]}
        >
          <Image source={{ uri: book.imageUrl }} style={styles.image} />
          <View style={styles.imageOverlay} />

          <View style={styles.priceBadge}>
            <Text style={styles.priceBadgeText}>${book.price}</Text>
          </View>

          {isLoggedIn && (
            <TouchableOpacity
              style={styles.likeBtn}
              onPress={handleLike}
              activeOpacity={0.8}
            >
              <Animated.View
                style={{
                  transform: [
                    { scale: heartScale },
                    { rotate: heartRotateDeg },
                  ],
                }}
              >
                <Ionicons
                  name={liked ? "heart" : "heart-outline"}
                  size={24}
                  color={liked ? "#f43f5e" : "white"}
                />
              </Animated.View>
            </TouchableOpacity>
          )}
        </Animated.View>

        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.tagsRow}>
            {book.genreName && (
              <View style={styles.tag}>
                <Ionicons name="bookmark" size={11} color="#a78bfa" />
                <Text style={styles.tagText}> {book.genreName}</Text>
              </View>
            )}
            <View style={styles.tag}>
              <Ionicons name="layers-outline" size={11} color="#a78bfa" />
              <Text style={styles.tagText}> {book.stock} in stock</Text>
            </View>
            {book.publisherName && (
              <View style={styles.tag}>
                <Ionicons name="business-outline" size={11} color="#a78bfa" />
                <Text style={styles.tagText}> {book.publisherName}</Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.author}>by {book.author}</Text>
          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>
            <Ionicons name="reader-outline" size={14} color="#8b5cf6" />{" "}
            Description
          </Text>
          <Text style={styles.description}>{book.description}</Text>
          <View style={{ height: 120 }} />
        </Animated.View>
      </ScrollView>

      <Animated.View
        style={[styles.bottomBar, { transform: [{ scale: btnScale }] }]}
      >
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Price</Text>
          <Text style={styles.price}>${book.price}</Text>
        </View>
        <TouchableOpacity
          style={[styles.cartBtn, added && styles.cartBtnDone]}
          onPress={handleAddToCart}
          activeOpacity={0.85}
        >
          <Ionicons
            name={added ? "checkmark-circle-outline" : "bag-add-outline"}
            size={20}
            color="white"
          />
          <Text style={styles.cartText}>
            {added ? "Added!" : "Add to Cart"}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b0b10" },
  scroll: { flex: 1 },
  skeletonContainer: { flex: 1, backgroundColor: "#0b0b10" },
  skeletonImage: { width: "100%", height: 300 },
  skeletonContent: { padding: 20, gap: 14 },
  skeletonLine: { height: 16, borderRadius: 8 },
  skeletonBlock: { height: 100, borderRadius: 12, marginTop: 10 },
  imageWrapper: { width: "100%", height: 300, position: "relative" },
  image: { width: "100%", height: "100%" },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: "rgba(11,11,16,0.6)",
  },
  priceBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "#7c3aed",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  priceBadgeText: { color: "white", fontWeight: "700", fontSize: 15 },
  likeBtn: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  content: { padding: 20, marginTop: 0 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(139,92,246,0.12)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.25)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: { color: "#a78bfa", fontSize: 11 },
  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.3,
    lineHeight: 34,
    marginBottom: 6,
  },
  author: { color: "#888", fontSize: 16, marginBottom: 24 },
  divider: {
    height: 1,
    backgroundColor: "rgba(139,92,246,0.15)",
    marginBottom: 20,
  },
  sectionLabel: {
    color: "#8b5cf6",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },
  description: { color: "#d1d5db", fontSize: 15, lineHeight: 26 },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 28,
    backgroundColor: "#13131f",
    borderTopWidth: 1,
    borderTopColor: "rgba(139,92,246,0.2)",
  },
  priceRow: { gap: 2 },
  priceLabel: { color: "#555", fontSize: 12 },
  price: { color: "#c084fc", fontSize: 26, fontWeight: "800" },
  cartBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7c3aed",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  cartBtnDone: { backgroundColor: "#16a34a" },
  cartText: { color: "white", fontSize: 15, fontWeight: "700" },
});
