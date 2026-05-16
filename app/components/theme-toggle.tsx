"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("tb-ai-theme", theme);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("tb-ai-theme");
    const next = saved === "light" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };

  return (
    <button
      type="button"
      className="app-icon-button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "切换到白天主题" : "切换到黑夜主题"}
      title={theme === "dark" ? "切换到白天主题" : "切换到黑夜主题"}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
