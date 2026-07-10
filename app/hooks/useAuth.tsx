import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { jwtDecode } from "jwt-decode";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";

type JwtPayload = {
  [key: string]: unknown;
};

type AuthState = {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  token: string | null;
  userId: string | null;
  roles: string[];
  loading: boolean;
};

function normalizeRoles(rawRoles: unknown): string[] {
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

async function getStoredAuth() {
  const token =
    (await getStoredValue("token")) || (await getStoredValue("accessToken"));

  const userId = await getStoredValue("userId");
  const roles = getRolesFromToken(token);

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

function areStringArraysEqual(first: string[], second: string[]) {
  if (first.length !== second.length) return false;

  return first.every((item, index) => item === second[index]);
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

  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const loadAuth = useCallback(async () => {
    const auth = await getStoredAuth();
    const current = stateRef.current;

    const changed =
      current.loading ||
      current.token !== auth.token ||
      current.userId !== auth.userId ||
      current.isAdmin !== auth.isAdmin ||
      current.isSuperAdmin !== auth.isSuperAdmin ||
      !areStringArraysEqual(current.roles, auth.roles);

    if (!changed) return;

    setState({
      ...auth,
      loading: false,
    });
  }, []);

  useEffect(() => {
    void loadAuth();
  }, [loadAuth]);

  useFocusEffect(
    useCallback(() => {
      void loadAuth();
    }, [loadAuth]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") {
        void loadAuth();
      }
    });

    const interval = window.setInterval(() => {
      void loadAuth();
    }, 1200);

    return () => {
      subscription.remove();
      window.clearInterval(interval);
    };
  }, [loadAuth]);

  return state;
}

export default function UseAuthRoutePlaceholder() {
  return null;
}
