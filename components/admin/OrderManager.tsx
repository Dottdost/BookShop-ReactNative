import API_URL from "@/.expo/config/api";
import { useAuth } from "@/app/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const STATUS_LABELS: Record<number, string> = {
  0: "Pending",
  1: "Processing",
  2: "Shipped",
  3: "Delivered",
  4: "Cancelled",
};

const STATUS_COLORS: Record<number, string> = {
  0: "#f59e0b",
  1: "#8b5cf6",
  2: "#3b82f6",
  3: "#22c55e",
  4: "#f87171",
};

type OrderItem = {
  bookId?: string;
  quantity?: number;
  unitPrice?: number;
};

type Order = {
  id: string;
  originalPrice?: number;
  promoCode?: string;
  discountAmount?: number;
  finalPrice?: number;
  orderDate?: string;
  status?: number | string;
  userAddressId?: string;
  userBankCardId?: string;
  orderItems?: { $values?: OrderItem[] } | OrderItem[];
};

function getWebToken() {
  if (Platform.OS !== "web") return null;

  return (
    localStorage.getItem("accessToken") || localStorage.getItem("token") || null
  );
}

function authH(token: string | null) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token ?? ""}`,
  };
}

function unwrapOrders(data: any): Order[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.$values)) return data.$values;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.$values)) return data.data.$values;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data?.items)) return data.data.items;

  return [];
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

    return json.title || json.message || text;
  } catch {
    return text;
  }
}

function getStatusNumber(status: number | string | undefined): number {
  if (typeof status === "number") return status;

  if (typeof status === "string") {
    const byLabel = Object.entries(STATUS_LABELS).find(
      ([, label]) => label.toLowerCase() === status.toLowerCase(),
    );

    if (byLabel) return Number(byLabel[0]);

    const numeric = Number(status);
    if (!Number.isNaN(numeric)) return numeric;
  }

  return 0;
}

function getItemsCount(orderItems: any): number {
  if (Array.isArray(orderItems)) return orderItems.length;
  if (Array.isArray(orderItems?.$values)) return orderItems.$values.length;
  return 0;
}

function shortenId(id?: string): string {
  if (!id) return "—";
  return id.length > 8 ? id.slice(0, 8) : id;
}

export default function OrderManager() {
  const { theme } = useTheme();
  const { token: authToken } = useAuth();

  const token = useMemo(() => {
    return getWebToken() || authToken || null;
  }, [authToken]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [messageModal, setMessageModal] = useState({
    visible: false,
    title: "",
    message: "",
    type: "success" as "success" | "error",
  });

  const [statusModal, setStatusModal] = useState<{
    visible: boolean;
    order: Order | null;
  }>({
    visible: false,
    order: null,
  });

  const [deleteModal, setDeleteModal] = useState<{
    visible: boolean;
    order: Order | null;
  }>({
    visible: false,
    order: null,
  });

  const showMessage = (
    title: string,
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setMessageModal({
      visible: true,
      title,
      message,
      type,
    });
  };

  const load = async () => {
    try {
      setLoading(true);

      if (!token) {
        showMessage(
          "Unauthorized",
          "Token not found. Please log in again as SuperAdmin.",
          "error",
        );
        setOrders([]);
        return;
      }

      const res = await fetch(
        `${API_URL}/api/Order/get-all-orders?page=1&pageSize=50`,
        {
          method: "GET",
          headers: authH(token),
        },
      );

      const { text, data } = await readResponse(res);

      if (!res.ok) {
        showMessage(
          "Error loading orders",
          cleanError(text, `Status ${res.status}. Please log in again.`),
          "error",
        );
        setOrders([]);
        return;
      }

      setOrders(unwrapOrders(data));
    } catch (e: any) {
      showMessage("Error", e?.message || "Error loading orders", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const openStatusModal = (order: Order) => {
    setStatusModal({
      visible: true,
      order,
    });
  };

  const closeStatusModal = () => {
    setStatusModal({
      visible: false,
      order: null,
    });
  };

  const openDeleteModal = (order: Order) => {
    setDeleteModal({
      visible: true,
      order,
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      visible: false,
      order: null,
    });
  };

  const changeStatus = async (status: number) => {
    if (!statusModal.order?.id) return;

    try {
      const res = await fetch(
        `${API_URL}/api/Order/${encodeURIComponent(statusModal.order.id)}/status`,
        {
          method: "PATCH",
          headers: authH(token),
          body: JSON.stringify({ status }),
        },
      );

      const { text } = await readResponse(res);

      if (!res.ok) {
        showMessage(
          "Status update failed",
          cleanError(
            text,
            `Status ${res.status}. Backend rejected the request.`,
          ),
          "error",
        );
        return;
      }

      closeStatusModal();
      showMessage("Success", "Order status updated.");
      await load();
    } catch (e: any) {
      showMessage("Error", e?.message || "Error updating status", "error");
    }
  };

  const deleteOrder = async () => {
    if (!deleteModal.order?.id) return;

    try {
      const res = await fetch(
        `${API_URL}/api/Order/${encodeURIComponent(deleteModal.order.id)}`,
        {
          method: "DELETE",
          headers: authH(token),
        },
      );

      const { text } = await readResponse(res);

      if (!res.ok) {
        showMessage(
          "Delete failed",
          cleanError(
            text,
            `Status ${res.status}. Backend rejected the request.`,
          ),
          "error",
        );
        return;
      }

      closeDeleteModal();
      showMessage("Deleted", "Order deleted successfully.");
      await load();
    } catch (e: any) {
      showMessage("Error", e?.message || "Error deleting order", "error");
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={s.row}>
        <Text style={[s.title, { color: theme.text }]}>Orders</Text>

        <View style={[s.badge, { backgroundColor: theme.accentBg }]}>
          <Text
            style={{
              color: theme.accent,
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            {orders.length}
          </Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item, index) => item.id || String(index)}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => {
            const statusNum = getStatusNumber(item.status);
            const color = STATUS_COLORS[statusNum] || "#888";
            const itemsCount = getItemsCount(item.orderItems);

            return (
              <View
                style={[
                  s.card,
                  {
                    backgroundColor: theme.bg2,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.cardTitle, { color: theme.text }]}>
                    Order #{shortenId(item.id)}
                  </Text>

                  <Text style={[s.cardSub, { color: theme.text2 }]}>
                    ${item.finalPrice ?? 0} · {itemsCount} item
                    {itemsCount !== 1 ? "s" : ""}
                  </Text>

                  {!!item.promoCode && (
                    <Text style={[s.cardSub, { color: theme.text3 }]}>
                      Promo: {item.promoCode}
                    </Text>
                  )}

                  <View style={[s.pill, { backgroundColor: `${color}20` }]}>
                    <Text style={{ color, fontSize: 11 }}>
                      {STATUS_LABELS[statusNum] ?? String(item.status)}
                    </Text>
                  </View>
                </View>

                <View style={s.actions}>
                  <TouchableOpacity
                    style={[s.iconBtn, { backgroundColor: theme.accentBg }]}
                    onPress={() => openStatusModal(item)}
                  >
                    <Ionicons
                      name="swap-horizontal-outline"
                      size={15}
                      color={theme.accent}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      s.iconBtn,
                      { backgroundColor: "rgba(248,113,113,0.12)" },
                    ]}
                    onPress={() => openDeleteModal(item)}
                  >
                    <Ionicons name="trash-outline" size={15} color="#f87171" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      <Modal visible={statusModal.visible} transparent animationType="fade">
        <View style={s.centerModalBg}>
          <View
            style={[
              s.modalBox,
              {
                backgroundColor: theme.bg2,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={[s.modalIcon, { backgroundColor: theme.accentBg }]}>
              <Ionicons
                name="swap-horizontal-outline"
                size={28}
                color={theme.accent}
              />
            </View>

            <Text style={[s.modalTitle, { color: theme.text }]}>
              Change Status
            </Text>

            <Text style={[s.modalMessage, { color: theme.text2 }]}>
              Select new order status
            </Text>

            <View style={{ width: "100%", gap: 8, marginTop: 8 }}>
              {Object.entries(STATUS_LABELS).map(([val, label]) => {
                const statusValue = Number(val);
                const color = STATUS_COLORS[statusValue];

                return (
                  <TouchableOpacity
                    key={val}
                    style={[
                      s.statusOption,
                      {
                        backgroundColor: `${color}18`,
                        borderColor: `${color}55`,
                      },
                    ]}
                    onPress={() => changeStatus(statusValue)}
                  >
                    <View style={[s.statusDot, { backgroundColor: color }]} />

                    <Text style={{ color, fontWeight: "700" }}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[s.fullBtn, { backgroundColor: theme.bg3 }]}
              onPress={closeStatusModal}
            >
              <Text style={{ color: theme.text2, fontWeight: "700" }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={deleteModal.visible} transparent animationType="fade">
        <View style={s.centerModalBg}>
          <View
            style={[
              s.modalBox,
              {
                backgroundColor: theme.bg2,
                borderColor: theme.border,
              },
            ]}
          >
            <View
              style={[
                s.modalIcon,
                { backgroundColor: "rgba(248,113,113,0.12)" },
              ]}
            >
              <Ionicons name="trash-outline" size={30} color="#f87171" />
            </View>

            <Text style={[s.modalTitle, { color: theme.text }]}>
              Delete order?
            </Text>

            <Text style={[s.modalMessage, { color: theme.text2 }]}>
              Are you sure you want to delete Order #
              {shortenId(deleteModal.order?.id)}? This action cannot be undone.
            </Text>

            <View style={s.btns}>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: theme.bg3 }]}
                onPress={closeDeleteModal}
              >
                <Text style={{ color: theme.text2, fontWeight: "700" }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.btn, { backgroundColor: "#ef4444" }]}
                onPress={deleteOrder}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={messageModal.visible} transparent animationType="fade">
        <View style={s.centerModalBg}>
          <View
            style={[
              s.modalBox,
              {
                backgroundColor: theme.bg2,
                borderColor: theme.border,
              },
            ]}
          >
            <View
              style={[
                s.modalIcon,
                {
                  backgroundColor:
                    messageModal.type === "success"
                      ? "rgba(34,197,94,0.12)"
                      : "rgba(248,113,113,0.12)",
                },
              ]}
            >
              <Ionicons
                name={
                  messageModal.type === "success"
                    ? "checkmark-circle-outline"
                    : "warning-outline"
                }
                size={30}
                color={messageModal.type === "success" ? "#22c55e" : "#f87171"}
              />
            </View>

            <Text style={[s.modalTitle, { color: theme.text }]}>
              {messageModal.title}
            </Text>

            <Text style={[s.modalMessage, { color: theme.text2 }]}>
              {messageModal.message}
            </Text>

            <TouchableOpacity
              style={[s.fullBtn, { backgroundColor: theme.accent }]}
              onPress={() =>
                setMessageModal((prev) => ({ ...prev, visible: false }))
              }
            >
              <Text style={{ color: "white", fontWeight: "700" }}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    gap: 10,
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },

  cardSub: {
    fontSize: 12,
    marginBottom: 4,
  },

  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },

  actions: {
    flexDirection: "row",
    gap: 6,
  },

  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },

  centerModalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  modalBox: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    alignItems: "center",
  },

  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },

  modalMessage: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },

  statusOption: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },

  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },

  btns: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    width: "100%",
  },

  btn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },

  fullBtn: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 14,
  },
});
