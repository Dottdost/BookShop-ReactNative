import API_URL from "@/.expo/config/api";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import cartStorage from "../hooks/cartStorage";

export default function Checkout() {
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [loading, setLoading] = useState(false);
  const btnScale = useRef(new Animated.Value(1)).current;

  const pressAnim = () => {
    Animated.sequence([
      Animated.timing(btnScale, {
        toValue: 0.96,
        duration: 80,
        useNativeDriver: false,
      }),
      Animated.spring(btnScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handleOrder = async () => {
    if (!street || !city || !country || !postalCode) {
      Alert.alert("Error", "Please fill in all address fields");
      return;
    }
    pressAnim();
    setLoading(true);

    try {
      const userId =
        Platform.OS === "web" ? localStorage.getItem("userId") : null;
      const token =
        Platform.OS === "web" ? localStorage.getItem("token") : null;
      if (!userId || !token) {
        Alert.alert("Error", "Not logged in");
        return;
      }

      // 1. создаём адрес
      const addrRes = await fetch(`${API_URL}/api/Adress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          street,
          city,
          state,
          postalCode,
          country,
        }),
      });
      const addrData = await addrRes.json();
      const userAddressId = addrData.id;

      // 2. создаём заказ
      const items = cartStorage.get();
      const orderItems = items.map((i) => ({
        bookId: i.bookId,
        quantity: i.quantity,
      }));

      const orderRes = await fetch(`${API_URL}/api/Order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          userAddressId,
          userBankCardId: null,
          promoCode: promoCode || null,
          orderItems,
        }),
      });

      if (!orderRes.ok) throw new Error("Order failed");

      cartStorage.clear();
      Alert.alert("Success! 🎉", "Your order has been placed!", [
        { text: "OK", onPress: () => router.replace("/cart") },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const items = cartStorage.get();
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Checkout</Text>

      {/* ORDER SUMMARY */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="receipt-outline" size={14} color="#8b5cf6" /> Order
          Summary
        </Text>
        {items.map((item) => (
          <View key={item.bookId} style={styles.summaryRow}>
            <Text style={styles.summaryTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.summaryQty}>×{item.quantity}</Text>
            <Text style={styles.summaryPrice}>
              ${(item.price * item.quantity).toFixed(2)}
            </Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalPrice}>${total.toFixed(2)}</Text>
        </View>
      </View>

      {/* ADDRESS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="location-outline" size={14} color="#8b5cf6" />{" "}
          Delivery Address
        </Text>

        {[
          {
            label: "Street",
            value: street,
            set: setStreet,
            icon: "home-outline",
          },
          {
            label: "City",
            value: city,
            set: setCity,
            icon: "business-outline",
          },
          { label: "State", value: state, set: setState, icon: "map-outline" },
          {
            label: "Postal Code",
            value: postalCode,
            set: setPostalCode,
            icon: "mail-outline",
          },
          {
            label: "Country",
            value: country,
            set: setCountry,
            icon: "globe-outline",
          },
        ].map(({ label, value, set, icon }) => (
          <View key={label} style={styles.inputWrapper}>
            <Ionicons
              name={icon as any}
              size={16}
              color="#555"
              style={styles.inputIcon}
            />
            <TextInput
              placeholder={label}
              placeholderTextColor="#555"
              value={value}
              onChangeText={set}
              style={styles.input}
            />
          </View>
        ))}
      </View>

      {/* PROMO */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="pricetag-outline" size={14} color="#8b5cf6" /> Promo
          Code
        </Text>
        <View style={styles.inputWrapper}>
          <Ionicons
            name="gift-outline"
            size={16}
            color="#555"
            style={styles.inputIcon}
          />
          <TextInput
            placeholder="Enter promo code (optional)"
            placeholderTextColor="#555"
            value={promoCode}
            onChangeText={setPromoCode}
            style={styles.input}
            autoCapitalize="characters"
          />
        </View>
      </View>

      <Animated.View
        style={{
          transform: [{ scale: btnScale }],
          marginHorizontal: 20,
          marginBottom: 40,
        }}
      >
        <TouchableOpacity
          style={styles.orderBtn}
          onPress={handleOrder}
          disabled={loading}
        >
          <Ionicons
            name={loading ? "time-outline" : "checkmark-circle-outline"}
            size={22}
            color="white"
          />
          <Text style={styles.orderBtnText}>
            {loading ? "Placing order..." : "Place Order"}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b10" },
  pageTitle: {
    color: "white",
    fontSize: 28,
    fontWeight: "800",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  section: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: "#13131f",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.15)",
    gap: 10,
  },
  sectionTitle: {
    color: "#8b5cf6",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  summaryTitle: { flex: 1, color: "white", fontSize: 13 },
  summaryQty: { color: "#888", fontSize: 13 },
  summaryPrice: { color: "#c084fc", fontSize: 13, fontWeight: "700" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(139,92,246,0.15)",
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: { color: "#888", fontSize: 15 },
  totalPrice: { color: "white", fontSize: 20, fontWeight: "800" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0b0b10",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.2)",
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: "white", fontSize: 14, paddingVertical: 12 },
  orderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7c3aed",
    borderRadius: 16,
    paddingVertical: 18,
    gap: 10,
    marginTop: 8,
  },
  orderBtnText: { color: "white", fontSize: 16, fontWeight: "700" },
});
