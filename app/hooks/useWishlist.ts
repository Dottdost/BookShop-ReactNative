import { Platform } from "react-native";

const storage = {
  get: (key: string): string | null => {
    if (Platform.OS === "web") return localStorage.getItem(key);
    return null;
  },
  set: (key: string, value: string) => {
    if (Platform.OS === "web") localStorage.setItem(key, value);
  },
};

export function useWishlist() {
  const getWishlist = (): string[] => {
    const raw = storage.get("wishlist");
    try {
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const isLiked = (bookId: string): boolean => {
    return getWishlist().includes(bookId);
  };

  const toggle = (bookId: string): boolean => {
    const list = getWishlist();
    const idx = list.indexOf(bookId);
    if (idx === -1) {
      list.push(bookId);
      storage.set("wishlist", JSON.stringify(list));
      return true;
    } else {
      list.splice(idx, 1);
      storage.set("wishlist", JSON.stringify(list));
      return false;
    }
  };

  const getAll = (): string[] => getWishlist();

  return { isLiked, toggle, getAll };
}
