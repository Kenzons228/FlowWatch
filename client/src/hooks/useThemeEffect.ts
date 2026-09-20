import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";

export function useThemeEffect() {
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;

    function apply(mode: "light" | "dark") {
      root.setAttribute("data-theme", mode);
    }

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      apply(mq.matches ? "dark" : "light");
      const listener = (e: MediaQueryListEvent) => apply(e.matches ? "dark" : "light");
      mq.addEventListener("change", listener);
      return () => mq.removeEventListener("change", listener);
    }

    apply(theme);
  }, [theme]);
}
