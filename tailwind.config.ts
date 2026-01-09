import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        board: "#0f172a",
        surface: "#111827",
        "surface-2": "#1f2937",
        accent: "#38bdf8",
        "accent-2": "#a855f7"
      },
      boxShadow: {
        board: "0 20px 60px rgba(0,0,0,0.35)"
      }
    }
  },
  plugins: []
};

export default config;
