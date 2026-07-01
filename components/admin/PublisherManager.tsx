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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Publisher = {
  id: number;
  name: string;
  address: string;
  phoneNumber: string;
};

type FormState = {
  name: string;
  address: string;
  phoneNumber: string;
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

function unwrapArray<T>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.$values)) return data.$values;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.$values)) return data.data.$values;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.items?.$values)) return data.items.$values;

  return [];
}

function normalizePublisher(item: any): Publisher {
  return {
    id: Number(item.id ?? item.Id ?? 0),
    name: String(item.name ?? item.Name ?? ""),
    address: String(item.address ?? item.Address ?? ""),
    phoneNumber: String(item.phoneNumber ?? item.PhoneNumber ?? ""),
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

export default function PublisherManager() {
  const { theme } = useTheme();
  const { token: authToken } = useAuth();

  const token = useMemo(() => getWebToken() || authToken || null, [authToken]);

  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editPublisher, setEditPublisher] = useState<Publisher | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    address: "",
    phoneNumber: "",
  });

  const [messageModal, setMessageModal] = useState({
    visible: false,
    title: "",
    message: "",
    type: "success" as "success" | "error",
  });

  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: null | (() => void);
  }>({
    visible: false,
    title: "",
    message: "",
    onConfirm: null,
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

  const loadPublishers = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/api/v1/publishers`);
      const data = await res.json();

      if (!res.ok) {
        showMessage(
          "Error loading publishers",
          data?.message || `Status ${res.status}`,
          "error",
        );
        return;
      }

      setPublishers(unwrapArray<any>(data).map(normalizePublisher));
    } catch (e: any) {
      showMessage("Error", e?.message || "Error loading publishers", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPublishers();
  }, []);

  const resetForm = () => {
    setForm({
      name: "",
      address: "",
      phoneNumber: "",
    });
  };

  const openCreate = () => {
    setEditPublisher(null);
    resetForm();
    setShowForm(true);
  };

  const openEdit = (publisher: Publisher) => {
    setEditPublisher(publisher);

    setForm({
      name: publisher.name,
      address: publisher.address,
      phoneNumber: publisher.phoneNumber,
    });

    setShowForm(true);
  };

  const savePublisher = async () => {
    const name = form.name.trim();
    const address = form.address.trim();
    const phoneNumber = form.phoneNumber.trim();

    if (!name) {
      showMessage("Error", "Publisher name is required.", "error");
      return;
    }

    if (!address) {
      showMessage("Error", "Publisher address is required.", "error");
      return;
    }

    if (!phoneNumber) {
      showMessage("Error", "Publisher phone number is required.", "error");
      return;
    }

    try {
      const url = editPublisher
        ? `${API_URL}/api/v1/publishers/${editPublisher.id}`
        : `${API_URL}/api/v1/publishers`;

      const res = await fetch(url, {
        method: editPublisher ? "PUT" : "POST",
        headers: authH(token),
        body: JSON.stringify({
          name,
          address,
          phoneNumber,
        }),
      });

      const { text, data } = await readResponse(res);

      if (!res.ok) {
        showMessage(
          "Save failed",
          data?.message || data?.title || text || `Status ${res.status}`,
          "error",
        );
        return;
      }

      showMessage(
        "Success",
        editPublisher ? "Publisher updated!" : "Publisher created!",
      );

      setShowForm(false);
      setEditPublisher(null);
      resetForm();
      await loadPublishers();
    } catch (e: any) {
      showMessage("Error", e?.message || "Error saving publisher", "error");
    }
  };

  const deletePublisher = (publisher: Publisher) => {
    setConfirmModal({
      visible: true,
      title: "Delete publisher?",
      message: `Are you sure you want to delete "${publisher.name}"?`,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, visible: false }));

        try {
          const res = await fetch(
            `${API_URL}/api/v1/publishers/${publisher.id}`,
            {
              method: "DELETE",
              headers: authH(token),
            },
          );

          const { text, data } = await readResponse(res);

          if (!res.ok) {
            showMessage(
              "Delete failed",
              data?.message || data?.title || text || `Status ${res.status}`,
              "error",
            );
            return;
          }

          showMessage("Deleted", "Publisher deleted successfully!");
          await loadPublishers();
        } catch (e: any) {
          showMessage(
            "Error",
            e?.message || "Error deleting publisher",
            "error",
          );
        }
      },
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={s.row}>
        <Text style={[s.title, { color: theme.text }]}>Publishers</Text>

        <TouchableOpacity
          style={[s.addBtn, { backgroundColor: theme.accent }]}
          onPress={openCreate}
        >
          <Ionicons name="add" size={18} color="white" />
          <Text style={s.addBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={publishers}
          keyExtractor={(item, index) => String(item.id || index)}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Ionicons name="business-outline" size={42} color={theme.text3} />

              <Text style={[s.emptyTitle, { color: theme.text }]}>
                No publishers yet
              </Text>

              <Text style={[s.emptyText, { color: theme.text3 }]}>
                Create a publisher to use it when adding books.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={[
                s.card,
                {
                  backgroundColor: theme.bg2,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={s.publisherIcon}>
                <Ionicons name="business-outline" size={22} color="#8b5cf6" />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={[s.cardTitle, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>

                <View style={s.infoRow}>
                  <Ionicons
                    name="location-outline"
                    size={13}
                    color={theme.text3}
                  />

                  <Text
                    style={[s.cardSub, { color: theme.text2 }]}
                    numberOfLines={1}
                  >
                    {item.address || "No address"}
                  </Text>
                </View>

                <View style={s.infoRow}>
                  <Ionicons name="call-outline" size={13} color={theme.text3} />

                  <Text
                    style={[s.cardSub, { color: theme.text2 }]}
                    numberOfLines={1}
                  >
                    {item.phoneNumber || "No phone number"}
                  </Text>
                </View>

                <Text style={[s.idText, { color: theme.text3 }]}>
                  ID: {item.id}
                </Text>
              </View>

              <View style={s.actions}>
                <TouchableOpacity
                  style={[
                    s.iconBtn,
                    { backgroundColor: "rgba(248,113,113,0.12)" },
                  ]}
                  onPress={() => deletePublisher(item)}
                >
                  <Ionicons name="trash-outline" size={15} color="#f87171" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={showForm} transparent animationType="slide">
        <View style={s.modalBg}>
          <View
            style={[
              s.sheet,
              {
                backgroundColor: theme.bg2,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[s.sheetTitle, { color: theme.text }]}>
              {editPublisher ? "Edit Publisher" : "New Publisher"}
            </Text>

            <Text style={[s.sheetSubtitle, { color: theme.text3 }]}>
              Publisher will appear in the book creation dropdown.
            </Text>

            <View
              style={[
                s.input,
                {
                  backgroundColor: theme.bg,
                  borderColor: theme.border,
                },
              ]}
            >
              <Ionicons
                name="business-outline"
                size={16}
                color={theme.text3}
                style={s.inputIcon}
              />

              <TextInput
                placeholder="Publisher name *"
                placeholderTextColor={theme.text3}
                value={form.name}
                onChangeText={(value) =>
                  setForm((prev) => ({ ...prev, name: value }))
                }
                style={[s.textInput, { color: theme.text }]}
              />
            </View>

            <View
              style={[
                s.input,
                {
                  backgroundColor: theme.bg,
                  borderColor: theme.border,
                },
              ]}
            >
              <Ionicons
                name="location-outline"
                size={16}
                color={theme.text3}
                style={s.inputIcon}
              />

              <TextInput
                placeholder="Address *"
                placeholderTextColor={theme.text3}
                value={form.address}
                onChangeText={(value) =>
                  setForm((prev) => ({ ...prev, address: value }))
                }
                style={[s.textInput, { color: theme.text }]}
              />
            </View>

            <View
              style={[
                s.input,
                {
                  backgroundColor: theme.bg,
                  borderColor: theme.border,
                },
              ]}
            >
              <Ionicons
                name="call-outline"
                size={16}
                color={theme.text3}
                style={s.inputIcon}
              />

              <TextInput
                placeholder="Phone number *"
                placeholderTextColor={theme.text3}
                value={form.phoneNumber}
                onChangeText={(value) =>
                  setForm((prev) => ({ ...prev, phoneNumber: value }))
                }
                style={[s.textInput, { color: theme.text }]}
                keyboardType="phone-pad"
              />
            </View>

            <View style={s.btns}>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: theme.bg3 }]}
                onPress={() => {
                  setShowForm(false);
                  setEditPublisher(null);
                  resetForm();
                }}
              >
                <Text style={{ color: theme.text2, fontWeight: "700" }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.btn, { backgroundColor: theme.accent }]}
                onPress={savePublisher}
              >
                <Text style={{ color: "white", fontWeight: "800" }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={confirmModal.visible} transparent animationType="fade">
        <View style={s.centerModalBg}>
          <View
            style={[
              s.confirmBox,
              {
                backgroundColor: theme.bg2,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={s.confirmIconDanger}>
              <Ionicons name="trash-outline" size={28} color="#f87171" />
            </View>

            <Text style={[s.confirmTitle, { color: theme.text }]}>
              {confirmModal.title}
            </Text>

            <Text style={[s.confirmMessage, { color: theme.text2 }]}>
              {confirmModal.message}
            </Text>

            <View style={s.btns}>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: theme.bg3 }]}
                onPress={() =>
                  setConfirmModal((prev) => ({ ...prev, visible: false }))
                }
              >
                <Text style={{ color: theme.text2, fontWeight: "700" }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.btn, { backgroundColor: "#ef4444" }]}
                onPress={() => confirmModal.onConfirm?.()}
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
              s.messageBox,
              {
                backgroundColor: theme.bg2,
                borderColor: theme.border,
              },
            ]}
          >
            <View
              style={[
                s.messageIcon,
                {
                  backgroundColor:
                    messageModal.type === "success"
                      ? "rgba(34,197,94,0.14)"
                      : "rgba(248,113,113,0.14)",
                },
              ]}
            >
              <Ionicons
                name={
                  messageModal.type === "success"
                    ? "checkmark-circle-outline"
                    : "alert-circle-outline"
                }
                size={30}
                color={messageModal.type === "success" ? "#22c55e" : "#f87171"}
              />
            </View>

            <Text style={[s.confirmTitle, { color: theme.text }]}>
              {messageModal.title}
            </Text>

            <Text style={[s.confirmMessage, { color: theme.text2 }]}>
              {messageModal.message}
            </Text>

            <TouchableOpacity
              style={[s.okBtn, { backgroundColor: theme.accent }]}
              onPress={() =>
                setMessageModal((prev) => ({ ...prev, visible: false }))
              }
            >
              <Text style={{ color: "white", fontWeight: "800" }}>OK</Text>
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
  },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
  },

  addBtnText: {
    color: "white",
    fontWeight: "800",
    fontSize: 13,
  },

  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  publisherIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(139,92,246,0.14)",
    justifyContent: "center",
    alignItems: "center",
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 5,
  },

  cardSub: {
    fontSize: 12,
    flex: 1,
  },

  idText: {
    fontSize: 11,
    marginTop: 4,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },

  actions: {
    gap: 8,
  },

  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
    gap: 8,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
  },

  emptyText: {
    fontSize: 13,
    textAlign: "center",
    maxWidth: 240,
    lineHeight: 19,
  },

  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },

  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    gap: 12,
  },

  sheetTitle: {
    fontSize: 22,
    fontWeight: "900",
  },

  sheetSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },

  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
  },

  inputIcon: {
    marginRight: 8,
  },

  textInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 12,
  },

  btns: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },

  btn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  centerModalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.62)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  confirmBox: {
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
  },

  messageBox: {
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
  },

  confirmIconDanger: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(248,113,113,0.14)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  messageIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  confirmTitle: {
    fontSize: 19,
    fontWeight: "900",
    textAlign: "center",
  },

  confirmMessage: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 8,
  },

  okBtn: {
    width: "100%",
    minHeight: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
});
