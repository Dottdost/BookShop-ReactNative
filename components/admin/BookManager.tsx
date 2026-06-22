import API_URL from "@/.expo/config/api";
import { useAuth } from "@/app/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Book = {
  id: string;
  title: string;
  author: string;
  price: number;
  stock: number;
  description?: string;
  genreId?: number;
  genreName?: string;
  publisherId?: number;
  publisherName?: string;
};

type BookFormState = {
  title: string;
  author: string;
  price: string;
  stock: string;
  description: string;
  genreId: string;
  publisherId: string;
};

function authH(token: string | null) {
  return {
    Authorization: `Bearer ${token ?? ""}`,
  };
}

function unwrapBooks(data: any): Book[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.$values)) return data.$values;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.$values)) return data.data.$values;
  if (Array.isArray(data?.data?.items)) return data.data.items;

  return [];
}

export default function BookManager() {
  const { theme } = useTheme();
  const { token: authToken } = useAuth();

  const token = useMemo(() => authToken, [authToken]);

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editBook, setEditBook] = useState<Book | null>(null);

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

  const [inputModal, setInputModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    value: string;
    type: "stock" | "price";
    bookId: string | null;
  }>({
    visible: false,
    title: "",
    message: "",
    value: "",
    type: "stock",
    bookId: null,
  });

  const [form, setForm] = useState<BookFormState>({
    title: "",
    author: "",
    price: "",
    stock: "",
    description: "",
    genreId: "",
    publisherId: "",
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

      const res = await fetch(`${API_URL}/api/books?page=1&pageSize=50`);
      const data = await res.json();

      if (!res.ok) {
        showMessage(
          "Error loading books",
          data?.message || `Status ${res.status}`,
          "error",
        );
        return;
      }

      setBooks(unwrapBooks(data));
    } catch (e: any) {
      showMessage("Error", e?.message || "Error loading books", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditBook(null);
    setForm({
      title: "",
      author: "",
      price: "",
      stock: "",
      description: "",
      genreId: "",
      publisherId: "",
    });
    setShowForm(true);
  };

  const openEdit = (book: Book) => {
    setEditBook(book);

    setForm({
      title: book.title || "",
      author: book.author || "",
      price: String(book.price ?? ""),
      stock: String(book.stock ?? ""),
      description: book.description || "",
      genreId: String(book.genreId ?? ""),
      publisherId: String(book.publisherId ?? ""),
    });

    setShowForm(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.author.trim() || !form.price.trim()) {
      showMessage("Error", "Fill required fields", "error");
      return;
    }

    try {
      const fd = new FormData();

      fd.append("Title", form.title.trim());
      fd.append("Author", form.author.trim());
      fd.append("Price", form.price.trim());
      fd.append("Stock", form.stock.trim() || "0");
      fd.append("Description", form.description.trim());

      if (form.genreId.trim()) {
        fd.append("GenreId", form.genreId.trim());
      }

      if (form.publisherId.trim()) {
        fd.append("PublisherId", form.publisherId.trim());
      }

      const url = editBook
        ? `${API_URL}/api/books/${encodeURIComponent(editBook.id)}`
        : `${API_URL}/api/books`;

      const res = await fetch(url, {
        method: editBook ? "PUT" : "POST",
        headers: authH(token),
        body: fd,
      });

      const text = await res.text();

      if (!res.ok) {
        showMessage("Save failed", text || `Status ${res.status}`, "error");
        return;
      }

      showMessage("Success", editBook ? "Book updated!" : "Book created!");
      setShowForm(false);
      await load();
    } catch (e: any) {
      showMessage("Error", e?.message || "Error saving book", "error");
    }
  };

  const deleteBook = (id: string) => {
    setConfirmModal({
      visible: true,
      title: "Delete book?",
      message:
        "Are you sure you want to delete this book? This action cannot be undone.",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, visible: false }));

        try {
          const res = await fetch(
            `${API_URL}/api/books/${encodeURIComponent(id)}`,
            {
              method: "DELETE",
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

          showMessage("Deleted", "Book deleted successfully!");
          await load();
        } catch (e: any) {
          showMessage("Error", e?.message || "Error deleting book", "error");
        }
      },
    });
  };

  const openStockModal = (id: string) => {
    setInputModal({
      visible: true,
      title: "Update stock",
      message: "Enter new stock value",
      value: "",
      type: "stock",
      bookId: id,
    });
  };

  const openPriceModal = (id: string) => {
    setInputModal({
      visible: true,
      title: "Update price",
      message: "Enter new price",
      value: "",
      type: "price",
      bookId: id,
    });
  };

  const submitInputModal = async () => {
    if (!inputModal.bookId) return;

    const value = inputModal.value.trim();

    if (!value) {
      showMessage("Error", "Value is required", "error");
      return;
    }

    if (inputModal.type === "stock") {
      const stock = Number.parseInt(value, 10);

      if (Number.isNaN(stock)) {
        showMessage("Error", "Stock must be a number", "error");
        return;
      }

      try {
        const res = await fetch(
          `${API_URL}/api/books/${encodeURIComponent(inputModal.bookId)}/stock`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...authH(token),
            },
            body: JSON.stringify({ stock }),
          },
        );

        const text = await res.text();

        if (!res.ok) {
          showMessage(
            "Stock update failed",
            text || `Status ${res.status}`,
            "error",
          );
          return;
        }

        setInputModal((prev) => ({ ...prev, visible: false }));
        showMessage("Success", "Stock updated");
        await load();
      } catch (e: any) {
        showMessage("Error", e?.message || "Error updating stock", "error");
      }
    }

    if (inputModal.type === "price") {
      const price = Number.parseFloat(value);

      if (Number.isNaN(price)) {
        showMessage("Error", "Price must be a number", "error");
        return;
      }

      try {
        const res = await fetch(
          `${API_URL}/api/books/${encodeURIComponent(inputModal.bookId)}/price`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...authH(token),
            },
            body: JSON.stringify({ price }),
          },
        );

        const text = await res.text();

        if (!res.ok) {
          showMessage(
            "Price update failed",
            text || `Status ${res.status}`,
            "error",
          );
          return;
        }

        setInputModal((prev) => ({ ...prev, visible: false }));
        showMessage("Success", "Price updated");
        await load();
      } catch (e: any) {
        showMessage("Error", e?.message || "Error updating price", "error");
      }
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={s.row}>
        <Text style={[s.title, { color: theme.text }]}>Books</Text>

        <TouchableOpacity
          style={[s.addBtn, { backgroundColor: theme.accent }]}
          onPress={openCreate}
        >
          <Ionicons name="add" size={18} color="white" />
          <Text style={s.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={books}
          keyExtractor={(item, index) => item.id || String(index)}
          contentContainerStyle={{ paddingBottom: 40 }}
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
              <View style={{ flex: 1 }}>
                <Text
                  style={[s.cardTitle, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>

                <Text style={[s.cardSub, { color: theme.text2 }]}>
                  {item.author} · ${item.price} · Stock: {item.stock}
                </Text>

                <Text style={[s.cardSub, { color: theme.text3 }]}>
                  {item.genreName || "No genre"}
                </Text>
              </View>

              <View style={s.actions}>
                <TouchableOpacity
                  style={[s.iconBtn, { backgroundColor: theme.accentBg }]}
                  onPress={() => openEdit(item)}
                >
                  <Ionicons
                    name="pencil-outline"
                    size={15}
                    color={theme.accent}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    s.iconBtn,
                    { backgroundColor: "rgba(245,158,11,0.12)" },
                  ]}
                  onPress={() => openStockModal(item.id)}
                >
                  <Ionicons name="layers-outline" size={15} color="#f59e0b" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    s.iconBtn,
                    { backgroundColor: "rgba(34,197,94,0.12)" },
                  ]}
                  onPress={() => openPriceModal(item.id)}
                >
                  <Ionicons name="pricetag-outline" size={15} color="#22c55e" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    s.iconBtn,
                    { backgroundColor: "rgba(248,113,113,0.12)" },
                  ]}
                  onPress={() => deleteBook(item.id)}
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
              {editBook ? "Edit Book" : "New Book"}
            </Text>

            {(
              [
                { key: "title", label: "Title *" },
                { key: "author", label: "Author *" },
                { key: "price", label: "Price *", kb: "numeric" },
                { key: "stock", label: "Stock", kb: "numeric" },
                { key: "description", label: "Description" },
                { key: "genreId", label: "Genre ID", kb: "numeric" },
                { key: "publisherId", label: "Publisher ID", kb: "numeric" },
              ] as {
                key: keyof BookFormState;
                label: string;
                kb?: "numeric";
              }[]
            ).map(({ key, label, kb }) => (
              <View
                key={key}
                style={[
                  s.input,
                  {
                    backgroundColor: theme.bg,
                    borderColor: theme.border,
                  },
                ]}
              >
                <TextInput
                  placeholder={label}
                  placeholderTextColor={theme.text3}
                  value={form[key]}
                  onChangeText={(value) =>
                    setForm((prev) => ({ ...prev, [key]: value }))
                  }
                  style={{
                    color: theme.text,
                    flex: 1,
                    paddingVertical: 10,
                  }}
                  keyboardType={kb || "default"}
                />
              </View>
            ))}

            <View style={s.btns}>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: theme.bg3 }]}
                onPress={() => setShowForm(false)}
              >
                <Text style={{ color: theme.text2 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.btn, { backgroundColor: theme.accent }]}
                onPress={save}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>Save</Text>
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

      <Modal visible={inputModal.visible} transparent animationType="fade">
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
            <View
              style={[
                s.confirmIcon,
                {
                  backgroundColor:
                    inputModal.type === "stock"
                      ? "rgba(245,158,11,0.12)"
                      : "rgba(34,197,94,0.12)",
                },
              ]}
            >
              <Ionicons
                name={
                  inputModal.type === "stock"
                    ? "layers-outline"
                    : "pricetag-outline"
                }
                size={28}
                color={inputModal.type === "stock" ? "#f59e0b" : "#22c55e"}
              />
            </View>

            <Text style={[s.confirmTitle, { color: theme.text }]}>
              {inputModal.title}
            </Text>

            <Text style={[s.confirmMessage, { color: theme.text2 }]}>
              {inputModal.message}
            </Text>

            <View
              style={[
                s.modalInput,
                {
                  backgroundColor: theme.bg,
                  borderColor: theme.border,
                },
              ]}
            >
              <TextInput
                value={inputModal.value}
                onChangeText={(value) =>
                  setInputModal((prev) => ({ ...prev, value }))
                }
                placeholder={
                  inputModal.type === "stock" ? "Example: 12" : "Example: 19.99"
                }
                placeholderTextColor={theme.text3}
                keyboardType="numeric"
                style={{
                  color: theme.text,
                  flex: 1,
                  paddingVertical: 12,
                }}
              />
            </View>

            <View style={s.btns}>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: theme.bg3 }]}
                onPress={() =>
                  setInputModal((prev) => ({ ...prev, visible: false }))
                }
              >
                <Text style={{ color: theme.text2, fontWeight: "600" }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.btn, { backgroundColor: theme.accent }]}
                onPress={submitInputModal}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>Save</Text>
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
              {
                backgroundColor: theme.bg2,
                borderColor: theme.border,
              },
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

  title: {
    fontSize: 18,
    fontWeight: "700",
  },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },

  addBtnText: {
    color: "white",
    fontWeight: "600",
    fontSize: 13,
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
    marginBottom: 2,
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

  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },

  input: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },

  btns: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },

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

  modalInput: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginTop: 10,
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
