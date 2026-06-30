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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Genre = {
  id: number;
  name: string;
  parentGenreId?: number | null;
  parentName?: string | null;
  subGenres: Genre[];
};

type FormState = {
  name: string;
  isSub: boolean;
  parentGenreId: number | null;
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

function unwrapArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.$values)) return data.$values;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.$values)) return data.data.$values;
  return [];
}

function getGenreId(item: any): number {
  return Number(item.id ?? item.Id);
}

function getGenreName(item: any): string {
  return item.name ?? item.genreName ?? item.GenreName ?? "Unnamed";
}

function getParentId(item: any): number | null {
  const value = item.parentGenreId ?? item.ParentGenreId;
  return value === undefined || value === null ? null : Number(value);
}

function normalizeGenres(data: any): Genre[] {
  const raw = unwrapArray(data);

  const flat: Genre[] = raw.map((item) => ({
    id: getGenreId(item),
    name: getGenreName(item),
    parentGenreId: getParentId(item),
    parentName: item.parentName ?? item.ParentName ?? null,
    subGenres: [],
  }));

  const byId = new Map<number, Genre>();
  flat.forEach((g) => byId.set(g.id, g));

  const parents: Genre[] = [];

  flat.forEach((g) => {
    if (g.parentGenreId && byId.has(g.parentGenreId)) {
      byId.get(g.parentGenreId)!.subGenres.push(g);
    } else {
      parents.push(g);
    }
  });

  return parents;
}

