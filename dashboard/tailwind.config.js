/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    fontFamily: {
      sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
    },
    extend: {
      colors: {
        foundation: "#F8FAFC",
        panel: "#FFFFFF",
        charcoal: "#1E293B",
        accent: {
          DEFAULT: "#4F46E5",
          hover: "#4338CA",
          light: "#EEF2FF",
        },
        border: "#E2E8F0",
      },
      transitionTimingFunction: {
        "ease-out-fast": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        120: "120ms",
      },
    },
  },
  plugins: [],
};
