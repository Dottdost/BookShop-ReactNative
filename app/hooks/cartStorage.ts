import { Platform } from "react-native";

export interface CartItem {
  bookId: string;
  title: string;
  author: string;
  imageUrl: string;
  price: number;
  quantity: number;
}

const cartStorage = {
  _key: (): string => {
    if (Platform.OS !== "web") return "cart_guest";
    const userId = localStorage.getItem("userId") || "guest";
    return `cart_${userId}`;
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
    if (Platform.OS === "web")
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
      list[idx].quantity = qty;
      cartStorage.set(list);
    }
  },
  clear: () => {
    if (Platform.OS === "web") localStorage.removeItem(cartStorage._key());
  },
  total: (): number =>
    cartStorage.get().reduce((s, i) => s + i.price * i.quantity, 0),
};

export default cartStorage;
