/**
 * PORTFOLIO LEAGUE - UNIFIED COLOR SYSTEM
 * 
 * This file provides consistent colors across all components,
 * especially for charts and dynamic styling that can't use Tailwind classes.
 */

// ============================================
// ASSET CLASS COLORS (for charts & donut)
// ============================================

export const ASSET_COLORS: Record<string, string> = {
    STOCK: "#10b981",   // Emerald - Primary
    CRYPTO: "#F7931A",  // Bitcoin Orange
    ETF: "#06b6d4",     // Cyan
    CASH: "#6b7280",    // Slate (muted gray)
    OTHER: "#8b5cf6",   // Purple
};

// ============================================
// P/L COLORS (for charts & indicators)
// ============================================

export const PNL_COLORS = {
    positive: "#10b981",      // Emerald
    positiveLight: "#4ade80", // Light emerald
    positiveMuted: "rgba(16, 185, 129, 0.2)",
    negative: "#ef4444",      // Red
    negativeLight: "#f87171", // Light red
    negativeMuted: "rgba(239, 68, 68, 0.2)",
    neutral: "#64748b",       // Slate
};

// ============================================
// CHART GRADIENT COLORS
// ============================================

export const CHART_COLORS = {
    primaryLine: "#10b981",
    primaryGradientStart: "rgba(16, 185, 129, 0.3)",
    primaryGradientEnd: "rgba(16, 185, 129, 0.02)",
    dangerLine: "#ef4444",
    dangerGradientStart: "rgba(239, 68, 68, 0.3)",
    dangerGradientEnd: "rgba(239, 68, 68, 0.02)",
    goldLine: "#f59e0b",
    grid: "#1e293b",
    axis: "#64748b",
};

// ============================================
// DONUT CHART PALETTE
// ============================================

export const DONUT_PALETTE = [
    "#10b981", // Stocks - Emerald
    "#F7931A", // Crypto - Bitcoin Orange
    "#06b6d4", // ETF - Cyan
    "#8b5cf6", // Other - Purple  
    "#6b7280", // Cash - Slate
];

// ============================================
// HELPER FUNCTIONS
// ============================================

export const getPnlColor = (value: number): string => {
    if (value > 0) return PNL_COLORS.positive;
    if (value < 0) return PNL_COLORS.negative;
    return PNL_COLORS.neutral;
};

export const getPnlClass = (value: number): string => {
    if (value > 0) return "text-emerald-400";
    if (value < 0) return "text-red-400";
    return "text-slate-400";
};

export const getAssetColor = (assetClass: string): string => {
    return ASSET_COLORS[assetClass] || ASSET_COLORS.OTHER;
};
