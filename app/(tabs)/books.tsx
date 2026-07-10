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
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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

const BOOKS_PER_PAGE = 10;

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

    if (Platform.OS === "web") {
      localStorage.setItem(wishlistStorage._key(), JSON.stringify(list));
    }

    return idx === -1;
  },

  isLiked: (id: string): boolean => wishlistStorage.get().includes(id),
};

function unwrapArray<T>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.$values)) return data.$values;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.$values)) return data.data.$values;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.items?.$values)) return data.items.$values;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.items?.$values)) return data.data.items.$values;

  return [];
}

function normalizeBook(item: any): Book {
  return {
    id: String(item.id ?? item.bookId ?? item.Id ?? item.BookId ?? ""),
    title: String(item.title ?? item.Title ?? ""),
    author: String(item.author ?? item.Author ?? ""),
    imageUrl: String(item.imageUrl ?? item.ImageUrl ?? ""),
    genreName: String(item.genreName ?? item.GenreName ?? ""),
    price: Number(item.price ?? item.Price ?? 0),
  };
}

function normalizeGenre(item: any): Genre {
  return {
    id: Number(item.id ?? item.Id ?? 0),
    name: String(
      item.name ?? item.Name ?? item.genreName ?? item.GenreName ?? "",
    ),
  };
}

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
          <Image
            source={{
              uri:
                item.imageUrl ||
                "https://placehold.co/240x340/241633/d8b4fe?text=Book",
            }}
            style={styles.image}
          />

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

            <Text style={[styles.infoGenre, { color: theme.accent }]}> 
              {item.genreName || "No genre"}
            </Text>
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
  const [genreDropdownOpen, setGenreDropdownOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const selectedGenreLabel =
    selectedGenre || t("booksScreen.allGenres") || "All genres";

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
        setError(null);

        const [booksRes, genresRes] = await Promise.all([
          fetch(`${API_URL}/api/books?page=1&pageSize=100`),
          fetch(`${API_URL}/api/genres/all`),
        ]);

        const booksData = await booksRes.json();
        const genresData = await genresRes.json();

        if (!booksRes.ok) {
          throw new Error(
            booksData?.message || `Books status ${booksRes.status}`,
          );
        }

        if (!genresRes.ok) {
          throw new Error(
            genresData?.message || `Genres status ${genresRes.status}`,
          );
        }

        const loadedBooks = unwrapArray<any>(booksData).map(normalizeBook);
        const loadedGenres = unwrapArray<any>(genresData)
          .map(normalizeGenre)
          .filter((genre) => genre.id && genre.name);

        setBooks(loadedBooks);
        setFiltered(loadedBooks);
        setGenres(loadedGenres);
      } catch (e: any) {
        setError(e?.message || "Error loading books");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    let result = books;

    const cleanSearch = search.trim().toLowerCase();

    if (cleanSearch) {
      result = result.filter(
        (book) =>
          book.title.toLowerCase().includes(cleanSearch) ||
          book.author.toLowerCase().includes(cleanSearch),
      );
    }

    if (selectedGenre) {
      result = result.filter((book) => book.genreName === selectedGenre);
    }

    setFiltered(result);
    setCurrentPage(1);
  }, [search, selectedGenre, books]);

  const chooseGenre = (genreName: string | null) => {
    setSelectedGenre(genreName);
    setGenreDropdownOpen(false);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / BOOKS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedBooks = filtered.slice(
    (safeCurrentPage - 1) * BOOKS_PER_PAGE,
    safeCurrentPage * BOOKS_PER_PAGE,
  );
  const canGoPrevious = safeCurrentPage > 1;
  const canGoNext = safeCurrentPage < totalPages;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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

      <View style={styles.dropdownBlock}>
        <Text style={[styles.dropdownLabel, { color: theme.text2 }]}>Genre</Text>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.selectBox,
            {
              backgroundColor: theme.bg2,
              borderColor: genreDropdownOpen ? theme.accent : theme.border,
            },
          ]}
          onPress={() => setGenreDropdownOpen((prev) => !prev)}
        >
          <View style={styles.selectLeft}>
            <Ionicons
              name="bookmark-outline"
              size={16}
              color={selectedGenre ? theme.accent : theme.text3}
            />

            <Text
              style={[
                styles.selectText,
                { color: selectedGenre ? theme.text : theme.text3 },
              ]}
              numberOfLines={1}
            >
              {selectedGenreLabel}
            </Text>
          </View>

          <Ionicons
            name={genreDropdownOpen ? "chevron-up-outline" : "chevron-down-outline"}
            size={18}
            color={theme.accent}
          />
        </TouchableOpacity>

        {genreDropdownOpen && (
          <View
            style={[
              styles.dropdownList,
              {
                backgroundColor: theme.bg2,
                borderColor: theme.border,
              },
            ]}
          >
            <ScrollView nestedScrollEnabled style={{ maxHeight: 190 }}>
              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  {
                    backgroundColor: !selectedGenre
                      ? theme.accentBg
                      : "transparent",
                  },
                ]}
                onPress={() => chooseGenre(null)}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    {
                      color: !selectedGenre ? theme.accent : theme.text,
                      fontWeight: !selectedGenre ? "800" : "500",
                    },
                  ]}
                >
                  {t("booksScreen.allGenres")}
                </Text>

                {!selectedGenre && (
                  <Ionicons
                    name="checkmark-outline"
                    size={16}
                    color={theme.accent}
                  />
                )}
              </TouchableOpacity>

              {genres.length > 0 ? (
                genres.map((genre) => {
                  const active = selectedGenre === genre.name;

                  return (
                    <TouchableOpacity
                      key={String(genre.id)}
                      style={[
                        styles.dropdownItem,
                        {
                          backgroundColor: active ? theme.accentBg : "transparent",
                        },
                      ]}
                      onPress={() => chooseGenre(active ? null : genre.name)}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          {
                            color: active ? theme.accent : theme.text,
                            fontWeight: active ? "800" : "500",
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {genre.name}
                      </Text>

                      {active && (
                        <Ionicons
                          name="checkmark-outline"
                          size={16}
                          color={theme.accent}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={[styles.emptyDropdown, { color: theme.text3 }]}> 
                  No genres loaded
                </Text>
              )}
            </ScrollView>
          </View>
        )}
      </View>

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

          <Text style={styles.errorText}>{error}</Text>

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
          data={paginatedBooks}
          keyExtractor={(item, index) => item.id || String(index)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={{ paddingBottom: 90 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <BookCard item={item} isLoggedIn={isLoggedIn} />
          )}
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  disabled={!canGoPrevious}
                  onPress={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  style={[
                    styles.pageButton,
                    {
                      backgroundColor: canGoPrevious ? theme.accent : theme.bg3,
                      opacity: canGoPrevious ? 1 : 0.55,
                    },
                  ]}
                >
                  <Ionicons name="chevron-back-outline" size={19} color="white" />
                </TouchableOpacity>

                <View
                  style={[
                    styles.pageInfo,
                    {
                      backgroundColor: theme.bg2,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.pageInfoText, { color: theme.text }]}> 
                    {safeCurrentPage} / {totalPages}
                  </Text>
                </View>

                <TouchableOpacity
                  disabled={!canGoNext}
                  onPress={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  style={[
                    styles.pageButton,
                    {
                      backgroundColor: canGoNext ? theme.accent : theme.bg3,
                      opacity: canGoNext ? 1 : 0.55,
                    },
                  ]}
                >
                  <Ionicons
                    name="chevron-forward-outline"
                    size={19}
                    color="white"
                  />
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 16,
  },

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

  searchInput: {
    flex: 1,
    fontSize: 14,
  },

  dropdownBlock: {
    marginBottom: 12,
    zIndex: 20,
  },

  dropdownLabel: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 7,
    paddingHorizontal: 2,
  },

  selectBox: {
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },

  selectText: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },

  dropdownList: {
    borderWidth: 1,
    borderRadius: 16,
    marginTop: 8,
    overflow: "hidden",
  },

  dropdownItem: {
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  dropdownItemText: {
    fontSize: 13,
    flex: 1,
  },

  emptyDropdown: {
    fontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlign: "center",
  },

  countText: {
    fontSize: 12,
    marginBottom: 12,
  },

  card: {
    width: "100%",
    height: 280,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
  },

  imageContainer: {
    width: "100%",
    height: 220,
    position: "relative",
  },

  image: {
    width: "100%",
    height: "100%",
  },

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
    paddingHorizontal: 14,
    paddingVertical: 3,
  },

  priceText: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
  },

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

  staticInfo: {
    padding: 10,
  },

  bookTitle: {
    fontSize: 12,
    fontWeight: "700",
  },

  bookAuthor: {
    fontSize: 11,
    marginTop: 2,
  },

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

  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },

  infoAuthor: {
    fontSize: 12,
  },

  genreRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },

  infoGenre: {
    fontSize: 11,
  },

  cartBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 8,
    gap: 6,
  },

  cartText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },

  row: {
    justifyContent: "space-between",
  },

  pagination: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    marginBottom: 20,
  },

  pageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  pageInfo: {
    minWidth: 82,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  pageInfoText: {
    fontSize: 14,
    fontWeight: "900",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  loadingText: {
    marginTop: 12,
  },

  errorText: {
    color: "#f87171",
    fontSize: 14,
  },

  errorHint: {
    fontSize: 12,
  },

  emptyText: {
    fontSize: 16,
    marginTop: 8,
  },
});
