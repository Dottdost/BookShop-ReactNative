import { Platform } from "react-native";

function parseJwt(token: string) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export function useAuth() {
  if (Platform.OS !== "web") {
    return {
      isAdmin: false,
      isSuperAdmin: false,
      token: null,
      userId: null,
      roles: [],
    };
  }

  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");

  if (!token) {
    return {
      isAdmin: false,
      isSuperAdmin: false,
      token: null,
      userId: null,
      roles: [],
    };
  }

  const payload = parseJwt(token);

  const roles =
    payload?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ??
    [];

  return {
    token,
    userId,
    roles,

    isAdmin:
      roles.includes("Admin") ||
      roles.includes("AppAdmin") ||
      roles.includes("SuperAdmin"),

    isSuperAdmin: roles.includes("SuperAdmin"),
  };
}
