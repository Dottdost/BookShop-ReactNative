import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { jwtDecode } from "jwt-decode";
import { useCallback, useState } from "react";
import { Platform } from "react-native";

type JwtPayload = {
  [key: string]: any;
};

type AuthState = {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  token: string | null;
  userId: string | null;
  roles: string[];
  loading: boolean;
};

function normalizeRoles(rawRoles: any): string[] {
  if (!rawRoles) return [];

  if (Array.isArray(rawRoles)) {
    return rawRoles.map(String);
  }

  if (typeof rawRoles === "string") {
    return [rawRoles];
  }

  return [];
}

function getRolesFromToken(token: string | null): string[] {
  if (!token) return [];

  try {
    const payload = jwtDecode<JwtPayload>(token);

    return normalizeRoles(
      payload?.[
        "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
      ] ??
        payload?.role ??
        payload?.roles,
    );
  } catch {
    return [];
  }
}

async function getStoredValue(key: string) {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }

  const secureValue = await SecureStore.getItemAsync(key);

  if (secureValue) return secureValue;

  return AsyncStorage.getItem(key);
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    isAdmin: false,
    isSuperAdmin: false,
    token: null,
    userId: null,
    roles: [],
    loading: true,
  });

  const loadAuth = useCallback(async () => {
    const token =
      (await getStoredValue("token")) || (await getStoredValue("accessToken"));
    const userId = await getStoredValue("userId");

    const roles = getRolesFromToken(token);

    setState({
      token,
      userId,
      roles,
      loading: false,

      isAdmin:
        roles.includes("Admin") ||
        roles.includes("AppAdmin") ||
        roles.includes("SuperAdmin"),

      isSuperAdmin: roles.includes("SuperAdmin"),
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadAuth();
    }, [loadAuth]),
  );

  return state;
}
