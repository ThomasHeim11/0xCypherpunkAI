import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "neon-green": "#00ff94",
        "neon-blue": "#00d9ff",
        "neon-purple": "#bd00ff",
        "dark-900": "#0a0a0a",
        "dark-800": "#1a1a1a",
        "dark-700": "#2a2a2a",
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite alternate",
        "grid-move": "grid-move 20s linear infinite",
        "fade-in": "fade-in 0.6s ease-out",
        "slide-up": "slide-up 0.6s ease-out",
        glitch: "glitch 2s infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%": {
            boxShadow: "0 0 5px currentColor",
          },
          "100%": {
            boxShadow: "0 0 20px currentColor, 0 0 30px currentColor",
          },
        },
        "grid-move": {
          "0%": {
            backgroundPosition: "0 0",
          },
          "100%": {
            backgroundPosition: "50px 50px",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "slide-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(40px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        glitch: {
          "0%, 100%": { transform: "translate(0)" },
          "10%": { transform: "translate(-2px, 2px)" },
          "20%": { transform: "translate(2px, -2px)" },
          "30%": { transform: "translate(-2px, -2px)" },
          "40%": { transform: "translate(2px, 2px)" },
          "50%": { transform: "translate(-2px, 2px)" },
          "60%": { transform: "translate(2px, -2px)" },
          "70%": { transform: "translate(-2px, -2px)" },
          "80%": { transform: "translate(2px, 2px)" },
          "90%": { transform: "translate(-2px, 2px)" },
        },
      },
      boxShadow: {
        "neon-green": "0 0 10px #00ff94, 0 0 20px #00ff94",
        "neon-blue": "0 0 10px #00d9ff, 0 0 20px #00d9ff",
        "neon-purple": "0 0 10px #bd00ff, 0 0 20px #bd00ff",
        cyber: "0 4px 20px rgba(0, 255, 148, 0.1)",
      },
    },
  },
  plugins: [],
};

export default config;
