import API_URL from "@/.expo/config/api";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import cartStorage from "../hooks/cartStorage";

function CardModal({
  visible,
  onClose,
  onConfirm,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (card: {
    cardNumber: string;
    cardHolderName: string;
    expirationDate: string;
    cvv: string;
  }) => void;
  loading: boolean;
}) {
  const { theme } = useTheme();
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolderName, setCardHolderName] = useState("");
  const [expDate, setExpDate] = useState("");
  const [cvv, setCvv] = useState("");
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const formatCardNumber = (val: string) =>
    val
      .replace(/\D/g, "")
      .slice(0, 16)
      .replace(/(.{4})/g, "$1 ")
      .trim();
  const formatExpDate = (val: string) => {
    const c = val.replace(/\D/g, "").slice(0, 4);
    return c.length >= 3 ? c.slice(0, 2) + "/" + c.slice(2) : c;
  };

  if (visible) {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: false,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 400,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start(() => onClose());
  };

  const handleConfirm = () => {
    if (!cardNumber || !cardHolderName || !expDate || !cvv) {
      Alert.alert("Error", "Please fill in all card fields");
      return;
    }
    const [month, year] = expDate.split("/");
    const fullYear = year ? `20${year}` : "2026";
    const expirationDate = `${fullYear}-${month?.padStart(2, "0")}-01`;
    onConfirm({
      cardNumber: cardNumber.replace(/\s/g, ""),
      cardHolderName,
      expirationDate,
      cvv: cvv.slice(0, 4),
    });
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.bottomSheet,
          {
            backgroundColor: theme.bg2,
            borderColor: theme.border,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: theme.border }]} />
        <Text style={[styles.sheetTitle, { color: theme.text }]}>
          Payment Details
        </Text>
        <Text style={[styles.sheetSubtitle, { color: theme.text3 }]}>
          Your card info is used only for this order
        </Text>

        {/* карта-превью */}
        <View style={styles.cardPreview}>
          <View style={styles.cardPreviewTop}>
            <Ionicons
              name="card-outline"
              size={28}
              color="rgba(255,255,255,0.6)"
            />
            <Text style={styles.cardChip}>VISA</Text>
          </View>
          <Text style={styles.cardNumberPreview}>
            {cardNumber || "•••• •••• •••• ••••"}
          </Text>
          <View style={styles.cardPreviewBottom}>
            <View>
              <Text style={styles.cardLabel}>CARD HOLDER</Text>
              <Text style={styles.cardValue}>
                {cardHolderName || "YOUR NAME"}
              </Text>
            </View>
            <View>
              <Text style={styles.cardLabel}>EXPIRES</Text>
              <Text style={styles.cardValue}>{expDate || "MM/YY"}</Text>
            </View>
          </View>
        </View>

        {[
          {
            icon: "card-outline",
            placeholder: "Card Number",
            value: cardNumber,
            set: (v: string) => setCardNumber(formatCardNumber(v)),
            keyboard: "numeric",
            maxLen: 19,
          },
          {
            icon: "person-outline",
            placeholder: "Card Holder Name",
            value: cardHolderName,
            set: (v: string) => setCardHolderName(v.toUpperCase()),
            keyboard: "default",
            maxLen: 50,
          },
        ].map(({ icon, placeholder, value, set, keyboard, maxLen }) => (
          <View
            key={placeholder}
            style={[
              styles.inputWrapper,
              { backgroundColor: theme.bg, borderColor: theme.border },
            ]}
          >
            <Ionicons
              name={icon as any}
              size={16}
              color={theme.text3}
              style={styles.inputIcon}
            />
            <TextInput
              placeholder={placeholder}
              placeholderTextColor={theme.text3}
              value={value}
              onChangeText={set}
              style={[styles.input, { color: theme.text }]}
              keyboardType={keyboard as any}
              maxLength={maxLen}
            />
          </View>
        ))}

        <View style={styles.row}>
          <View
            style={[
              styles.inputWrapper,
              {
                flex: 1,
                marginRight: 8,
                backgroundColor: theme.bg,
                borderColor: theme.border,
              },
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={16}
              color={theme.text3}
              style={styles.inputIcon}
            />
            <TextInput
              placeholder="MM/YY"
              placeholderTextColor={theme.text3}
              value={expDate}
              onChangeText={(v) => setExpDate(formatExpDate(v))}
              style={[styles.input, { color: theme.text }]}
              keyboardType="numeric"
              maxLength={5}
            />
          </View>
          <View
            style={[
              styles.inputWrapper,
              { flex: 1, backgroundColor: theme.bg, borderColor: theme.border },
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={16}
              color={theme.text3}
              style={styles.inputIcon}
            />
            <TextInput
              placeholder="CVV"
              placeholderTextColor={theme.text3}
              value={cvv}
              onChangeText={(v) => setCvv(v.replace(/\D/g, "").slice(0, 4))}
              style={[styles.input, { color: theme.text }]}
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: theme.accent }]}
          onPress={handleConfirm}
          disabled={loading}
        >
          <Ionicons
            name={loading ? "time-outline" : "checkmark-circle-outline"}
            size={20}
            color="white"
          />
          <Text style={styles.confirmBtnText}>
            {loading ? "Processing..." : "Confirm & Pay"}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

export default function Checkout() {
  const { theme } = useTheme();
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
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

  const handlePlaceOrder = () => {
    if (!street || !city || !country || !postalCode) {
      Alert.alert("Error", "Please fill in all address fields");
      return;
    }
    pressAnim();
    setShowCardModal(true);
  };

  const handleCardConfirm = async (card: {
    cardNumber: string;
    cardHolderName: string;
    expirationDate: string;
    cvv: string;
  }) => {
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

      const cardRes = await fetch(`${API_URL}/api/Card`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...card, userId }),
      });
      const cardData = await cardRes.json();

      const items = cartStorage.get();
      const orderRes = await fetch(`${API_URL}/api/Order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          userAddressId: addrData.id,
          userBankCardId: cardData.id,
          promoCode: promoCode || null,
          orderItems: items.map((i) => ({
            bookId: i.bookId,
            quantity: i.quantity,
          })),
        }),
      });

      if (!orderRes.ok) throw new Error("Order failed");
      cartStorage.clear();
      setShowCardModal(false);
      Alert.alert("Order placed!", "Your books are on their way!", [
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

  const addressFields = [
    { label: "Street", value: street, set: setStreet, icon: "home-outline" },
    { label: "City", value: city, set: setCity, icon: "business-outline" },
    {
      label: "State / Region",
      value: state,
      set: setState,
      icon: "map-outline",
    },
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
  ];

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.bg }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: theme.text }]}>Checkout</Text>

        <View
          style={[
            styles.section,
            { backgroundColor: theme.bg2, borderColor: theme.border },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="receipt-outline" size={14} color={theme.accent} />
            <Text style={[styles.sectionTitle, { color: theme.accent }]}>
              Order Summary
            </Text>
          </View>
          {items.map((item) => (
            <View key={item.bookId} style={styles.summaryRow}>
              <Text
                style={[styles.summaryTitle, { color: theme.text }]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text style={[styles.summaryQty, { color: theme.text2 }]}>
                ×{item.quantity}
              </Text>
              <Text style={[styles.summaryPrice, { color: theme.accent }]}>
                ${(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
          <View style={[styles.totalRow, { borderTopColor: theme.border }]}>
            <Text style={[styles.totalLabel, { color: theme.text2 }]}>
              Total
            </Text>
            <Text style={[styles.totalPrice, { color: theme.text }]}>
              ${total.toFixed(2)}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.section,
            { backgroundColor: theme.bg2, borderColor: theme.border },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={14} color={theme.accent} />
            <Text style={[styles.sectionTitle, { color: theme.accent }]}>
              Delivery Address
            </Text>
          </View>
          {addressFields.map(({ label, value, set, icon }) => (
            <View
              key={label}
              style={[
                styles.inputWrapper,
                { backgroundColor: theme.bg, borderColor: theme.border },
              ]}
            >
              <Ionicons
                name={icon as any}
                size={16}
                color={theme.text3}
                style={styles.inputIcon}
              />
              <TextInput
                placeholder={label}
                placeholderTextColor={theme.text3}
                value={value}
                onChangeText={set}
                style={[styles.input, { color: theme.text }]}
              />
            </View>
          ))}
        </View>

        <View
          style={[
            styles.section,
            { backgroundColor: theme.bg2, borderColor: theme.border },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="pricetag-outline" size={14} color={theme.accent} />
            <Text style={[styles.sectionTitle, { color: theme.accent }]}>
              Promo Code
            </Text>
          </View>
          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: theme.bg, borderColor: theme.border },
            ]}
          >
            <Ionicons
              name="gift-outline"
              size={16}
              color={theme.text3}
              style={styles.inputIcon}
            />
            <TextInput
              placeholder="Enter promo code (optional)"
              placeholderTextColor={theme.text3}
              value={promoCode}
              onChangeText={setPromoCode}
              style={[styles.input, { color: theme.text }]}
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
            style={[styles.orderBtn, { backgroundColor: theme.accent }]}
            onPress={handlePlaceOrder}
          >
            <Ionicons name="card-outline" size={22} color="white" />
            <Text style={styles.orderBtnText}>Place Order</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <CardModal
        visible={showCardModal}
        onClose={() => setShowCardModal(false)}
        onConfirm={handleCardConfirm}
        loading={loading}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  section: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 13, fontWeight: "600" },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  summaryTitle: { flex: 1, fontSize: 13 },
  summaryQty: { fontSize: 13 },
  summaryPrice: { fontSize: 13, fontWeight: "700" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: { fontSize: 15 },
  totalPrice: { fontSize: 20, fontWeight: "800" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, paddingVertical: 12 },
  row: { flexDirection: "row" },
  orderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 18,
    gap: 10,
    marginTop: 8,
  },
  orderBtnText: { color: "white", fontSize: 16, fontWeight: "700" },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderBottomWidth: 0,
    gap: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  sheetTitle: { fontSize: 22, fontWeight: "800" },
  sheetSubtitle: { fontSize: 13, marginBottom: 4 },
  cardPreview: {
    backgroundColor: "#3b1f6e",
    borderRadius: 20,
    padding: 20,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.2)",
  },
  cardPreviewTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  cardChip: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 2,
  },
  cardNumberPreview: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 3,
    marginBottom: 20,
  },
  cardPreviewBottom: { flexDirection: "row", justifyContent: "space-between" },
  cardLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 2,
  },
  cardValue: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 16,
    gap: 10,
    marginTop: 4,
  },
  confirmBtnText: { color: "white", fontSize: 16, fontWeight: "700" },
});
