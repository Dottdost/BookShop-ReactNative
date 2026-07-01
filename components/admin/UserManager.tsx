import { useAuth } from "@/app/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import API_URL from "@/services/config/api";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

function showMessage(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n${message}`);
    return;
  }

  Alert.alert(title, message);
}

function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    const ok = window.confirm(`${title}\n${message}`);
    if (ok) onConfirm();
    return;
  }

  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    {
      text: "Delete",
      style: "destructive",
      onPress: onConfirm,
    },
  ]);
}

export default function UserManager() {
  const { theme } = useTheme();
  const { token: authToken, isSuperAdmin } = useAuth();

  const token = useMemo(() => getWebToken() || authToken || null, [authToken]);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const load = async (currentPage = page) => {
    try {
      setLoading(true);

      const res = await fetch(
        `${API_URL}/api/v1/Admin/get-all-users?page=${currentPage}&pageSize=${PAGE_SIZE}`,
        {
          method: "GET",
          headers: authH(token),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        showMessage(
          "Error loading users",
          data?.message || `Status ${res.status}`,
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
      showMessage("Error", e?.message || "Error loading users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(page);
  }, [token, page]);

  const refreshAfterChange = async () => {
    if (users.length === 1 && page > 1) {
      setPage((prev) => prev - 1);
      return;
    }

    await load(page);
  };

  const deleteUser = (userName: string) => {
    confirmAction("Delete User", `Delete ${userName}?`, async () => {
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

        const text = await res.text();

        if (!res.ok) {
          showMessage(
            "Delete failed",
            text || `Status ${res.status}. Try logging in again.`,
          );
          return;
        }

        showMessage("Success", "User deleted.");
        await refreshAfterChange();
      } catch (e: any) {
        showMessage("Error", e?.message || "Error deleting user");
      }
    });
  };

  const assignAdmin = async (userName: string) => {
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

      const text = await res.text();

      if (!res.ok) {
        showMessage(
          "Assign admin failed",
          text || `Status ${res.status}. Try logging in again.`,
        );
        return;
      }

      showMessage("Success", `${userName} is now Admin.`);
      await load(page);
    } catch (e: any) {
      showMessage("Error", e?.message || "Error assigning admin role");
    }
  };

  const removeAdmin = async (userName: string) => {
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

      const text = await res.text();

      if (!res.ok) {
        showMessage(
          "Remove admin failed",
          text || `Status ${res.status}. Try logging in again.`,
        );
        return;
      }

      showMessage("Success", "Admin role removed.");
      await load(page);
    } catch (e: any) {
      showMessage("Error", e?.message || "Error removing admin role");
    }
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
