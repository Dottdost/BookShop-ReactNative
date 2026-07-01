import { useAuth } from "@/app/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import API_URL from "@/services/config/api";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import cartStorage from "../../hooks/cartStorage";
import wishlistStorage from "../../hooks/wishlistStorage";

function getParamId(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function unwrapBook(data: any) {
  return data?.data ?? data?.book ?? data;
}

function getBookId(book: any, fallback = "") {
  return String(
    book?.id ?? book?.bookId ?? book?.Id ?? book?.BookId ?? fallback ?? "",
  );
}

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
  const { token, userId, loading: authLoading } = useAuth();

  const bookId = getParamId(id);

  const [book, setBook] = useState<any>(null);
  const [added, setAdded] = useState(false);
  const [liked, setLiked] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleImg = useRef(new Animated.Value(1.08)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const heartRotate = useRef(new Animated.Value(0)).current;

  const resetAnimation = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(40);
    scaleImg.setValue(1.08);
  };

  const loadBook = async (currentBookId: string) => {
    try {
      setBook(null);
      setAdded(false);
      resetAnimation();

      const res = await fetch(
        `${API_URL}/api/books/${encodeURIComponent(currentBookId)}`,
      );

      const data = await res.json();
      const loadedBook = unwrapBook(data);

      setBook(loadedBook);

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
      console.log("Book load error:", err);
    }
  };

  const checkLiked = async () => {
    if (!bookId || !token || !userId) {
      setLiked(false);
      return;
    }

    const currentBookId = getBookId(book, bookId);
    const likedValue = await wishlistStorage.isLikedAsync(
      currentBookId,
      userId,
    );

    setLiked(likedValue);
  };

  useFocusEffect(
    useCallback(() => {
      void checkLiked();
    }, [bookId, book?.id, token, userId]),
  );

  useEffect(() => {
    if (!bookId) return;

    void loadBook(bookId);
  }, [bookId]);

  useEffect(() => {
    void checkLiked();
  }, [book?.id, token, userId]);

  const handleAddToCart = async () => {
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

    if (authLoading) return;

    if (!token || !userId) {
      router.push("/sign-in");
      return;
    }

    if (book) {
      const currentBookId = getBookId(book, bookId);

      await cartStorage.addAsync(
        {
          bookId: currentBookId,
          title: String(book.title ?? book.Title ?? ""),
          author: String(book.author ?? book.Author ?? ""),
          imageUrl: String(book.imageUrl ?? book.ImageUrl ?? ""),
          price: Number(book.price ?? book.Price ?? 0),
        },
        userId,
      );
    }

    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleLike = async () => {
    if (authLoading) return;

    if (!token || !userId) {
      router.push("/sign-in");
      return;
    }

    const currentBookId = getBookId(book, bookId);

    const newVal = await wishlistStorage.toggleAsync(currentBookId, userId);
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
          <Image
            source={{
              uri:
                book.imageUrl ||
                book.ImageUrl ||
                "https://placehold.co/360x520/241633/d8b4fe?text=Book",
            }}
            style={styles.image}
          />

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
            <Text style={styles.priceBadgeText}>${book.price ?? 0}</Text>
          </View>

          <TouchableOpacity
            style={styles.likeBtn}
            onPress={handleLike}
            activeOpacity={0.8}
          >
            <Animated.View
              style={{
                transform: [{ scale: heartScale }, { rotate: heartRotateDeg }],
              }}
            >
              <Ionicons
                name={liked ? "heart" : "heart-outline"}
                size={24}
                color={liked ? "#f43f5e" : "white"}
              />
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.tagsRow}>
            {!!book.genreName && (
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
                {t("bookDetails.inStock", { count: book.stock ?? 0 })}
              </Text>
            </View>

            {!!book.publisherName && (
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
              {book.description || "No description"}
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
                {book.genreName || "—"}
              </Text>
            </View>

            {!!book.publisherName && (
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
                {book.stock ?? 0}
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
            borderColor: theme.border,
            transform: [{ scale: btnScale }],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.accentBg }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={theme.accent} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.addBtn,
            {
              backgroundColor: added ? "#22c55e" : theme.accent,
            },
          ]}
          onPress={handleAddToCart}
        >
          <Ionicons
            name={added ? "checkmark-circle-outline" : "cart-outline"}
            size={20}
            color="white"
          />

          <Text style={styles.addBtnText}>
            {added ? t("bookDetails.added") : t("bookDetails.addToCart")}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  scroll: {
    flex: 1,
  },

  skeletonContainer: {
    flex: 1,
  },

  skeletonImage: {
    height: 360,
  },

  skeletonContent: {
    padding: 22,
  },

  skeletonLine: {
    height: 18,
    borderRadius: 10,
    marginBottom: 14,
  },

  skeletonBlock: {
    height: 120,
    borderRadius: 20,
    marginTop: 12,
  },

  imageWrapper: {
    height: 390,
    overflow: "hidden",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  priceBadge: {
    position: "absolute",
    right: 20,
    bottom: 22,
    backgroundColor: "#8b5cf6",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
  },

  priceBadgeText: {
    color: "white",
    fontWeight: "900",
    fontSize: 18,
  },

  likeBtn: {
    position: "absolute",
    top: 48,
    right: 20,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    padding: 22,
  },

  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },

  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },

  tagText: {
    fontSize: 11,
    fontWeight: "800",
  },

  title: {
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 36,
  },

  author: {
    fontSize: 16,
    marginTop: 8,
  },

  divider: {
    height: 1,
    marginVertical: 22,
  },

  descCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
  },

  descHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 10,
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  description: {
    fontSize: 15,
    lineHeight: 23,
  },

  detailsCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 7,
  },

  detailLabel: {
    flex: 1,
    fontSize: 13,
  },

  detailValue: {
    fontSize: 13,
    fontWeight: "800",
    maxWidth: "55%",
    textAlign: "right",
  },

  detailDivider: {
    height: 1,
    marginVertical: 4,
  },

  bottomBar: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 20,
    borderRadius: 24,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    gap: 12,
  },

  backBtn: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  addBtn: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  addBtnText: {
    color: "white",
    fontSize: 15,
    fontWeight: "900",
  },
});
