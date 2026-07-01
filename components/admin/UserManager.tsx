import { useAuth } from "@/app/hooks/useAuth";
import PrettyAlert from "@/components/ui/PrettyAlert";
import { useTheme } from "@/context/ThemeContext";
import API_URL from "@/services/config/api";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import PaginationBar from "./PaginationBar";

const PAGE_SIZE = 10;

type ApiUser = {
  id?: string;
  userName?: string;
  username?: string;
  email?: string;
  role?: string;
  roleName?: string;
  roles?: { $values?: string[] } | string[] | string | null;
};

type User = {
  id?: string;
  userName: string;
  email: string;
  roles: string[];
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

function normalizeRoles(user: ApiUser): string[] {
  const roles = user.roles;

  if (Array.isArray(roles)) {
    return roles;
  }

  if (
    roles &&
    typeof roles === "object" &&
    Array.isArray((roles as { $values?: string[] }).$values)
  ) {
    return (roles as { $values: string[] }).$values;
  }

  if (typeof roles === "string" && roles.trim()) {
    return [roles];
  }

  if (typeof user.roleName === "string" && user.roleName.trim()) {
    return [user.roleName];
  }

  if (typeof user.role === "string" && user.role.trim()) {
    return [user.role];
  }

  return [];
}

function normalizeUsers(users: ApiUser[]): User[] {
  return users.map((u) => ({
    id: u.id,
    userName: u.userName || u.username || "—",
    email: u.email || "—",
    roles: normalizeRoles(u),
  }));
}

export default function UserManager() {
  const { theme } = useTheme();
  const { token: authToken, isSuperAdmin, loading: authLoading } = useAuth();

  const token = useMemo(() => getWebToken() || authToken || null, [authToken]);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [alert, setAlert] = useState({
    visible: false,
    title: "",
    message: "",
    type: "info" as "success" | "error" | "warning" | "info",
  });

  const [confirm, setConfirm] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "warning" | "error";
    confirmText: string;
    action: null | (() => void);
  }>({
    visible: false,
    title: "",
    message: "",
    type: "warning",
    confirmText: "Confirm",
    action: null,
  });

  const showMessage = (
    title: string,
    message: string,
    type: "success" | "error" | "warning" | "info" = "info",
  ) => {
    setAlert({
      visible: true,
      title,
      message,
      type,
    });
  };

  const closeAlert = () => {
    setAlert((prev) => ({
      ...prev,
      visible: false,
    }));
  };

  const askConfirm = (
    title: string,
    message: string,
    confirmText: string,
    action: () => void,
    type: "warning" | "error" = "warning",
  ) => {
    setConfirm({
      visible: true,
      title,
      message,
      type,
      confirmText,
      action,
    });
  };

  const closeConfirm = () => {
    setConfirm((prev) => ({
      ...prev,
      visible: false,
      action: null,
    }));
  };

  const runConfirm = () => {
    const action = confirm.action;

    closeConfirm();

    if (action) {
      action();
    }
  };

  const load = async (currentPage = page) => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!token) {
      setUsers([]);
      setTotalCount(0);
      setTotalPages(1);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        `${API_URL}/api/v1/Admin/get-all-users?page=${currentPage}&pageSize=${PAGE_SIZE}`,
        {
          method: "GET",
          headers: authH(token),
        },
      );

      const { text, data } = await readResponse(res);

      if (!res.ok) {
        showMessage(
          "Error loading users",
          cleanError(text, `Status ${res.status}`),
          "error",
        );
        return;
      }

      const paged = unwrapPaged<ApiUser>(data, currentPage, PAGE_SIZE);

      setUsers(normalizeUsers(paged.items));
      setPage(paged.page);
      setPageSize(paged.pageSize);
      setTotalPages(paged.totalPages);
      setTotalCount(paged.totalCount);
    } catch (e: any) {
      showMessage("Error", e?.message || "Error loading users", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(page);
  }, [token, page, authLoading]);

  const refreshAfterChange = async () => {
    if (users.length === 1 && page > 1) {
      setPage((prev) => prev - 1);
      return;
    }

    await load(page);
  };

  const deleteUser = (userName: string) => {
    askConfirm(
      "Delete user?",
      `Are you sure you want to delete "${userName}"? This action cannot be undone.`,
      "Delete",
      async () => {
        try {
          const res = await fetch(
            `${API_URL}/api/v1/Admin/delete-user-by-name/${encodeURIComponent(
              userName,
            )}`,
            {
              method: "DELETE",
              headers: authH(token),
            },
          );

          const { text } = await readResponse(res);

          if (!res.ok) {
            showMessage(
              "Delete failed",
              cleanError(text, `Status ${res.status}. Try logging in again.`),
              "error",
            );
            return;
          }

          showMessage("Success", "User deleted.", "success");
          await refreshAfterChange();
        } catch (e: any) {
          showMessage("Error", e?.message || "Error deleting user", "error");
        }
      },
      "error",
    );
  };

  const assignAdmin = (userName: string) => {
    askConfirm(
      "Assign admin role?",
      `Give "${userName}" Admin permissions?`,
      "Assign",
      async () => {
        try {
          const res = await fetch(
            `${API_URL}/api/v1/Admin/assign-admin-role-by-name/${encodeURIComponent(
              userName,
            )}`,
            {
              method: "POST",
              headers: authH(token),
            },
          );

          const { text } = await readResponse(res);

          if (!res.ok) {
            showMessage(
              "Assign admin failed",
              cleanError(text, `Status ${res.status}. Try logging in again.`),
              "error",
            );
            return;
          }

          showMessage("Success", `${userName} is now Admin.`, "success");
          await load(page);
        } catch (e: any) {
          showMessage(
            "Error",
            e?.message || "Error assigning admin role",
            "error",
          );
        }
      },
      "warning",
    );
  };

  const removeAdmin = (userName: string) => {
    askConfirm(
      "Remove admin role?",
      `Remove Admin permissions from "${userName}"?`,
      "Remove",
      async () => {
        try {
          const res = await fetch(
            `${API_URL}/api/v1/Admin/remove-admin-role-by-name/${encodeURIComponent(
              userName,
            )}`,
            {
              method: "POST",
              headers: authH(token),
            },
          );

          const { text } = await readResponse(res);

          if (!res.ok) {
            showMessage(
              "Remove admin failed",
              cleanError(text, `Status ${res.status}. Try logging in again.`),
              "error",
            );
            return;
          }

          showMessage("Success", "Admin role removed.", "success");
          await load(page);
        } catch (e: any) {
          showMessage(
            "Error",
            e?.message || "Error removing admin role",
            "error",
          );
        }
      },
      "warning",
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={s.row}>
        <Text style={[s.title, { color: theme.text }]}>Users</Text>

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
          <Ionicons name="lock-closed-outline" size={42} color={theme.text3} />

          <Text style={[s.emptyTitle, { color: theme.text }]}>
            Please sign in again
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={users}
            keyExtractor={(item, i) => item.id || item.userName || String(i)}
            contentContainerStyle={{ paddingBottom: 10 }}
            renderItem={({ item }) => {
              const roles = item.roles;
              const roleText = roles.length > 0 ? roles.join(", ") : "No roles";

              const hasAdmin = roles.includes("Admin");
              const hasSuperAdmin = roles.includes("SuperAdmin");
              const hasAnyAdminRole = hasAdmin || hasSuperAdmin;

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
                      {item.userName}
                    </Text>

                    <Text style={[s.cardSub, { color: theme.text2 }]}>
                      {item.email}
                    </Text>

                    <View
                      style={[
                        s.rolePill,
                        {
                          backgroundColor: hasAnyAdminRole
                            ? theme.accentBg
                            : theme.bg3,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: hasAnyAdminRole ? theme.accent : theme.text3,
                          fontSize: 11,
                          fontWeight: "700",
                        }}
                      >
                        {roleText}
                      </Text>
                    </View>
                  </View>

                  <View style={s.actions}>
                    {isSuperAdmin && !hasAdmin && !hasSuperAdmin && (
                      <TouchableOpacity
                        style={[s.iconBtn, { backgroundColor: theme.accentBg }]}
                        onPress={() => assignAdmin(item.userName)}
                      >
                        <Ionicons
                          name="shield-outline"
                          size={15}
                          color={theme.accent}
                        />
                      </TouchableOpacity>
                    )}

                    {isSuperAdmin && hasAdmin && !hasSuperAdmin && (
                      <TouchableOpacity
                        style={[
                          s.iconBtn,
                          { backgroundColor: "rgba(245,158,11,0.12)" },
                        ]}
                        onPress={() => removeAdmin(item.userName)}
                      >
                        <Ionicons
                          name="shield-off-outline"
                          size={15}
                          color="#f59e0b"
                        />
                      </TouchableOpacity>
                    )}

                    {!hasSuperAdmin && (
                      <TouchableOpacity
                        style={[
                          s.iconBtn,
                          { backgroundColor: "rgba(248,113,113,0.12)" },
                        ]}
                        onPress={() => deleteUser(item.userName)}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={15}
                          color="#f87171"
                        />
                      </TouchableOpacity>
                    )}
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

      <PrettyAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={closeAlert}
      />

      <PrettyAlert
        visible={confirm.visible}
        title={confirm.title}
        message={confirm.message}
        type={confirm.type}
        showCancel
        cancelText="Cancel"
        confirmText={confirm.confirmText}
        onClose={closeConfirm}
        onConfirm={runConfirm}
      />
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
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
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

  rolePill: {
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
});
