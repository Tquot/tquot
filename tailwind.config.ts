/**
 * TQuot visual foundation — reference config.
 *
 * The live theme lives in `app/globals.css` (@theme) because this repo uses
 * Tailwind CSS v4. Keep this file aligned with the foundation spec for docs
 * and tooling that still expect a JS config shape.
 */
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#1B2436", 2: "#2A3447" },
        paper: { DEFAULT: "#FFFFFF", 2: "#FAF8F4", 3: "#F2EFE7" },
        umber: { DEFAULT: "#B85C38", 2: "#9F4D2E" },
        text: { DEFAULT: "#0F1419", 2: "#5B5F66", 3: "#9A9C9E" },
        border: { 1: "#EBE8E0", 2: "#D2CCC0", 3: "#B5AE9F" },
        success: "#2F6B4D",
        warning: "#B89446",
        danger: "#8B2828",
        info: "#3B5B7C",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "display-1": [
          "64px",
          { lineHeight: "1.04", letterSpacing: "-0.025em", fontWeight: "600" },
        ],
        "display-2": [
          "48px",
          { lineHeight: "1.08", letterSpacing: "-0.022em", fontWeight: "600" },
        ],
        h1: [
          "32px",
          { lineHeight: "1.18", letterSpacing: "-0.018em", fontWeight: "600" },
        ],
        h2: [
          "24px",
          { lineHeight: "1.25", letterSpacing: "-0.012em", fontWeight: "600" },
        ],
        h3: [
          "18px",
          { lineHeight: "1.35", letterSpacing: "-0.005em", fontWeight: "600" },
        ],
        body: ["15px", { lineHeight: "1.55" }],
        "body-sm": ["13px", { lineHeight: "1.5" }],
        caption: [
          "11px",
          { lineHeight: "1.4", letterSpacing: "0.04em", fontWeight: "500" },
        ],
        eyebrow: [
          "11px",
          { lineHeight: "1.2", letterSpacing: "0.12em", fontWeight: "500" },
        ],
        "mono-md": ["14px", { lineHeight: "1.4", fontWeight: "500" }],
        "mono-sm": ["12px", { lineHeight: "1.3", fontWeight: "500" }],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(27, 36, 54, 0.04)",
        card: "0 2px 6px rgba(27, 36, 54, 0.05), 0 1px 2px rgba(27, 36, 54, 0.03)",
        "card-hover":
          "0 8px 24px rgba(27, 36, 54, 0.08), 0 2px 4px rgba(27, 36, 54, 0.04)",
        modal:
          "0 24px 48px rgba(27, 36, 54, 0.16), 0 8px 16px rgba(27, 36, 54, 0.08)",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        "140": "140ms",
        "180": "180ms",
        "260": "260ms",
        "320": "320ms",
        "420": "420ms",
      },
      keyframes: {
        "slide-up-fade": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "photo-reveal": {
          "0%": {
            opacity: "0",
            filter: "blur(12px)",
            transform: "scale(1.04)",
          },
          "100%": { opacity: "1", filter: "blur(0)", transform: "scale(1)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        "cursor-blink": {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
        "spinner-arc": {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "slide-up-fade":
          "slide-up-fade 320ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "photo-reveal":
          "photo-reveal 600ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "pulse-soft":
          "pulse-soft 1500ms cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "cursor-blink": "cursor-blink 1s steps(2) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
