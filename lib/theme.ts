export const theme = {
    colors: {
        background: "#020617", // slate-950
        surface: "#0f172a", // slate-900
        primary: "#10b981", // emerald-500
        primaryDark: "#059669", // emerald-600
        accent: "#f59e0b", // amber-500
        danger: "#ef4444", // red-500
        text: {
            primary: "#f1f5f9", // slate-100
            secondary: "#94a3b8", // slate-400
            muted: "#64748b", // slate-500
        },
        assets: {
            STOCK: "#10b981", // Emerald
            CRYPTO: "#f59e0b", // Amber (Bitcoin orange-ish)
            ETF: "#06b6d4", // Cyan
            OTHER: "#8b5cf6", // Violet
            CASH: "#64748b", // Slate
        }
    },
    radii: {
        card: "1rem", // rounded-2xl
        button: "0.75rem", // rounded-xl
    }
};

export const ASSET_COLORS = theme.colors.assets;