export default function GenreManager() {
  const { theme } = useTheme();
  const { token: authToken } = useAuth();

  const token = useMemo(() => getWebToken() || authToken || null, [authToken]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState<FormState>({
    name: "",
    parentGenreId: null,
    isSub: false,
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

      const res = await fetch(`${API_URL}/api/genres/all`);
      const data = await res.json();

      if (!res.ok) {
        showMessage(
          "Error loading genres",
          data?.message || `Status ${res.status}`,
          "error",
        );
        return;
      }

      setGenres(normalizeGenres(data));
    } catch (e: any) {
      showMessage("Error", e?.message || "Error loading genres", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm({
      name: "",
      parentGenreId: null,
      isSub: false,
    });
    setShowForm(true);
  };

  const selectedParent = genres.find((g) => g.id === form.parentGenreId);

  const create = async () => {
    const name = form.name.trim();

    if (!name) {
      showMessage("Error", "Enter genre name", "error");
      return;
    }

    if (form.isSub && !form.parentGenreId) {
      showMessage("Error", "Choose parent genre", "error");
      return;
    }

    try {
      const url = form.isSub
        ? `${API_URL}/api/genres/createSub`
        : `${API_URL}/api/genres/createParent`;

      const body = form.isSub
        ? { name, parentGenreId: form.parentGenreId }
        : { name };

      const res = await fetch(url, {
        method: "POST",
        headers: authH(token),
        body: JSON.stringify(body),
      });

      const text = await res.text();

      if (!res.ok) {
        showMessage("Create failed", text || `Status ${res.status}`, "error");
        return;
      }

      showMessage("Created", "Genre created successfully!");
      setShowForm(false);
      setForm({ name: "", parentGenreId: null, isSub: false });
      await load();
    } catch (e: any) {
      showMessage("Error", e?.message || "Error creating genre", "error");
    }
  };

  const delParent = (id: number, name: string) => {
    setConfirmModal({
      visible: true,
      title: "Delete genre?",
      message: `Delete "${name}"? If it has sub-genres, backend may reject it.`,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, visible: false }));

        try {
          const res = await fetch(`${API_URL}/api/genres/delete/${id}`, {
            method: "DELETE",
            headers: authH(token),
          });

          const text = await res.text();

          if (!res.ok) {
            showMessage(
              "Delete failed",
              text || `Status ${res.status}`,
              "error",
            );
            return;
          }

          showMessage("Deleted", "Genre deleted successfully!");
          await load();
        } catch (e: any) {
          showMessage("Error", e?.message || "Error deleting genre", "error");
        }
      },
    });
  };

  const delSub = (name: string) => {
    setConfirmModal({
      visible: true,
      title: "Delete sub-genre?",
      message: `Delete "${name}"?`,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, visible: false }));

        try {
          const res = await fetch(
            `${API_URL}/api/genres/deleteSub/${encodeURIComponent(name)}`,
            {
              method: "DELETE",
              headers: authH(token),
            },
          );

          const text = await res.text();

          if (!res.ok) {
            showMessage(
              "Delete sub-genre failed",
              text || `Status ${res.status}`,
              "error",
            );
            return;
          }

          showMessage("Deleted", "Sub-genre deleted successfully!");
          await load();
        } catch (e: any) {
          showMessage(
            "Error",
            e?.message || "Error deleting sub-genre",
            "error",
          );
        }
      },
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={s.row}>
        <Text style={[s.title, { color: theme.text }]}>Genres</Text>

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
          data={genres}
          keyExtractor={(item) => String(item.id)}
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
                  {item.name}
                </Text>

                <Text style={[s.cardSub, { color: theme.text3 }]}>
                  ID: {item.id}
                </Text>

                {item.subGenres.length > 0 && (
                  <View style={{ gap: 6, marginTop: 8 }}>
                    {item.subGenres.map((sg) => (
                      <View
                        key={sg.id}
                        style={[
                          s.subPill,
                          {
                            backgroundColor: theme.bg3,
                            borderColor: theme.border,
                          },
                        ]}
                      >
                        <Text style={{ color: theme.text2, fontSize: 12 }}>
                          {sg.name}
                        </Text>

                        <TouchableOpacity onPress={() => delSub(sg.name)}>
                          <Ionicons
                            name="close-outline"
                            size={16}
                            color="#f87171"
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[
                  s.iconBtn,
                  { backgroundColor: "rgba(248,113,113,0.12)" },
                ]}
                onPress={() => delParent(item.id, item.name)}
              >
                <Ionicons name="trash-outline" size={15} color="#f87171" />
              </TouchableOpacity>
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
            <Text style={[s.sheetTitle, { color: theme.text }]}>New Genre</Text>

            <View
              style={[
                s.input,
                { backgroundColor: theme.bg, borderColor: theme.border },
              ]}
            >
              <TextInput
                placeholder="Genre name"
                placeholderTextColor={theme.text3}
                value={form.name}
                onChangeText={(value) =>
                  setForm((prev) => ({ ...prev, name: value }))
                }
                style={{
                  color: theme.text,
                  flex: 1,
                  paddingVertical: 0,
                }}
              />
            </View>

            <TouchableOpacity
              style={[
                s.toggle,
                { backgroundColor: theme.accentBg, borderColor: theme.border },
              ]}
              onPress={() =>
                setForm((prev) => ({
                  ...prev,
                  isSub: !prev.isSub,
                  parentGenreId: !prev.isSub ? prev.parentGenreId : null,
                }))
              }
            >
              <Ionicons
                name={form.isSub ? "checkbox-outline" : "square-outline"}
                size={20}
                color={theme.accent}
              />

              <Text style={{ color: theme.text, marginLeft: 8 }}>
                This is a sub-genre
              </Text>
            </TouchableOpacity>

            {form.isSub && (
              <View style={{ gap: 8 }}>
                <Text style={{ color: theme.text2, fontSize: 13 }}>
                  Parent genre: {selectedParent?.name || "Choose below"}
                </Text>

                <ScrollView
                  style={{ maxHeight: 160 }}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {genres.map((genre) => (
                    <TouchableOpacity
                      key={genre.id}
                      style={[
                        s.parentOption,
                        {
                          backgroundColor:
                            form.parentGenreId === genre.id
                              ? theme.accentBg
                              : theme.bg,
                          borderColor:
                            form.parentGenreId === genre.id
                              ? theme.accent
                              : theme.border,
                        },
                      ]}
                      onPress={() =>
                        setForm((prev) => ({
                          ...prev,
                          parentGenreId: genre.id,
                        }))
                      }
                    >
                      <Text
                        style={{
                          color:
                            form.parentGenreId === genre.id
                              ? theme.accent
                              : theme.text,
                          fontWeight: "600",
                        }}
                      >
                        {genre.name}
                      </Text>

                      <Text style={{ color: theme.text3, fontSize: 11 }}>
                        ID: {genre.id}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

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
  cardSub: { fontSize: 12 },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  subPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
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
    paddingHorizontal: 14,
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  parentOption: { padding: 12, borderRadius: 12, borderWidth: 1 },
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
