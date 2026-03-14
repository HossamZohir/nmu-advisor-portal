/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#8B141E",
        "primary-light": "#C8293A",
        "primary-pale": "#FDF2F3",
        accent: "#C8A96E",
        surface: "#FFFFFF",
        "surface-2": "#F8F8F8",
        "surface-3": "#F0F0F0",
        border: "#E5E5E5",
        text: "#1A1A1A",
        "text-2": "#555555",
        muted: "#999999",
      },
      fontFamily: {
        display: ["'Plus Jakarta Sans'", "sans-serif"],
        body: ["'Plus Jakarta Sans'", "sans-serif"],
        arabic: ["'Cairo'", "sans-serif"],
      },
    },
  },
  plugins: [],
}