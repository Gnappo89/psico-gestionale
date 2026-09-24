import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f1fd",
          100: "#e6e4fb",
          200: "#cec8f6",
          300: "#aea1ee",
          400: "#8b76e3",
          500: "#7052d6",
          600: "#5d3cc0",
          700: "#4c30a0",
          800: "#3f2982",
          900: "#352469",
        },
        coral: {
          50: "#fff1ed",
          100: "#ffe1d6",
          200: "#ffc2ad",
          300: "#ff9b79",
          400: "#ff7648",
          500: "#f9531f",
          600: "#e13b0f",
          700: "#ba2c0c",
          800: "#932510",
          900: "#762211",
        },
        mint: {
          50: "#eafcf5",
          100: "#cef8e6",
          200: "#a0efd1",
          300: "#65deb6",
          400: "#33c69a",
          500: "#15aa81",
          600: "#0b8968",
          700: "#0a6d55",
          800: "#0b5745",
          900: "#0a483a",
        },
        sunny: {
          50: "#fffaeb",
          100: "#fff0c6",
          200: "#ffdf88",
          300: "#ffc84a",
          400: "#ffb020",
          500: "#f99107",
          600: "#dd6c02",
          700: "#b74b06",
          800: "#943a0c",
          900: "#7a300d",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        soft: "0 8px 24px -8px rgba(53, 36, 105, 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
