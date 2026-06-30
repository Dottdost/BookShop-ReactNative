import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import cartStorage, { CartItem } from "../hooks/cartStorage";

function CartCard({
  item,
  onRemove,
  onQtyChange,
}: {
  item: CartItem;
  onRemove: (id: string) => void;
  onQtyChange: (id: string, qty: number) => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: false,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  const handleRemove = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
    }).start(() => onRemove(item.bookId));
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
      <Link href={`/book/${item.bookId}`}>
        <TouchableOpacity style={styles.cardLeft} activeOpacity={0.85}>
          <Image
            source={{ uri: item.imageUrl }}
            style={[styles.image, { backgroundColor: theme.bg3 }]}
          />
          <View style={styles.info}>
            <Text
              style={[styles.title, { color: theme.text }]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            <Text style={[styles.author, { color: theme.text2 }]}>
              {item.author}
            </Text>
            <Text style={[styles.unitPrice, { color: theme.text3 }]}>
              ${item.price} {t("cartScreen.each")}
            </Text>
            <Text style={[styles.subtotal, { color: theme.accent }]}>
              ${(item.price * item.quantity).toFixed(2)}
            </Text>
          </View>
        </TouchableOpacity>
      </Link>

      <View style={styles.cardRight}>
        <TouchableOpacity style={styles.removeBtn} onPress={handleRemove}>
          <Ionicons name="trash-outline" size={18} color="#f87171" />
        </TouchableOpacity>
        <View style={styles.qtyRow}>
          <TouchableOpacity
            style={[styles.qtyBtn, { backgroundColor: theme.accentBg }]}
            onPress={() => {
              if (item.quantity > 1)
                onQtyChange(item.bookId, item.quantity - 1);
              else handleRemove();
            }}
          >
            <Ionicons name="remove" size={16} color={theme.accent} />
          </TouchableOpacity>
          <Text style={[styles.qtyText, { color: theme.text }]}>
            {item.quantity}
          </Text>
          <TouchableOpacity
            style={[styles.qtyBtn, { backgroundColor: theme.accentBg }]}
            onPress={() => onQtyChange(item.bookId, item.quantity + 1)}
          >
            <Ionicons name="add" size={16} color={theme.accent} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

export default function Cart() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const headerAnim = useRef(new Animated.Value(0)).current;
  const btnAnim = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      const loggedIn =
        Platform.OS === "web" ? !!localStorage.getItem("token") : false;
      setIsLoggedIn(loggedIn);
      setItems(cartStorage.get());
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }).start();
    }, []),
  );

  const handleRemove = (bookId: string) => {
    cartStorage.remove(bookId);
    setItems(cartStorage.get());
  };
  const handleQtyChange = (bookId: string, qty: number) => {
    cartStorage.updateQty(bookId, qty);
    setItems(cartStorage.get());
  };

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  const handleCheckout = () => {
    Animated.sequence([
      Animated.timing(btnAnim, {
        toValue: 0.95,
        duration: 80,
        useNativeDriver: false,
      }),
      Animated.spring(btnAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: false,
      }),
    ]).start();
  };

  if (!isLoggedIn) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.emptyCenter}>
          <Ionicons name="cart-outline" size={64} color={theme.text3} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {t("cartScreen.signInTitle")}
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.text3 }]}>
            {t("cartScreen.signInSubtitle")}
          </Text>
          <Link href="/sign-in">
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.accent }]}
            >
              <Ionicons name="log-in-outline" size={18} color="white" />
              <Text style={styles.actionBtnText}>{t("auth.signIn")}</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Animated.View style={[styles.header, { opacity: headerAnim }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {t("cartScreen.myCart")}
        </Text>
        <Text style={[styles.headerCount, { color: theme.accent }]}>
          {t("cartScreen.itemCount", { count: totalItems })}
        </Text>
      </Animated.View>

      {items.length === 0 ? (
        <View style={styles.emptyCenter}>
          <Ionicons name="cart-outline" size={64} color={theme.text3} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {t("cartScreen.emptyTitle")}
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.text3 }]}>
            {t("cartScreen.emptySubtitle")}
          </Text>
          <Link href="/books">
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.accent }]}
            >
              <Ionicons name="book-outline" size={18} color="white" />
              <Text style={styles.actionBtnText}>
                {t("cartScreen.browseBooks")}
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => item.bookId}
            contentContainerStyle={{ padding: 16, paddingBottom: 160 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <CartCard
                item={item}
                onRemove={handleRemove}
                onQtyChange={handleQtyChange}
              />
            )}
          />
          <View
            style={[
              styles.bottomBar,
              { backgroundColor: theme.bg2, borderTopColor: theme.border },
            ]}
          >
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: theme.text2 }]}>
                {t("common.total")}
              </Text>
              <Text style={[styles.totalPrice, { color: theme.text }]}>
                ${total.toFixed(2)}
              </Text>
            </View>
            <Animated.View style={{ transform: [{ scale: btnAnim }] }}>
              <Link href="/checkout">
                <TouchableOpacity
                  style={[
                    styles.checkoutBtn,
                    { backgroundColor: theme.accent },
                  ]}
                  onPress={handleCheckout}
                >
                  <Ionicons name="bag-check-outline" size={20} color="white" />
                  <Text style={styles.checkoutText}>
                    {t("cartScreen.checkout")}
                  </Text>
                </TouchableOpacity>
              </Link>
            </Animated.View>
          </View>
        </>
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
  },
  cardLeft: { flex: 1, flexDirection: "row", padding: 12, gap: 12 },
  image: { width: 75, height: 105, borderRadius: 12 },
  info: { flex: 1, justifyContent: "center", gap: 3 },
  title: { fontSize: 14, fontWeight: "700", lineHeight: 18 },
  author: { fontSize: 12 },
  unitPrice: { fontSize: 11, marginTop: 4 },
  subtotal: { fontSize: 16, fontWeight: "800" },
  cardRight: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    justifyContent: "space-between",
    alignItems: "center",
  },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(248,113,113,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyText: {
    fontSize: 15,
    fontWeight: "700",
    minWidth: 20,
    textAlign: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: 32,
    gap: 14,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontSize: 16 },
  totalPrice: { fontSize: 28, fontWeight: "800" },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 16,
    gap: 10,
  },
  checkoutText: { color: "white", fontSize: 16, fontWeight: "700" },
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
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 8,
    marginTop: 8,
  },
  actionBtnText: { color: "white", fontWeight: "700", fontSize: 15 },
});
