import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export interface CartItem {
  bookId: string;
  title: string;
  author: string;
  imageUrl: string;
  price: number;
  quantity: number;
}

function normalizeUserId(userId?: string | null) {
  return userId || "guest";
}

const cartStorage = {
  _key: (userId?: string | null): string => {
    if (Platform.OS === "web") {
      const webUserId = localStorage.getItem("userId") || "guest";
      return `cart_${webUserId}`;
    }

    return `cart_${normalizeUserId(userId)}`;
  },

  get: (): CartItem[] => {
    if (Platform.OS !== "web") return [];

    try {
      return JSON.parse(localStorage.getItem(cartStorage._key()) || "[]");
    } catch {
      return [];
    }
  },

  set: (items: CartItem[]) => {
    if (Platform.OS !== "web") return;

    localStorage.setItem(cartStorage._key(), JSON.stringify(items));
  },

  add: (item: Omit<CartItem, "quantity">) => {
    const list = cartStorage.get();
    const idx = list.findIndex((i) => i.bookId === item.bookId);

    if (idx === -1) {
      list.push({ ...item, quantity: 1 });
    } else {
      list[idx].quantity += 1;
    }

    cartStorage.set(list);
  },

  remove: (bookId: string) => {
    cartStorage.set(cartStorage.get().filter((i) => i.bookId !== bookId));
  },

  updateQty: (bookId: string, qty: number) => {
    const list = cartStorage.get();
    const idx = list.findIndex((i) => i.bookId === bookId);

    if (idx !== -1) {
      if (qty <= 0) {
        list.splice(idx, 1);
      } else {
        list[idx].quantity = qty;
      }

      cartStorage.set(list);
    }
  },

  clear: () => {
    if (Platform.OS === "web") {
      localStorage.removeItem(cartStorage._key());
    }
  },

  total: (): number => {
    return cartStorage.get().reduce((s, i) => s + i.price * i.quantity, 0);
  },

  getAsync: async (userId?: string | null): Promise<CartItem[]> => {
    const key = cartStorage._key(userId);

    if (Platform.OS === "web") {
      return cartStorage.get();
    }

    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  setAsync: async (items: CartItem[], userId?: string | null) => {
    const key = cartStorage._key(userId);

    if (Platform.OS === "web") {
      cartStorage.set(items);
      return;
    }

    await AsyncStorage.setItem(key, JSON.stringify(items));
  },

  addAsync: async (
    item: Omit<CartItem, "quantity">,
    userId?: string | null,
  ) => {
    const list = await cartStorage.getAsync(userId);
    const idx = list.findIndex((i) => i.bookId === item.bookId);

    if (idx === -1) {
      list.push({ ...item, quantity: 1 });
    } else {
      list[idx].quantity += 1;
    }

    await cartStorage.setAsync(list, userId);
  },

  removeAsync: async (bookId: string, userId?: string | null) => {
    const list = await cartStorage.getAsync(userId);
    await cartStorage.setAsync(
      list.filter((item) => item.bookId !== bookId),
      userId,
    );
  },

  updateQtyAsync: async (
    bookId: string,
    qty: number,
    userId?: string | null,
  ) => {
    const list = await cartStorage.getAsync(userId);
    const idx = list.findIndex((item) => item.bookId === bookId);

    if (idx !== -1) {
      if (qty <= 0) {
        list.splice(idx, 1);
      } else {
        list[idx].quantity = qty;
      }

      await cartStorage.setAsync(list, userId);
    }
  },

  clearAsync: async (userId?: string | null) => {
    const key = cartStorage._key(userId);

    if (Platform.OS === "web") {
      cartStorage.clear();
      return;
    }

    await AsyncStorage.removeItem(key);
  },

  totalAsync: async (userId?: string | null): Promise<number> => {
    const list = await cartStorage.getAsync(userId);
    return list.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },
};

export default cartStorage;
