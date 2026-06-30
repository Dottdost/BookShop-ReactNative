import API_URL from "@/.expo/config/api";
import { useAuth } from "@/app/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import {
  listenOrderStatus,
  removeOrderStatusListener,
} from "@/services/signalr";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const PAGE_SIZE = 10;
const FALLBACK_REFRESH_MS = 5000;

const STATUS_LABELS: Record<number, string> = {
  0: "Pending",
  1: "Paid",
  2: "Shipped",
  3: "Completed",
  4: "Canceled",
};

const STATUS_COLORS: Record<number, string> = {
  0: "#f59e0b",
  1: "#22c55e",
  2: "#3b82f6",
  3: "#8b5cf6",
  4: "#ef4444",
};

type OrderItem = {
  bookId?: string;
  quantity?: number;
  unitPrice?: number;
};

type Order = {
  id?: string;
  originalPrice?: number;
  promoCode?: string | null;
  discountAmount?: number;
  finalPrice?: number;
  orderDate?: string;
  status?: string | number;
  userAddressId?: string;
  userAdressId?: string;
  userBankCardId?: string;
  orderItems?: OrderItem[] | { $values?: OrderItem[] };
};

type OrdersResponse = {
  page?: number;
  pageSize?: number;
  totalPages?: number;
  totalCount?: number;
  data?: Order[] | { $values?: Order[] };
  items?: Order[] | { $values?: Order[] };
  hasPrevious?: boolean;
  hasNext?: boolean;
  $values?: Order[];
};

