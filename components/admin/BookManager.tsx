import API_URL from "@/.expo/config/api";
import { useAuth } from "@/app/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import PaginationBar from "./PaginationBar";

const PAGE_SIZE = 10;

type Book = {
  id: string;
  title: string;
  author: string;
  price: number;
  stock: number;
  description?: string;
  imageUrl?: string;
  genreId?: string | number;
  genreName?: string;
  publisherId?: string | number;
  publisherName?: string;
};

type Option = {
  id: string | number;
  name: string;
};

type PickedImage = {
  uri: string;
  name: string;
  type: string;
  file?: File | Blob;
};

type BookFormState = {
  title: string;
  author: string;
  price: string;
  stock: string;
  description: string;
  genreId: string;
  publisherId: string;
  imageUri: string;
  imageFile: PickedImage | null;
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

function authH(token: string | null) {
  return {
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
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.items?.$values)) return data.data.items.$values;

  return [];
}

function unwrapPaged<T>(
  data: any,
  fallbackPage: number,
  fallbackPageSize: number,
): PagedResult<T> {
  const items = unwrapArray<T>(data);
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

function getImageName(uri: string) {
  const cleanUri = uri.split("?")[0];
  const name = cleanUri.split("/").pop();

  if (name && name.includes(".")) {
    return name;
  }

  return `book-cover-${Date.now()}.jpg`;
}

function getImageType(uri: string) {
  const cleanUri = uri.split("?")[0];
  const extension = cleanUri.split(".").pop()?.toLowerCase();

  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "heic") return "image/heic";
  if (extension === "heif") return "image/heif";

  return "image/jpeg";
}

function normalizeNumber(value: string) {
  return value.trim().replace(",", ".");
}

