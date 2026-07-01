import { useAuth } from "@/app/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import API_URL from "@/services/config/api";
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
import PaginationBar from "./PaginationBar";

const PAGE_SIZE = 10;

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
  userAdressId?: string;
  userBankCardId?: string;
  orderItems?: { $values?: OrderItem[] } | OrderItem[];
};

type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  hasPrevious: boolean;
  hasNext: boolean;
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
  if (Array.isArray(data?.items?.$values)) return data.items.$values;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.items?.$values)) return data.data.items.$values;

  return [];
}

function unwrapPaged<T>(
  data: any,
  fallbackPage: number,
  fallbackPageSize: number,
): PagedResult<T> {
  const items = unwrapOrders(data) as T[];
  const totalCount = Number(data?.totalCount ?? items.length);
  const pageSize = Number(data?.pageSize ?? fallbackPageSize);
  const page = Number(data?.page ?? fallbackPage);
  const totalPages = Math.max(
    1,
    Number((data?.totalPages ?? Math.ceil(totalCount / pageSize)) || 1),
  );

  return {
    items,
    page,
    pageSize,
    totalPages,
    totalCount,
    hasPrevious: Boolean(data?.hasPrevious ?? page > 1),
    hasNext: Boolean(data?.hasNext ?? page < totalPages),
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

    return json.title || json.message || text;
  } catch {
    return text;
  }
}

function getStatusNumber(status: number | string | undefined): number {
  if (typeof status === "number") return status;

  if (typeof status === "string") {
    const normalized = status.trim().toLowerCase();

    const byLabel = Object.entries(STATUS_LABELS).find(
      ([, label]) => label.toLowerCase() === normalized,
    );

    if (byLabel) return Number(byLabel[0]);

    if (normalized === "cancelled") return 4;

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

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString();
}

export default function OrderManager() {
  const { theme } = useTheme();
  const { token: authToken, loading: authLoading } = useAuth();

  const token = useMemo(() => {
    return getWebToken() || authToken || null;
  }, [authToken]);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

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

  const load = async (currentPage = page) => {
    if (authLoading) {
      return;
    }

    try {
      setLoading(true);

      if (!token) {
        setOrders([]);
        setTotalCount(0);
        setTotalPages(1);
        return;
      }

      const res = await fetch(
        `${API_URL}/api/Order/get-all-orders?page=${currentPage}&pageSize=${PAGE_SIZE}`,
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
        setTotalCount(0);
        setTotalPages(1);
        return;
      }

      const paged = unwrapPaged<Order>(data, currentPage, PAGE_SIZE);

      setOrders(paged.items);
      setPage(paged.page);
      setPageSize(paged.pageSize);
      setTotalPages(paged.totalPages);
      setTotalCount(paged.totalCount);
    } catch (e: any) {
      showMessage("Error", e?.message || "Error loading orders", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    void load(page);
  }, [authLoading, token, page]);

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

  const refreshAfterDelete = async () => {
    if (orders.length === 1 && page > 1) {
      setPage((prev) => prev - 1);
      return;
    }

    await load(page);
  };

  const changeStatus = async (status: number) => {
    if (!statusModal.order?.id || !token) return;

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
      showMessage(
        "Success",
        `Order status changed to ${STATUS_LABELS[status]}.`,
      );
      await load(page);
    } catch (e: any) {
      showMessage("Error", e?.message || "Error updating status", "error");
    }
  };

  const deleteOrder = async () => {
    if (!deleteModal.order?.id || !token) return;

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
      await refreshAfterDelete();
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
              fontWeight: "700",
            }}
          >
            {totalCount}
          </Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: 20 }} />
      ) : !token ? (
        <View style={s.emptyBox}>
          <Ionicons name="lock-closed-outline" size={40} color={theme.text3} />

          <Text style={[s.emptyTitle, { color: theme.text }]}>
            Please sign in again
          </Text>

          <Text style={[s.emptyText, { color: theme.text3 }]}>
            Admin token was not found.
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={orders}
            keyExtractor={(item, index) => item.id || String(index)}
            contentContainerStyle={{ paddingBottom: 10 }}
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

                    <Text style={[s.cardSub, { color: theme.text3 }]}>
                      {formatDate(item.orderDate)}
                    </Text>

                    {!!item.promoCode && (
                      <Text style={[s.cardSub, { color: theme.text3 }]}>
                        Promo: {item.promoCode}
                      </Text>
                    )}

                    <View style={[s.pill, { backgroundColor: `${color}20` }]}>
                      <Text style={{ color, fontSize: 11, fontWeight: "700" }}>
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
                      <Ionicons
                        name="trash-outline"
                        size={15}
                        color="#f87171"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />

          <PaginationBar
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            loading={loading}
            accent={theme.accent}
            accentBg={theme.accentBg}
            bg={theme.bg}
            bg2={theme.bg2}
            border={theme.border}
            text={theme.text}
            text2={theme.text2}
            onPageChange={setPage}
          />
        </>
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
              Backend statuses: Pending, Paid, Shipped, Completed, Canceled
            </Text>

            <View style={{ width: "100%", gap: 8, marginTop: 8 }}>
              {Object.entries(STATUS_LABELS).map(([val, label]) => {
                const statusValue = Number(val);
                const color = STATUS_COLORS[statusValue];
                const current =
                  getStatusNumber(statusModal.order?.status) === statusValue;

                return (
                  <TouchableOpacity
                    key={val}
                    style={[
                      s.statusOption,
                      {
                        borderColor: current ? color : theme.border,
                        backgroundColor: current ? `${color}18` : theme.bg,
                      },
                    ]}
                    onPress={() => changeStatus(statusValue)}
                  >
                    <View style={[s.statusDot, { backgroundColor: color }]} />

                    <Text
                      style={{
                        flex: 1,
                        color: current ? color : theme.text,
                        fontWeight: current ? "800" : "700",
                      }}
                    >
                      {label}
                    </Text>

                    {current && (
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color={color}
                      />
                    )}
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
              <Ionicons name="trash-outline" size={28} color="#f87171" />
            </View>

            <Text style={[s.modalTitle, { color: theme.text }]}>
              Delete order?
            </Text>

            <Text style={[s.modalMessage, { color: theme.text2 }]}>
              Are you sure you want to delete this order?
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
                <Text style={{ color: "white", fontWeight: "800" }}>
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
              <Text style={{ color: "white", fontWeight: "800" }}>Okay</Text>
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
    fontWeight: "800",
  },

  badge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
  },

  emptyBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    padding: 24,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
  },

  emptyText: {
    fontSize: 13,
    textAlign: "center",
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
    fontWeight: "700",
    marginBottom: 2,
  },

  cardSub: {
    fontSize: 12,
    marginBottom: 4,
  },

  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
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
