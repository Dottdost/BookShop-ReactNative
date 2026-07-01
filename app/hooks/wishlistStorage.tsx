import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

function normalizeUserId(userId?: string | null) {
  return userId || "guest";
}

const wishlistStorage = {
  _key: (userId?: string | null): string => {
    if (Platform.OS === "web") {
      const webUserId = localStorage.getItem("userId") || "guest";
      return `wishlist_${webUserId}`;
    }

    return `wishlist_${normalizeUserId(userId)}`;
  },

  get: (): string[] => {
    if (Platform.OS !== "web") return [];

    try {
      return JSON.parse(localStorage.getItem(wishlistStorage._key()) || "[]");
    } catch {
      return [];
    }
  },

  set: (items: string[]) => {
    if (Platform.OS !== "web") return;

    localStorage.setItem(wishlistStorage._key(), JSON.stringify(items));
  },

  toggle: (id: string): boolean => {
    const list = wishlistStorage.get();
    const idx = list.indexOf(id);

    if (idx === -1) {
      list.push(id);
    } else {
      list.splice(idx, 1);
    }

    wishlistStorage.set(list);
    return idx === -1;
  },

  remove: (id: string) => {
    wishlistStorage.set(wishlistStorage.get().filter((item) => item !== id));
  },

  isLiked: (id: string): boolean => {
    return wishlistStorage.get().includes(id);
  },

  clear: () => {
    wishlistStorage.set([]);
  },

  getAsync: async (userId?: string | null): Promise<string[]> => {
    const key = wishlistStorage._key(userId);

    if (Platform.OS === "web") {
      return wishlistStorage.get();
    }

    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  setAsync: async (items: string[], userId?: string | null) => {
    const key = wishlistStorage._key(userId);

    if (Platform.OS === "web") {
      wishlistStorage.set(items);
      return;
    }

    await AsyncStorage.setItem(key, JSON.stringify(items));
  },

  toggleAsync: async (id: string, userId?: string | null): Promise<boolean> => {
    const list = await wishlistStorage.getAsync(userId);
    const idx = list.indexOf(id);

    if (idx === -1) {
      list.push(id);
    } else {
      list.splice(idx, 1);
    }

    await wishlistStorage.setAsync(list, userId);

    return idx === -1;
  },

  removeAsync: async (id: string, userId?: string | null) => {
    const list = await wishlistStorage.getAsync(userId);
    await wishlistStorage.setAsync(
      list.filter((item) => item !== id),
      userId,
    );
  },

  isLikedAsync: async (
    id: string,
    userId?: string | null,
  ): Promise<boolean> => {
    const list = await wishlistStorage.getAsync(userId);
    return list.includes(id);
  },

  clearAsync: async (userId?: string | null) => {
    const key = wishlistStorage._key(userId);

    if (Platform.OS === "web") {
      wishlistStorage.clear();
      return;
    }

    await AsyncStorage.removeItem(key);
  },
};

export default wishlistStorage;