export default function BookManager() {
  const { theme } = useTheme();
  const { token: authToken } = useAuth();

  const token = useMemo(() => authToken, [authToken]);

  const [books, setBooks] = useState<Book[]>([]);
  const [genres, setGenres] = useState<Option[]>([]);
  const [publishers, setPublishers] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editBook, setEditBook] = useState<Book | null>(null);

  const [genreDropdownOpen, setGenreDropdownOpen] = useState(false);
  const [publisherDropdownOpen, setPublisherDropdownOpen] = useState(false);

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
    imageUri: "",
    imageFile: null,
  });

  const selectedGenre = genres.find(
    (genre) => String(genre.id) === String(form.genreId),
  );

  const selectedPublisher = publishers.find(
    (publisher) => String(publisher.id) === String(form.publisherId),
  );

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

  const loadBooks = async (currentPage = page) => {
    const res = await fetch(
      `${API_URL}/api/books?page=${currentPage}&pageSize=${PAGE_SIZE}`,
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.message || `Books status ${res.status}`);
    }

    const paged = unwrapPaged<Book>(data, currentPage, PAGE_SIZE);

    setBooks(paged.items);
    setPage(paged.page);
    setPageSize(paged.pageSize);
    setTotalPages(paged.totalPages);
    setTotalCount(paged.totalCount);
  };

  const loadGenres = async () => {
    const res = await fetch(`${API_URL}/api/genres/all`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.message || `Genres status ${res.status}`);
    }

    setGenres(unwrapArray<Option>(data));
  };

  const loadPublishers = async () => {
    const res = await fetch(`${API_URL}/api/v1/publishers`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.message || `Publishers status ${res.status}`);
    }

    setPublishers(unwrapArray<Option>(data));
  };

  const load = async (currentPage = page) => {
    try {
      setLoading(true);

      await Promise.all([
        loadBooks(currentPage),
        loadGenres(),
        loadPublishers(),
      ]);
    } catch (e: any) {
      showMessage("Error", e?.message || "Error loading data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(page);
  }, [page]);

  const resetForm = () => {
    setForm({
      title: "",
      author: "",
      price: "",
      stock: "",
      description: "",
      genreId: "",
      publisherId: "",
      imageUri: "",
      imageFile: null,
    });

    setGenreDropdownOpen(false);
    setPublisherDropdownOpen(false);
  };

  const openCreate = () => {
    setEditBook(null);
    resetForm();
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
      imageUri: book.imageUrl || "",
      imageFile: null,
    });

    setGenreDropdownOpen(false);
    setPublisherDropdownOpen(false);
    setShowForm(true);
  };

  const pickCoverImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      showMessage(
        "Permission needed",
        "Please allow gallery access to choose a book cover.",
        "error",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });

    if (result.canceled) return;

    const asset = result.assets[0] as ImagePicker.ImagePickerAsset & {
      file?: File;
    };

    const name =
      asset.fileName ||
      asset.file?.name ||
      getImageName(asset.uri) ||
      `book-cover-${Date.now()}.jpg`;

    const type =
      asset.mimeType ||
      asset.file?.type ||
      getImageType(asset.uri) ||
      "image/jpeg";

    setForm((prev) => ({
      ...prev,
      imageUri: asset.uri,
      imageFile: {
        uri: asset.uri,
        name,
        type,
        file: asset.file,
      },
    }));
  };

  const save = async () => {
    const price = normalizeNumber(form.price);
    const stock = form.stock.trim() || "0";
    const genreId = form.genreId.trim();
    const publisherId = form.publisherId.trim();

    if (!form.title.trim() || !form.author.trim() || !price) {
      showMessage("Error", "Fill title, author and price", "error");
      return;
    }

    if (Number.isNaN(Number(price))) {
      showMessage("Invalid price", "Price must be a number.", "error");
      return;
    }

    if (Number.isNaN(Number.parseInt(stock, 10))) {
      showMessage("Invalid stock", "Stock must be an integer.", "error");
      return;
    }

    if (!genreId) {
      showMessage("Genre required", "Please choose a genre.", "error");
      return;
    }

    if (!publisherId) {
      showMessage("Publisher required", "Please choose a publisher.", "error");
      return;
    }

    if (!editBook && !form.imageFile) {
      showMessage("Cover required", "Please choose a cover image.", "error");
      return;
    }

    try {
      const fd = new FormData();

      fd.append("Title", form.title.trim());
      fd.append("Author", form.author.trim());
      fd.append("Price", price);
      fd.append("Stock", String(Number.parseInt(stock, 10)));
      fd.append("Description", form.description.trim());
      fd.append("GenreId", String(Number.parseInt(genreId, 10)));
      fd.append("PublisherId", String(Number.parseInt(publisherId, 10)));

      if (form.imageFile) {
        if (Platform.OS === "web") {
          if (form.imageFile.file) {
            fd.append("Image", form.imageFile.file, form.imageFile.name);
          } else {
            const imageResponse = await fetch(form.imageFile.uri);
            const imageBlob = await imageResponse.blob();

            fd.append("Image", imageBlob, form.imageFile.name);
          }
        } else {
          fd.append("Image", {
            uri: form.imageFile.uri,
            name: form.imageFile.name,
            type: form.imageFile.type,
          } as any);
        }
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
      resetForm();
      await loadBooks(page);
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

          showMessage("Deleted", "Book deleted successfully!");

          if (books.length === 1 && page > 1) {
            setPage((prev) => prev - 1);
          } else {
            await loadBooks(page);
          }
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

    const value = normalizeNumber(inputModal.value);

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
        await loadBooks(page);
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
        await loadBooks(page);
      } catch (e: any) {
        showMessage("Error", e?.message || "Error updating price", "error");
      }
    }
  };

  const renderDropdown = ({
    title,
    value,
    selectedId,
    placeholder,
    options,
    opened,
    onToggle,
    onSelect,
  }: {
    title: string;
    value: string;
    selectedId: string;
    placeholder: string;
    options: Option[];
    opened: boolean;
    onToggle: () => void;
    onSelect: (id: string) => void;
  }) => {
    return (
      <View style={s.dropdownBlock}>
        <Text style={[s.dropdownLabel, { color: theme.text2 }]}>{title}</Text>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            s.selectBox,
            {
              backgroundColor: theme.bg,
              borderColor: opened ? theme.accent : theme.border,
            },
          ]}
          onPress={onToggle}
        >
          <Text
            style={[s.selectText, { color: value ? theme.text : theme.text3 }]}
          >
            {value || placeholder}
          </Text>

          <Ionicons
            name={opened ? "chevron-up-outline" : "chevron-down-outline"}
            size={18}
            color={theme.accent}
          />
        </TouchableOpacity>

        {opened && (
          <View
            style={[
              s.dropdownList,
              {
                backgroundColor: theme.bg,
                borderColor: theme.border,
              },
            ]}
          >
            <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }}>
              {options.length > 0 ? (
                options.map((option) => {
                  const active = String(option.id) === String(selectedId);

                  return (
                    <TouchableOpacity
                      key={String(option.id)}
                      style={[
                        s.dropdownItem,
                        {
                          backgroundColor: active
                            ? theme.accentBg
                            : "transparent",
                        },
                      ]}
                      onPress={() => onSelect(String(option.id))}
                    >
                      <Text
                        style={[
                          s.dropdownItemText,
                          {
                            color: active ? theme.accent : theme.text,
                          },
                        ]}
                      >
                        {option.name}
                      </Text>

                      {active && (
                        <Ionicons
                          name="checkmark-outline"
                          size={16}
                          color={theme.accent}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={[s.emptyDropdown, { color: theme.text3 }]}>
                  No options loaded
                </Text>
              )}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={s.row}>
        <Text style={[s.title, { color: theme.text }]}>Books</Text>

        <View style={s.headerRight}>
          <View style={[s.badge, { backgroundColor: theme.accentBg }]}>
            <Text style={[s.badgeText, { color: theme.accent }]}>
              {totalCount}
            </Text>
          </View>

          <TouchableOpacity
            style={[s.addBtn, { backgroundColor: theme.accent }]}
            onPress={openCreate}
          >
            <Ionicons name="add" size={18} color="white" />
            <Text style={s.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: 20 }} />
      ) : (
        <>
          <FlatList
            data={books}
            keyExtractor={(item, index) => item.id || String(index)}
            contentContainerStyle={{ paddingBottom: 10 }}
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
                <Image
                  source={{
                    uri:
                      item.imageUrl ||
                      "https://placehold.co/120x170/241633/d8b4fe?text=Book",
                  }}
                  style={s.coverThumb}
                />

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
                    {item.genreName || "No genre"} ·{" "}
                    {item.publisherName || "No publisher"}
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
                    <Ionicons
                      name="pricetag-outline"
                      size={15}
                      color="#22c55e"
                    />
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
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.sheetScroll}
              nestedScrollEnabled
            >
              <Text style={[s.sheetTitle, { color: theme.text }]}>
                {editBook ? "Edit Book" : "New Book"}
              </Text>

              <TouchableOpacity
                activeOpacity={0.88}
                style={[
                  s.coverPicker,
                  {
                    backgroundColor: theme.bg,
                    borderColor: theme.border,
                  },
                ]}
                onPress={pickCoverImage}
              >
                {form.imageUri ? (
                  <Image
                    source={{ uri: form.imageUri }}
                    style={s.coverPreview}
                  />
                ) : (
                  <View style={s.coverEmpty}>
                    <Ionicons
                      name="cloud-upload-outline"
                      size={34}
                      color={theme.accent}
                    />
                    <Text style={[s.coverTitle, { color: theme.text }]}>
                      Add book cover
                    </Text>
                    <Text style={[s.coverHint, { color: theme.text3 }]}>
                      Image will be sent as binary field: Image
                    </Text>
                  </View>
                )}

                <View style={[s.coverBadge, { backgroundColor: theme.accent }]}>
                  <Ionicons name="image-outline" size={16} color="white" />
                  <Text style={s.coverBadgeText}>
                    {form.imageFile ? "Change cover" : "Choose cover"}
                  </Text>
                </View>
              </TouchableOpacity>

              {(
                [
                  { key: "title", label: "Title *" },
                  { key: "author", label: "Author *" },
                  { key: "price", label: "Price *", kb: "numeric" },
                  { key: "stock", label: "Stock", kb: "numeric" },
                  { key: "description", label: "Description" },
                ] as {
                  key: keyof Omit<
                    BookFormState,
                    "imageUri" | "imageFile" | "genreId" | "publisherId"
                  >;
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
                    multiline={key === "description"}
                  />
                </View>
              ))}

              {renderDropdown({
                title: "Genre",
                value: selectedGenre?.name || "",
                selectedId: form.genreId,
                placeholder: "Choose genre",
                options: genres,
                opened: genreDropdownOpen,
                onToggle: () => {
                  setGenreDropdownOpen((prev) => !prev);
                  setPublisherDropdownOpen(false);
                },
                onSelect: (id) => {
                  setForm((prev) => ({ ...prev, genreId: id }));
                  setGenreDropdownOpen(false);
                },
              })}

              {renderDropdown({
                title: "Publisher",
                value: selectedPublisher?.name || "",
                selectedId: form.publisherId,
                placeholder: "Choose publisher",
                options: publishers,
                opened: publisherDropdownOpen,
                onToggle: () => {
                  setPublisherDropdownOpen((prev) => !prev);
                  setGenreDropdownOpen(false);
                },
                onSelect: (id) => {
                  setForm((prev) => ({ ...prev, publisherId: id }));
                  setPublisherDropdownOpen(false);
                },
              })}

              <View style={s.btns}>
                <TouchableOpacity
                  style={[s.btn, { backgroundColor: theme.bg3 }]}
                  onPress={() => setShowForm(false)}
                >
                  <Text style={{ color: theme.text2, fontWeight: "700" }}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.btn, { backgroundColor: theme.accent }]}
                  onPress={save}
                >
                  <Text style={{ color: "white", fontWeight: "800" }}>
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
                <Text style={{ color: theme.text2, fontWeight: "700" }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.btn, { backgroundColor: theme.accent }]}
                onPress={submitInputModal}
              >
                <Text style={{ color: "white", fontWeight: "800" }}>Save</Text>
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

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  badge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
  },

  badgeText: {
    fontSize: 13,
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
    fontWeight: "700",
    fontSize: 13,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },

  coverThumb: {
    width: 44,
    height: 62,
    borderRadius: 10,
    backgroundColor: "#241633",
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
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
    backgroundColor: "rgba(0,0,0,0.62)",
    justifyContent: "flex-end",
  },

  sheet: {
    maxHeight: "92%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 0,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: "hidden",
  },

  sheetScroll: {
    padding: 22,
    gap: 10,
  },

  sheetTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },

  coverPicker: {
    borderRadius: 22,
    borderWidth: 1,
    borderStyle: "dashed",
    overflow: "hidden",
    marginBottom: 4,
  },

  coverPreview: {
    width: "100%",
    height: 250,
    resizeMode: "cover",
  },

  coverEmpty: {
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    gap: 6,
  },

  coverTitle: {
    fontSize: 16,
    fontWeight: "800",
  },

  coverHint: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },

  coverBadge: {
    position: "absolute",
    right: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },

  coverBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "800",
  },

  input: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },

  dropdownBlock: {
    gap: 7,
  },

  dropdownLabel: {
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 14,
  },

  selectBox: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  selectText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },

  dropdownList: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 1,
  },

  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  dropdownItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },

  emptyDropdown: {
    padding: 14,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },

  btns: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },

  btn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
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
    borderRadius: 14,
    marginTop: 14,
  },
});