function authH(token: string | null) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token ?? ""}`,
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

function unwrapArray<T>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.$values)) return data.$values;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.$values)) return data.data.$values;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.items?.$values)) return data.items.$values;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.items?.$values)) return data.data.items.$values;
  if (Array.isArray(data?.orderItems)) return data.orderItems;
  if (Array.isArray(data?.orderItems?.$values)) return data.orderItems.$values;

  return [];
}

function getOrderItems(order: Order): OrderItem[] {
  return unwrapArray<OrderItem>(order.orderItems);
}

function formatPrice(value?: number) {
  const amount = Number(value ?? 0);

  return `${amount.toFixed(2)} ₼`;
}

function formatDate(value?: string) {
  if (!value) return "Unknown date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusNumber(status?: string | number): number {
  if (typeof status === "number") return status;

  const raw = String(status ?? "")
    .trim()
    .toLowerCase();

  if (raw === "0" || raw.includes("pending")) return 0;
  if (raw === "1" || raw.includes("paid")) return 1;
  if (raw === "2" || raw.includes("shipped")) return 2;
  if (raw === "3" || raw.includes("completed")) return 3;
  if (raw === "4" || raw.includes("canceled") || raw.includes("cancelled")) {
    return 4;
  }

  const numeric = Number(raw);

  if (!Number.isNaN(numeric)) return numeric;

  return 0;
}

function getStatusText(status?: string | number) {
  const statusNumber = getStatusNumber(status);

  return STATUS_LABELS[statusNumber] ?? String(status ?? "Unknown");
}

function getStatusColor(status?: string | number) {
  const statusNumber = getStatusNumber(status);

  return STATUS_COLORS[statusNumber] ?? "#64748b";
}

function cleanError(text: string, fallback: string) {
  if (!text) return fallback;

  try {
    const json = JSON.parse(text);

    if (json.errors) {
      const messages = Object.values(json.errors).flat().join("\n");
      return messages || json.title || fallback;
    }

    return json.title || json.message || fallback;
  } catch {
    return text || fallback;
  }
}

function normalizeSignalROrderEvent(args: any[]) {
  const first = args[0];

  if (first && typeof first === "object") {
    return {
      orderId: String(
        first.orderId ??
          first.id ??
          first.OrderId ??
          first.Id ??
          first.orderID ??
          "",
      ),
      status:
        first.status ??
        first.Status ??
        first.newStatus ??
        first.NewStatus ??
        first.orderStatus ??
        first.OrderStatus ??
        null,
    };
  }

  return {
    orderId: String(args[0] ?? ""),
    status: args[1] ?? null,
  };
}

function mergeOrders(prev: Order[], next: Order[]) {
  const map = new Map<string, Order>();

  [...prev, ...next].forEach((order) => {
    if (order?.id) {
      map.set(String(order.id), order);
    }
  });

  return Array.from(map.values());
}

export default function OrdersScreen() {
  const { theme } = useTheme();
  const { token, userId } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [signalRConnected, setSignalRConnected] = useState(false);
  const [error, setError] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const refreshTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearRefreshTimers = () => {
    refreshTimers.current.forEach((timer) => clearTimeout(timer));
    refreshTimers.current = [];
  };

  const animate = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: false,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 450,
        useNativeDriver: false,
      }),
    ]).start();
  };

  async function loadOrders(nextPage = 1, append = false, silent = false) {
    if (!token || !userId) {
      setError("Please sign in again.");
      setLoading(false);
      return;
    }

    try {
      if (!silent) {
        if (append) setLoadingMore(true);
        else setLoading(true);
      }

      setError("");

      const res = await fetch(
        `${API_URL}/api/Order/user/${userId}?page=${nextPage}&pageSize=${PAGE_SIZE}`,
        {
          method: "GET",
          headers: authH(token),
        },
      );

      const { text, data } = await readResponse(res);

      if (!res.ok) {
        throw new Error(
          cleanError(text, `Failed to load orders. Status ${res.status}`),
        );
      }

      const response = data as OrdersResponse;
      const list = unwrapArray<Order>(response);

      setOrders((prev) => {
        if (!append) return list;

        return mergeOrders(prev, list);
      });

      setPage(Number(response?.page ?? nextPage));
      setHasNext(Boolean(response?.hasNext));
    } catch (e: any) {
      if (!silent) {
        setError(e?.message || "Failed to load orders.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }

  const silentRefreshWithDelay = useCallback(
    (delay: number) => {
      if (!token || !userId) return;

      const timer = setTimeout(() => {
        void loadOrders(1, false, true);
      }, delay);

      refreshTimers.current.push(timer);
    },
    [token, userId],
  );

  const refresh = async () => {
    setRefreshing(true);
    clearRefreshTimers();
    await loadOrders(1, false);
  };

  const loadMore = async () => {
    if (loadingMore || !hasNext) return;

    await loadOrders(page + 1, true);
  };

  useFocusEffect(
    useCallback(() => {
      animate();
      void loadOrders(1, false);

      const interval = setInterval(() => {
        void loadOrders(1, false, true);
      }, FALLBACK_REFRESH_MS);

      return () => {
        clearInterval(interval);
        clearRefreshTimers();
      };
    }, [token, userId]),
  );

  useEffect(() => {
    if (!token || !userId) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function connectOrdersSignalR() {
      try {
        await listenOrderStatus((...args: any[]) => {
          const event = normalizeSignalROrderEvent(args);

          console.log("ORDER SIGNALR RECEIVED:", event);

          if (event.orderId && event.status !== null) {
            setOrders((prev) =>
              prev.map((order) =>
                String(order.id) === event.orderId
                  ? {
                      ...order,
                      status: event.status,
                    }
                  : order,
              ),
            );
          }

          clearRefreshTimers();

          void loadOrders(1, false, true);
          silentRefreshWithDelay(1200);
          silentRefreshWithDelay(4000);
        });

        if (mounted) {
          setSignalRConnected(true);
        }
      } catch (e) {
        console.log("Order SignalR failed:", e);

        if (mounted) {
          setSignalRConnected(false);
        }
      }
    }

    void connectOrdersSignalR();

    return () => {
      mounted = false;
      clearRefreshTimers();
      removeOrderStatusListener();
    };
  }, [token, userId, silentRefreshWithDelay]);

  const renderOrder = ({ item }: { item: Order }) => {
    const statusText = getStatusText(item.status);
    const statusColor = getStatusColor(item.status);
    const items = getOrderItems(item);

    return (
      <View
        style={[
          styles.orderCard,
          {
            backgroundColor: theme.bg2,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.orderTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.orderTitle, { color: theme.text }]}>
              Order #{String(item.id ?? "").slice(0, 8)}
            </Text>

            <Text style={[styles.orderDate, { color: theme.text3 }]}>
              {formatDate(item.orderDate)}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: `${statusColor}22`,
                borderColor: `${statusColor}55`,
              },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusText}
            </Text>
          </View>
        </View>

        <View style={[styles.line, { backgroundColor: theme.border }]} />

        <View style={styles.priceRow}>
          <Text style={[styles.priceLabel, { color: theme.text3 }]}>
            Original price
          </Text>

          <Text style={[styles.priceValue, { color: theme.text }]}>
            {formatPrice(item.originalPrice)}
          </Text>
        </View>

        {!!item.discountAmount && Number(item.discountAmount) > 0 && (
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: theme.text3 }]}>
              Discount
            </Text>

            <Text style={[styles.priceValue, { color: "#22c55e" }]}>
              -{formatPrice(item.discountAmount)}
            </Text>
          </View>
        )}

        {!!item.promoCode && (
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: theme.text3 }]}>
              Promo code
            </Text>

            <Text style={[styles.priceValue, { color: theme.accent }]}>
              {item.promoCode}
            </Text>
          </View>
        )}

        <View style={styles.priceRow}>
          <Text style={[styles.totalLabel, { color: theme.text }]}>Total</Text>

          <Text style={[styles.totalValue, { color: theme.accent }]}>
            {formatPrice(item.finalPrice)}
          </Text>
        </View>

        <View style={[styles.itemsBox, { backgroundColor: theme.bg }]}>
          <Ionicons name="book-outline" size={17} color={theme.accent} />

          <Text style={[styles.itemsText, { color: theme.text2 }]}>
            {items.length} item{items.length === 1 ? "" : "s"}
          </Text>
        </View>
      </View>
    );
  };

  if (!token || !userId) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Ionicons name="lock-closed-outline" size={44} color={theme.accent} />

        <Text style={[styles.emptyTitle, { color: theme.text }]}>
          Sign in required
        </Text>

        <Text style={[styles.emptyText, { color: theme.text3 }]}>
          Please sign in to view your orders.
        </Text>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
          onPress={() => router.push("/sign-in")}
        >
          <Text style={styles.primaryBtnText}>Sign in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.bg,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.accentBg }]}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back-outline"
            size={22}
            color={theme.accent}
          />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]}>My Orders</Text>

          <Text style={[styles.subtitle, { color: theme.text3 }]}>
            {signalRConnected
              ? "Live updates + backup refresh"
              : "Backup refresh every few seconds"}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: theme.accentBg }]}
          onPress={refresh}
        >
          <Ionicons name="refresh-outline" size={20} color={theme.accent} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} />

          <Text style={{ color: theme.text3, marginTop: 10 }}>
            Loading your orders...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="warning-outline" size={42} color="#f87171" />

          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            Something went wrong
          </Text>

          <Text style={[styles.emptyText, { color: "#f87171" }]}>{error}</Text>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
            onPress={refresh}
          >
            <Text style={styles.primaryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item, index) => item.id || String(index)}
          renderItem={renderOrder}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={theme.accent}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.35}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="bag-outline" size={44} color={theme.accent} />

              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No orders yet
              </Text>

              <Text style={[styles.emptyText, { color: theme.text3 }]}>
                Your future book orders will appear here.
              </Text>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
                onPress={() => router.push("/books")}
              >
                <Text style={styles.primaryBtnText}>Browse books</Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator color={theme.accent} />
              </View>
            ) : null
          }
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },

  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  refreshBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 25,
    fontWeight: "900",
  },

  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },

  list: {
    paddingBottom: 40,
    gap: 14,
  },

  orderCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
  },

  orderTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  orderTitle: {
    fontSize: 16,
    fontWeight: "900",
  },

  orderDate: {
    fontSize: 12,
    marginTop: 4,
  },

  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },

  line: {
    height: 1,
    marginVertical: 14,
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
  },

  priceLabel: {
    fontSize: 13,
  },

  priceValue: {
    fontSize: 13,
    fontWeight: "700",
  },

  totalLabel: {
    fontSize: 15,
    fontWeight: "900",
  },

  totalValue: {
    fontSize: 17,
    fontWeight: "900",
  },

  itemsBox: {
    marginTop: 8,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  itemsText: {
    fontSize: 13,
    fontWeight: "700",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "900",
    marginTop: 12,
    textAlign: "center",
  },

  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 6,
  },

  primaryBtn: {
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
  },

  primaryBtnText: {
    color: "white",
    fontWeight: "800",
    fontSize: 14,
  },
});
