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
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Link href={`/book/${item.bookId}` as any} asChild>
        <TouchableOpacity style={styles.cardLeft} activeOpacity={0.85}>
          <Image source={{ uri: item.imageUrl }} style={styles.image} />
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.author}>{item.author}</Text>
            <Text style={styles.unitPrice}>${item.price} each</Text>
            <Text style={styles.subtotal}>
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
            style={styles.qtyBtn}
            onPress={() => {
              if (item.quantity > 1)
                onQtyChange(item.bookId, item.quantity - 1);
              else handleRemove();
            }}
          >
            <Ionicons name="remove" size={16} color="white" />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => onQtyChange(item.bookId, item.quantity + 1)}
          >
            <Ionicons name="add" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

export default function Cart() {
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
      <View style={styles.container}>
        <View style={styles.emptyCenter}>
          <Ionicons name="cart-outline" size={64} color="#333" />
          <Text style={styles.emptyTitle}>Sign in to use Cart</Text>
          <Text style={styles.emptySubtitle}>
            Add books and checkout easily
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
        <Text style={styles.headerTitle}>My Cart</Text>
        <Text style={styles.headerCount}>
          {totalItems} item{totalItems !== 1 ? "s" : ""}
        </Text>
      </Animated.View>

      {items.length === 0 ? (
        <View style={styles.emptyCenter}>
          <Ionicons name="cart-outline" size={64} color="#333" />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Add books from the catalogue</Text>
          <Link href="/books" asChild>
            <TouchableOpacity style={styles.signInBtn}>
              <Ionicons name="book-outline" size={18} color="white" />
              <Text style={styles.signInBtnText}>Browse Books</Text>
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

          {/* BOTTOM BAR */}
          <View style={styles.bottomBar}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalPrice}>${total.toFixed(2)}</Text>
            </View>

            <Animated.View style={{ transform: [{ scale: btnAnim }] }}>
              <Link href="/checkout" asChild>
                <TouchableOpacity
                  style={styles.checkoutBtn}
                  onPress={handleCheckout}
                >
                  <Ionicons name="bag-check-outline" size={20} color="white" />
                  <Text style={styles.checkoutText}>Checkout</Text>
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
  },
  cardLeft: { flex: 1, flexDirection: "row", padding: 12, gap: 12 },
  image: {
    width: 75,
    height: 105,
    borderRadius: 12,
    backgroundColor: "#1a1a25",
  },
  info: { flex: 1, justifyContent: "center", gap: 3 },
  title: { color: "white", fontSize: 14, fontWeight: "700", lineHeight: 18 },
  author: { color: "#888", fontSize: 12 },
  unitPrice: { color: "#555", fontSize: 11, marginTop: 4 },
  subtotal: { color: "#c084fc", fontSize: 16, fontWeight: "800" },
  cardRight: {
    paddingVertical: 12,
    paddingHorizontal: 10,
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
    backgroundColor: "rgba(139,92,246,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  qtyText: {
    color: "white",
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
    backgroundColor: "#13131f",
    borderTopWidth: 1,
    borderTopColor: "rgba(139,92,246,0.2)",
    padding: 20,
    paddingBottom: 32,
    gap: 14,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { color: "#888", fontSize: 16 },
  totalPrice: { color: "white", fontSize: 28, fontWeight: "800" },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7c3aed",
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
