import API_URL from "@/.expo/config/api";
import { useTheme } from "@/context/ThemeContext";
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
import { useTranslation } from "react-i18next";
import cartStorage from "../../hooks/cartStorage";

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
  const { theme } = useTheme();
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
    outputRange: [theme.bg2, theme.bg3],
  });

  return (
    <View style={[styles.skeletonContainer, { backgroundColor: theme.bg }]}> 
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
  const { theme } = useTheme();
  const { t } = useTranslation();
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
    <View style={[styles.root, { backgroundColor: theme.bg }]}> 
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[styles.imageWrapper, { transform: [{ scale: scaleImg }] }]}
        >
          <Image source={{ uri: book.imageUrl }} style={styles.image} />
          <View
            style={[
              styles.imageOverlay,
              {
                backgroundColor: theme.dark
                  ? "rgba(11,11,16,0.65)"
                  : "rgba(245,240,232,0.5)",
              },
            ]}
          />

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
              <View
                style={[
                  styles.tag,
                  {
                    backgroundColor: theme.accentBg,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Ionicons name="bookmark" size={11} color={theme.accent} />
                <Text style={[styles.tagText, { color: theme.accent }]}> 
                  {book.genreName}
                </Text>
              </View>
            )}
            <View
              style={[
                styles.tag,
                { backgroundColor: theme.accentBg, borderColor: theme.border },
              ]}
            >
              <Ionicons name="layers-outline" size={11} color={theme.accent} />
              <Text style={[styles.tagText, { color: theme.accent }]}> 
                {t("bookDetails.inStock", { count: book.stock })}
              </Text>
            </View>
            {book.publisherName && (
              <View
                style={[
                  styles.tag,
                  {
                    backgroundColor: theme.accentBg,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Ionicons
                  name="business-outline"
                  size={11}
                  color={theme.accent}
                />
                <Text style={[styles.tagText, { color: theme.accent }]}> 
                  {book.publisherName}
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.title, { color: theme.text }]}>
            {book.title}
          </Text>
          <Text style={[styles.author, { color: theme.text2 }]}> 
            {t("bookDetails.byAuthor", { author: book.author })}
          </Text>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View
            style={[
              styles.descCard,
              { backgroundColor: theme.bg2, borderColor: theme.border },
            ]}
          >
            <View style={styles.descHeader}>
              <Ionicons name="reader-outline" size={16} color={theme.accent} />
              <Text style={[styles.sectionLabel, { color: theme.accent }]}> 
                {t("bookDetails.description")}
              </Text>
            </View>
            <Text style={[styles.description, { color: theme.text2 }]}> 
              {book.description}
            </Text>
          </View>

          <View
            style={[
              styles.detailsCard,
              { backgroundColor: theme.bg2, borderColor: theme.border },
            ]}
          >
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={16} color={theme.text3} />
              <Text style={[styles.detailLabel, { color: theme.text3 }]}> 
                {t("bookDetails.author")}
              </Text>
              <Text style={[styles.detailValue, { color: theme.text }]}> 
                {book.author}
              </Text>
            </View>
            <View
              style={[styles.detailDivider, { backgroundColor: theme.border }]}
            />
            <View style={styles.detailRow}>
              <Ionicons name="bookmark-outline" size={16} color={theme.text3} />
              <Text style={[styles.detailLabel, { color: theme.text3 }]}> 
                {t("bookDetails.genre")}
              </Text>
              <Text style={[styles.detailValue, { color: theme.text }]}> 
                {book.genreName}
              </Text>
            </View>
            {book.publisherName && (
              <>
                <View
                  style={[
                    styles.detailDivider,
                    { backgroundColor: theme.border },
                  ]}
                />
                <View style={styles.detailRow}>
                  <Ionicons
                    name="business-outline"
                    size={16}
                    color={theme.text3}
                  />
                  <Text style={[styles.detailLabel, { color: theme.text3 }]}> 
                    {t("bookDetails.publisher")}
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}> 
                    {book.publisherName}
                  </Text>
                </View>
              </>
            )}
            <View
              style={[styles.detailDivider, { backgroundColor: theme.border }]}
            />
            <View style={styles.detailRow}>
              <Ionicons name="cube-outline" size={16} color={theme.text3} />
              <Text style={[styles.detailLabel, { color: theme.text3 }]}> 
                {t("bookDetails.stock")}
              </Text>
              <Text style={[styles.detailValue, { color: theme.text }]}> 
                {book.stock}
              </Text>
            </View>
          </View>

          <View style={{ height: 120 }} />
        </Animated.View>
      </ScrollView>

      <Animated.View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.bg2,
            borderTopColor: theme.border,
            transform: [{ scale: btnScale }],
          },
        ]}
      >
        <View style={styles.priceRow}>
          <Text style={[styles.priceLabel, { color: theme.text3 }]}> 
            {t("bookDetails.price")}
          </Text>
          <Text style={[styles.price, { color: theme.accent }]}> 
            ${book.price}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.cartBtn,
            { backgroundColor: added ? "#16a34a" : theme.accent },
          ]}
          onPress={handleAddToCart}
          activeOpacity={0.85}
        >
          <Ionicons
            name={added ? "checkmark-circle-outline" : "bag-add-outline"}
            size={20}
            color="white"
          />
          <Text style={styles.cartText}> 
            {added ? t("bookDetails.added") : t("bookDetails.addToCart")}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  skeletonContainer: { flex: 1 },
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
    height: 100,
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
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  content: { padding: 20 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: { fontSize: 11 },
  title: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 0.3,
    lineHeight: 32,
    marginBottom: 6,
  },
  author: { fontSize: 15, marginBottom: 20 },
  divider: { height: 1, marginBottom: 20 },
  descCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  descHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  sectionLabel: { fontSize: 14, fontWeight: "600" },
  description: { fontSize: 14, lineHeight: 24 },
  detailsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  detailLabel: { flex: 1, fontSize: 13 },
  detailValue: { fontSize: 13, fontWeight: "600" },
  detailDivider: { height: 1, marginHorizontal: 14 },
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
    borderTopWidth: 1,
  },
  priceRow: { gap: 2 },
  priceLabel: { fontSize: 12 },
  price: { fontSize: 26, fontWeight: "800" },
  cartBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  cartText: { color: "white", fontSize: 15, fontWeight: "700" },
});
