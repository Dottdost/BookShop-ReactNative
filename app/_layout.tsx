import { ThemeProvider } from "@/context/ThemeContext";
import { initI18n } from "@/i18n";
import { Slot } from "expo-router";
import { useEffect, useState } from "react";

export default function RootLayout() {
  const [isI18nReady, setIsI18nReady] = useState(false);

  useEffect(() => {
    initI18n().finally(() => setIsI18nReady(true));
  }, []);

  if (!isI18nReady) {
    return null;
  }

  return (
    <ThemeProvider>
      <Slot />
    </ThemeProvider>
  );
}
