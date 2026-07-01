import { useAuth } from "@/app/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import API_URL from "@/services/config/api";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import cartStorage, { CartItem } from "../hooks/cartStorage";

type CardForm = {
  cardNumber: string;
  cardHolderName: string;
  expirationDate: string;
  expirationRaw: string;
  cvv: string;
};

function authH(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function readResponse(res: Response) {
  const text = await res.text();

  if (!text) {
    return {
      text: "",
      data: null,
    };
  }

  try {
    return {
      text,
      data: JSON.parse(text),
    };
  } catch {
    return {
      text,
      data: null,
    };
  }
}

function cleanError(text: string, fallback: string) {
  if (!text) return fallback;

  try {
    const json = JSON.parse(text);

    if (json.errors) {
      const messages = Object.values(json.errors).flat().join("\n");
      return messages || json.title || fallback;
    }

    return json.title || json.message || text || fallback;
  } catch {
    return text || fallback;
  }
}

function getEntityId(data: any) {
  return String(
    data?.id ??
      data?.Id ??
      data?.addressId ??
      data?.adressId ??
      data?.cardId ??
      data?.bankCardId ??
      data?.userAddressId ??
      data?.userAdressId ??
      data?.userBankCardId ??
      "",
  );
}

function formatPrice(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function CardModal({
  visible,
  onClose,
  onConfirm,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (card: CardForm) => void;
  loading: boolean;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();

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
    const clean = val.replace(/\D/g, "").slice(0, 4);
    return clean.length >= 3 ? `${clean.slice(0, 2)}/${clean.slice(2)}` : clean;
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
    const cleanNumber = cardNumber.replace(/\s/g, "");
    const cleanCvv = cvv.replace(/\D/g, "");
    const [month, shortYear] = expDate.split("/");

    if (!cleanNumber || !cardHolderName.trim() || !expDate || !cleanCvv) {
      Alert.alert(t("common.error"), t("checkoutScreen.fillCard"));
      return;
    }

    if (cleanNumber.length !== 16) {
      Alert.alert(t("common.error"), "Card number must contain 16 digits.");
      return;
    }

    if (!month || !shortYear || shortYear.length !== 2) {
      Alert.alert(t("common.error"), "Expiration date must be MM/YY.");
      return;
    }

    const monthNumber = Number(month);

    if (Number.isNaN(monthNumber) || monthNumber < 1 || monthNumber > 12) {
      Alert.alert(t("common.error"), "Expiration month is invalid.");
      return;
    }

    if (cleanCvv.length !== 3) {
      Alert.alert(t("common.error"), "CVV must contain 3 digits.");
      return;
    }

    const fullYear = `20${shortYear}`;
    const expirationDate = `${fullYear}-${month.padStart(2, "0")}-01`;

    onConfirm({
      cardNumber: cleanNumber,
      cardHolderName: cardHolderName.trim().toUpperCase(),
      expirationDate,
      expirationRaw: expDate,
      cvv: cleanCvv,
    });
  };

  const cardFields = [
    {
      icon: "card-outline",
      placeholder: t("checkoutScreen.cardNumber"),
      value: cardNumber,
      set: (v: string) => setCardNumber(formatCardNumber(v)),
      keyboard: "numeric",
      maxLen: 19,
    },
    {
      icon: "person-outline",
      placeholder: t("checkoutScreen.cardHolderName"),
      value: cardHolderName,
      set: (v: string) => setCardHolderName(v.toUpperCase()),
      keyboard: "default",
      maxLen: 50,
    },
  ];

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
          {t("checkoutScreen.paymentDetails")}
        </Text>

        <Text style={[styles.sheetSubtitle, { color: theme.text3 }]}>
          {t("checkoutScreen.paymentSubtitle")}
        </Text>

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
              <Text style={styles.cardLabel}>
                {t("checkoutScreen.cardHolder")}
              </Text>

              <Text style={styles.cardValue}>
                {cardHolderName || t("checkoutScreen.yourName")}
              </Text>
            </View>

            <View>
              <Text style={styles.cardLabel}>
                {t("checkoutScreen.expires")}
              </Text>

              <Text style={styles.cardValue}>{expDate || "MM/YY"}</Text>
            </View>
          </View>
        </View>

        {cardFields.map(
          ({ icon, placeholder, value, set, keyboard, maxLen }) => (
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
          ),
        )}

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
              {
                flex: 1,
                backgroundColor: theme.bg,
                borderColor: theme.border,
              },
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
              onChangeText={(v) => setCvv(v.replace(/\D/g, "").slice(0, 3))}
              style={[styles.input, { color: theme.text }]}
              keyboardType="numeric"
              secureTextEntry
              maxLength={3}
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
            {loading
              ? t("checkoutScreen.processing")
              : t("checkoutScreen.confirmAndPay")}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

export default function Checkout() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { token, userId, loading: authLoading } = useAuth();

  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [promoCode, setPromoCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingCart, setLoadingCart] = useState(true);
  const [showCardModal, setShowCardModal] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const btnScale = useRef(new Animated.Value(1)).current;

  const loadCart = async () => {
    if (!userId) {
      setCartItems([]);
      setLoadingCart(false);
      return;
    }

    setLoadingCart(true);

    const list = await cartStorage.getAsync(userId);

    setCartItems(list);
    setLoadingCart(false);
  };

  useFocusEffect(
    useCallback(() => {
      void loadCart();
    }, [userId]),
  );

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

  const getToken = () => token || null;
  const getUserId = () => userId || null;

  const handlePlaceOrder = () => {
    if (!token || !userId) {
      Alert.alert(t("common.error"), t("checkoutScreen.notLoggedIn"));
      router.push("/sign-in");
      return;
    }

    if (!cartItems.length) {
      Alert.alert(t("common.error"), "Cart is empty.");
      return;
    }

    if (
      !street.trim() ||
      !city.trim() ||
      !country.trim() ||
      !postalCode.trim()
    ) {
      Alert.alert(t("common.error"), t("checkoutScreen.fillAddress"));
      return;
    }

    pressAnim();
    setShowCardModal(true);
  };

  async function createAddress(tokenValue: string, currentUserId: string) {
    const payload = {
      userId: currentUserId,
      street: street.trim(),
      city: city.trim(),
      state: state.trim(),
      postalCode: postalCode.trim(),
      country: country.trim(),
    };

    const res = await fetch(`${API_URL}/api/Adress`, {
      method: "POST",
      headers: authH(tokenValue),
      body: JSON.stringify(payload),
    });

    const { text, data } = await readResponse(res);

    if (!res.ok) {
      throw new Error(cleanError(text, `Address failed. Status ${res.status}`));
    }

    const id = getEntityId(data);

    if (!id) {
      throw new Error("Address was created, but id was not returned.");
    }

    return id;
  }

  async function createCard(
    tokenValue: string,
    currentUserId: string,
    card: CardForm,
  ) {
    const payload = {
      cardNumber: card.cardNumber,
      cardHolderName: card.cardHolderName,
      expirationDate: card.expirationDate,
      cvv: card.cvv,
      userId: currentUserId,
    };

    const res = await fetch(`${API_URL}/api/Card`, {
      method: "POST",
      headers: authH(tokenValue),
      body: JSON.stringify(payload),
    });

    const { text, data } = await readResponse(res);

    if (!res.ok) {
      throw new Error(cleanError(text, `Card failed. Status ${res.status}`));
    }

    const id = getEntityId(data);

    if (!id) {
      throw new Error("Card was created, but id was not returned.");
    }

    return id;
  }

  function getOrderItems() {
    const orderItems = cartItems.map((item) => {
      const bookId = item.bookId;
      const quantity = Number(item.quantity ?? 1);

      return {
        bookId,
        quantity,
      };
    });

    const invalid = orderItems.find(
      (item) => !item.bookId || !item.quantity || item.quantity < 1,
    );

    if (invalid) {
      console.log("INVALID CART ITEMS:", cartItems);
      throw new Error("Cart item has no bookId or quantity.");
    }

    return orderItems;
  }

  async function createOrder(
    tokenValue: string,
    currentUserId: string,
    addressId: string,
    cardId: string,
  ) {
    const cleanPromo = promoCode.trim();

    const payload = {
      userId: currentUserId,
      userAddressId: addressId,
      userBankCardId: cardId,
      promoCode: cleanPromo || null,
      orderItems: getOrderItems(),
    };

    const res = await fetch(`${API_URL}/api/Order`, {
      method: "POST",
      headers: authH(tokenValue),
      body: JSON.stringify(payload),
    });

    const { text, data } = await readResponse(res);

    if (!res.ok) {
      throw new Error(cleanError(text, `Order failed. Status ${res.status}`));
    }

    return data;
  }

  const handleCardConfirm = async (card: CardForm) => {
    setLoading(true);

    try {
      const currentUserId = getUserId();
      const tokenValue = getToken();

      if (!currentUserId || !tokenValue) {
        Alert.alert(t("common.error"), t("checkoutScreen.notLoggedIn"));
        return;
      }

      const addressId = await createAddress(tokenValue, currentUserId);
      const cardId = await createCard(tokenValue, currentUserId, card);

      await createOrder(tokenValue, currentUserId, addressId, cardId);

      await cartStorage.clearAsync(currentUserId);
      await loadCart();

      setShowCardModal(false);

      Alert.alert(
        t("checkoutScreen.orderPlaced"),
        t("checkoutScreen.orderSuccess"),
        [
          {
            text: t("checkoutScreen.ok"),
            onPress: () => router.replace("/orders"),
          },
        ],
      );
    } catch (e: any) {
      Alert.alert(
        t("common.error"),
        e?.message || t("common.somethingWentWrong"),
      );
    } finally {
      setLoading(false);
    }
  };

  const items = cartItems;

  const total = items.reduce(
    (sum, item) => sum + Number(item.price ?? 0) * Number(item.quantity ?? 1),
    0,
  );

  const addressFields = [
    {
      label: t("checkoutScreen.street"),
      value: street,
      set: setStreet,
      icon: "home-outline",
    },
    {
      label: t("checkoutScreen.city"),
      value: city,
      set: setCity,
      icon: "business-outline",
    },
    {
      label: t("checkoutScreen.state"),
      value: state,
      set: setState,
      icon: "map-outline",
    },
    {
      label: t("checkoutScreen.postalCode"),
      value: postalCode,
      set: setPostalCode,
      icon: "mail-outline",
    },
    {
      label: t("checkoutScreen.country"),
      value: country,
      set: setCountry,
      icon: "globe-outline",
    },
  ];

  if (authLoading || loadingCart) {
    return (
      <View style={[styles.loaderRoot, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.bg }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: theme.text }]}>
          {t("checkoutScreen.title")}
        </Text>

        <View
          style={[
            styles.section,
            { backgroundColor: theme.bg2, borderColor: theme.border },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="receipt-outline" size={14} color={theme.accent} />

            <Text style={[styles.sectionTitle, { color: theme.accent }]}>
              {t("checkoutScreen.orderSummary")}
            </Text>
          </View>

          {items.length === 0 ? (
            <Text style={{ color: theme.text3 }}>Cart is empty.</Text>
          ) : (
            items.map((item, index) => (
              <View key={item.bookId ?? index} style={styles.summaryRow}>
                <Text
                  style={[styles.summaryTitle, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {item.title ?? "Book"}
                </Text>

                <Text style={[styles.summaryQty, { color: theme.text2 }]}>
                  ×{item.quantity ?? 1}
                </Text>

                <Text style={[styles.summaryPrice, { color: theme.accent }]}>
                  {formatPrice(
                    Number(item.price ?? 0) * Number(item.quantity ?? 1),
                  )}
                </Text>
              </View>
            ))
          )}

          <View style={[styles.totalRow, { borderTopColor: theme.border }]}>
            <Text style={[styles.totalLabel, { color: theme.text2 }]}>
              {t("common.total")}
            </Text>

            <Text style={[styles.totalPrice, { color: theme.text }]}>
              {formatPrice(total)}
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
              {t("checkoutScreen.deliveryAddress")}
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
              {t("checkoutScreen.promoCode")}
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
              placeholder={t("checkoutScreen.enterPromoCode")}
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
            style={[
              styles.orderBtn,
              {
                backgroundColor: loading ? theme.bg3 : theme.accent,
              },
            ]}
            onPress={handlePlaceOrder}
            disabled={loading}
          >
            <Ionicons name="card-outline" size={22} color="white" />

            <Text style={styles.orderBtnText}>
              {loading
                ? t("checkoutScreen.processing")
                : t("checkoutScreen.placeOrder")}
            </Text>
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
  loaderRoot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  container: {
    flex: 1,
  },

  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    paddingHorizontal: 14,
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

  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
  },

  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  summaryTitle: {
    flex: 1,
    fontSize: 13,
  },

  summaryQty: {
    fontSize: 13,
  },

  summaryPrice: {
    fontSize: 13,
    fontWeight: "700",
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
  },

  totalLabel: {
    fontSize: 15,
  },

  totalPrice: {
    fontSize: 20,
    fontWeight: "800",
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 56,
    paddingHorizontal: 14,
  },

  inputIcon: {
    marginRight: 8,
  },

  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 12,
  },

  row: {
    flexDirection: "row",
  },

  orderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 18,
    gap: 10,
    marginTop: 8,
  },

  orderBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },

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

  sheetTitle: {
    fontSize: 22,
    fontWeight: "800",
  },

  sheetSubtitle: {
    fontSize: 13,
    marginBottom: 4,
  },

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

  cardPreviewBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

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

  confirmBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});
