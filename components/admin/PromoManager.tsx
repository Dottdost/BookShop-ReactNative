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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Promo = {
  id?: string | number;
  code: string;
  discount: number;
  expiryDate: string;
  isActive: boolean;
};

type PromoForm = {
  code: string;
  discount: string;
  expiryDate: string;
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

function unwrapPromos(data: any): Promo[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.$values)) return data.$values;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.$values)) return data.data.$values;
  return [];
}

export default function PromoManager() {
  const { theme } = useTheme();
  const { token: authToken } = useAuth();

  const token = useMemo(() => getWebToken() || authToken || null, [authToken]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState<PromoForm>({
    code: "",
    discount: "",
    expiryDate: "",
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
    setMessageModal({ visible: true, title, message, type });
  };

  const load = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/api/v1/PromoCode/get-all`, {
        headers: authH(token),
      });

      const data = await res.json();

      if (!res.ok) {
        showMessage(
          "Error loading promo codes",
          data?.message || `Status ${res.status}`,
          "error",
        );
        return;
      }

      setPromos(unwrapPromos(data));
    } catch (e: any) {
      showMessage("Error", e?.message || "Error loading promo codes", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const openCreate = () => {
    setForm({ code: "", discount: "", expiryDate: "" });
    setShowForm(true);
  };

  const create = async () => {
    const code = form.code.trim().toUpperCase();
    const discount = Number.parseFloat(form.discount);
    const expiryDate = form.expiryDate.trim();

    if (!code || !form.discount.trim() || !expiryDate) {
      showMessage("Error", "Fill all fields", "error");
      return;
    }

    if (Number.isNaN(discount)) {
      showMessage("Error", "Discount must be a number", "error");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
      showMessage("Error", "Date format must be YYYY-MM-DD", "error");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/v1/PromoCode/Create`, {
        method: "POST",
        headers: authH(token),
        body: JSON.stringify({
          code,
          discount,
          expiryDate: new Date(`${expiryDate}T23:59:59`).toISOString(),
        }),
      });

      const text = await res.text();

      if (!res.ok) {
        showMessage("Create failed", text || `Status ${res.status}`, "error");
        return;
      }

      showMessage("Created", "Promo code created successfully!");
      setShowForm(false);
      setForm({ code: "", discount: "", expiryDate: "" });
      await load();
    } catch (e: any) {
      showMessage("Error", e?.message || "Error creating promo code", "error");
    }
  };

  const toggle = async (code: string, isActive: boolean) => {
    try {
      const action = isActive ? "Deactivate" : "Activate";

      const res = await fetch(
        `${API_URL}/api/v1/PromoCode/${action}?code=${encodeURIComponent(code)}`,
        {
          method: "POST",
          headers: authH(token),
        },
      );

      const text = await res.text();

      if (!res.ok) {
        showMessage("Action failed", text || `Status ${res.status}`, "error");
        return;
      }

      showMessage(
        "Success",
        isActive ? "Promo code deactivated" : "Promo code activated",
      );

      await load();
    } catch (e: any) {
      showMessage("Error", e?.message || "Error updating promo code", "error");
    }
  };

  const del = (code: string) => {
    setConfirmModal({
      visible: true,
      title: "Delete promo code?",
      message: `Are you sure you want to delete "${code}"?`,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, visible: false }));

        try {
          const res = await fetch(
            `${API_URL}/api/v1/PromoCode/Delete?code=${encodeURIComponent(code)}`,
            {
              method: "DELETE",
              headers: authH(token),
            },
          );

          const text = await res.text();

          if (!res.ok) {
            showMessage(
              "Delete failed",
              text || `Status ${res.status}`,
              "error",
            );
            return;
          }

          showMessage("Deleted", "Promo code deleted successfully!");
          await load();
        } catch (e: any) {
          showMessage(
            "Error",
            e?.message || "Error deleting promo code",
            "error",
          );
        }
      },
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={s.row}>
        <Text style={[s.title, { color: theme.text }]}>Promo Codes</Text>

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
          data={promos}
          keyExtractor={(item, index) => String(item.id ?? item.code ?? index)}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => (
            <View
              style={[
                s.card,
                { backgroundColor: theme.bg2, borderColor: theme.border },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[s.cardTitle, { color: theme.text }]}>
                  {item.code}
                </Text>

                <Text style={[s.cardSub, { color: theme.text2 }]}>
                  {item.discount}% · Expires{" "}
                  {item.expiryDate
                    ? new Date(item.expiryDate).toLocaleDateString()
                    : "—"}
                </Text>

                <View
                  style={[
                    s.pill,
                    {
                      backgroundColor: item.isActive
                        ? "rgba(34,197,94,0.12)"
                        : "rgba(248,113,113,0.12)",
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: item.isActive ? "#22c55e" : "#f87171",
                      fontSize: 11,
                    }}
                  >
                    {item.isActive ? "Active" : "Inactive"}
                  </Text>
                </View>
              </View>

              <View style={s.actions}>
                <TouchableOpacity
                  style={[
                    s.iconBtn,
                    {
                      backgroundColor: item.isActive
                        ? "rgba(248,113,113,0.12)"
                        : "rgba(34,197,94,0.12)",
                    },
                  ]}
                  onPress={() => toggle(item.code, item.isActive)}
                >
                  <Ionicons
                    name={item.isActive ? "pause-outline" : "play-outline"}
                    size={15}
                    color={item.isActive ? "#f87171" : "#22c55e"}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    s.iconBtn,
                    { backgroundColor: "rgba(248,113,113,0.12)" },
                  ]}
                  onPress={() => del(item.code)}
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
              { backgroundColor: theme.bg2, borderColor: theme.border },
            ]}
          >
            <Text style={[s.sheetTitle, { color: theme.text }]}>
              New Promo Code
            </Text>

            {(
              [
                { key: "code", label: "Code (e.g. SAVE20)" },
                { key: "discount", label: "Discount %", kb: "numeric" },
                { key: "expiryDate", label: "Expiry Date (YYYY-MM-DD)" },
              ] as {
                key: keyof PromoForm;
                label: string;
                kb?: "numeric";
              }[]
            ).map(({ key, label, kb }) => (
              <View
                key={key}
                style={[
                  s.input,
                  { backgroundColor: theme.bg, borderColor: theme.border },
                ]}
              >
                <TextInput
                  placeholder={label}
                  placeholderTextColor={theme.text3}
                  value={form[key]}
                  onChangeText={(value) =>
                    setForm((prev) => ({ ...prev, [key]: value }))
                  }
                  style={{ color: theme.text, flex: 1, paddingVertical: 10 }}
                  keyboardType={kb || "default"}
                  autoCapitalize={key === "code" ? "characters" : "none"}
                />
              </View>
            ))}

            <View style={s.btns}>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: theme.bg3 }]}
                onPress={() => setShowForm(false)}
              >
                <Text style={{ color: theme.text2, fontWeight: "600" }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.btn, { backgroundColor: theme.accent }]}
                onPress={create}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>
                  Create
                </Text>
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
              { backgroundColor: theme.bg2, borderColor: theme.border },
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
                <Text style={{ color: theme.text2, fontWeight: "600" }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.btn, { backgroundColor: "#ef4444" }]}
                onPress={() => confirmModal.onConfirm?.()}
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
              s.confirmBox,
              { backgroundColor: theme.bg2, borderColor: theme.border },
            ]}
          >
            <View
              style={[
                s.confirmIcon,
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

            <Text style={[s.confirmTitle, { color: theme.text }]}>
              {messageModal.title}
            </Text>

            <Text style={[s.confirmMessage, { color: theme.text2 }]}>
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
  title: { fontSize: 18, fontWeight: "700" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addBtnText: { color: "white", fontWeight: "600", fontSize: 13 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    gap: 10,
  },
  cardTitle: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  cardSub: { fontSize: 12, marginBottom: 4 },
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  actions: { flexDirection: "row", gap: 6 },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    gap: 10,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  input: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  btns: { flexDirection: "row", gap: 10, marginTop: 10 },
  btn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
  centerModalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  confirmBox: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    alignItems: "center",
  },
  confirmIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  confirmIconDanger: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(248,113,113,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
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
