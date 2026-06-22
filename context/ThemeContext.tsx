import { createContext, useCallback, useContext, useState } from "react";

interface Theme {
  dark: boolean;
  bg: string;
  bg2: string;
  bg3: string;
  text: string;
  text2: string;
  text3: string;
  border: string;
  accent: string;
  accentBg: string;
  headerBg: string;
  drawerBg: string;
}

const dark: Theme = {
  dark: true,
  bg: "#0b0b10",
  bg2: "#13131f",
  bg3: "#1a1a25",
  text: "#ffffff",
  text2: "#888888",
  text3: "#555555",
  border: "rgba(139,92,246,0.2)",
  accent: "#8b5cf6",
  accentBg: "rgba(139,92,246,0.12)",
  headerBg: "#0b0b10",
  drawerBg: "#13131a",
};

const light: Theme = {
  dark: false,
  bg: "#f5f0e8",
  bg2: "#fffdf7",
  bg3: "#eee8d8",
  text: "#1a1208",
  text2: "#6b5e45",
  text3: "#a0917a",
  border: "rgba(124,58,237,0.15)",
  accent: "#7c3aed",
  accentBg: "rgba(124,58,237,0.08)",
  headerBg: "#fffdf7",
  drawerBg: "#f0e9d8",
};

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
}>({ theme: dark, toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const toggleTheme = useCallback(() => setIsDark((v) => !v), []);
  return (
    <ThemeContext.Provider
      value={{ theme: isDark ? dark : light, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
