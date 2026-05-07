import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0a0f1c",
        panel: "#111827",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(148,163,184,.16), 0 24px 80px rgba(2,6,23,.45)",
      },
    },
  },
  plugins: [forms],
};

export default config;
