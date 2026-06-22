import API_URL from "@/.expo/config/api";
import { useAuth } from "@/app/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
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

function unwrapArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.$values)) return data.$values;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.$values)) return data.data.$values;

  return [];
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

function normalizeUsers(data: any): User[] {
  const apiUsers = unwrapArray(data);

  return apiUsers.map((u: ApiUser) => ({
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

  const load = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        `${API_URL}/api/v1/Admin/get-all-users?page=1&pageSize=50`,
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

      const normalizedUsers = normalizeUsers(data);
      setUsers(normalizedUsers);
    } catch (e: any) {
      showMessage("Error", e?.message || "Error loading users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

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
        await load();
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
      await load();
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
      await load();
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
              fontWeight: "600",
            }}
          >
            {users.length}
          </Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item, i) => item.id || item.userName || String(i)}
          contentContainerStyle={{ paddingBottom: 40 }}
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

  rolePill: {
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
});
