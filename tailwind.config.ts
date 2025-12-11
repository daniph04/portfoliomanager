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
                primary: {
                    DEFAULT: "#10b981", // emerald-500
                    dark: "#059669",    // emerald-600
                },
                accent: {
                    DEFAULT: "#f59e0b", // amber-500
                },
                // Asset class colors
                stock: "#10b981",
                crypto: "#f59e0b",
                etf: "#06b6d4",
                other: "#8b5cf6",
                cash: "#64748b",

                // Semantic colors
                success: {
                    DEFAULT: "#10b981",
                    muted: "rgba(16, 185, 129, 0.1)",
                },
                danger: {
                    DEFAULT: "#ef4444",
                    muted: "rgba(239, 68, 68, 0.1)",
                },
                warning: {
                    DEFAULT: "#f59e0b",
                    muted: "rgba(245, 158, 11, 0.1)",
                },
                // Elevated surfaces
                elevated: {
                    DEFAULT: "#0f172a", // slate-900
                    hover: "#1e293b",   // slate-800
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

