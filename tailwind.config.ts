import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                // Semantic colors for consistent design
                success: {
                    DEFAULT: "#22c55e",
                    light: "#4ade80",
                    dark: "#16a34a",
                    muted: "rgba(34, 197, 94, 0.1)",
                },
                danger: {
                    DEFAULT: "#ef4444",
                    light: "#f87171",
                    dark: "#dc2626",
                    muted: "rgba(239, 68, 68, 0.1)",
                },
                warning: {
                    DEFAULT: "#fbbf24",
                    light: "#fcd34d",
                    dark: "#f59e0b",
                    muted: "rgba(251, 191, 36, 0.1)",
                },
                accent: {
                    DEFAULT: "#6366f1",
                    light: "#818cf8",
                    dark: "#4f46e5",
                    muted: "rgba(99, 102, 241, 0.1)",
                },
                // Elevated surfaces
                elevated: {
                    DEFAULT: "#0a0f1e",
                    hover: "rgba(255, 255, 255, 0.05)",
                },
            },
            animation: {
                "fade-in": "fadeIn 0.3s ease-out forwards",
                "slide-up": "slideUp 0.3s ease-out forwards",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0", transform: "translateY(10px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                slideUp: {
                    "0%": { transform: "translateY(100%)" },
                    "100%": { transform: "translateY(0)" },
                },
            },
        },
    },
    plugins: [],
};
export default config;

