// Utility functions for Portfolio League

import { Holding, GroupState } from "./types";

/**
 * Generate a unique ID using timestamp and random string
 */
export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/**
 * Generate a random hue value (0-360) for member colors
 */
export function generateRandomHue(): number {
    return Math.floor(Math.random() * 360);
}

/**
 * Generate HSL color string from hue value
 */
export function getMemberColor(hue: number): string {
    return `hsl(${hue}, 70%, 50%)`;
}

/**
 * Get a slightly lighter/darker variant of the member color
 */
export function getMemberColorVariant(hue: number, lightness: number = 60): string {
    return `hsl(${hue}, 70%, ${lightness}%)`;
}

/**
 * Get all holdings for a specific member
 */
export function getMemberHoldings(holdings: Holding[], memberId: string): Holding[] {
    return holdings.filter(h => h.memberId === memberId);
}

/**
 * Calculate total portfolio value for a member's holdings
 */
export function getTotalPortfolioValue(holdings: Holding[]): number {
    return holdings.reduce((total, holding) => {
        return total + holding.quantity * holding.currentPrice;
    }, 0);
}

/**
 * Calculate total cost basis (invested amount) for holdings
 */
export function getTotalCostBasis(holdings: Holding[]): number {
    return holdings.reduce((total, holding) => {
        return total + holding.quantity * holding.avgBuyPrice;
    }, 0);
}

/**
 * Calculate unrealized P/L for holdings
 */
export function getTotalPnl(holdings: Holding[]): number {
    return getTotalPortfolioValue(holdings) - getTotalCostBasis(holdings);
}

/**
 * Calculate unrealized P/L percentage for holdings
 */
export function getTotalPnlPercent(holdings: Holding[]): number {
    const costBasis = getTotalCostBasis(holdings);
    if (costBasis === 0) return 0;
    return (getTotalPnl(holdings) / costBasis) * 100;
}

/**
 * Calculate P/L for a single holding
 */
export function getHoldingPnl(holding: Holding): number {
    return (holding.currentPrice - holding.avgBuyPrice) * holding.quantity;
}

/**
 * Calculate P/L percentage for a single holding
 */
export function getHoldingPnlPercent(holding: Holding): number {
    if (holding.avgBuyPrice === 0) return 0;
    return ((holding.currentPrice - holding.avgBuyPrice) / holding.avgBuyPrice) * 100;
}

/**
 * Calculate holding's current value (equity)
 */
export function getHoldingValue(holding: Holding): number {
    return holding.quantity * holding.currentPrice;
}

/**
 * Format number as USD currency
 */
export function formatCurrency(value: number, decimals: number = 2): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
}

/**
 * Format number as percentage with sign
 */
export function formatPercent(value: number, decimals: number = 2): string {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format percentage with null-safe handling (fintech-grade)
 * Returns "--" if value is null (baseline too small)
 */
export function formatPercentSafe(value: number | null, decimals: number = 2): string {
    if (value === null || value === undefined) {
        return "--";
    }
    return formatPercent(value, decimals);
}

/**
 * Format ISO timestamp to readable date/time
 */
export function formatDateTime(isoString: string): string {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
}

/**
 * Format ISO timestamp to short date
 */
export function formatDate(isoString: string): string {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
    }).format(date);
}

/**
 * Utility for combining class names (filters out falsy values)
 */
export function classNames(...classes: (string | boolean | undefined | null)[]): string {
    return classes.filter(Boolean).join(" ");
}

/**
 * Get asset class breakdown for a set of holdings
 */
export function getAssetClassBreakdown(holdings: Holding[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    holdings.forEach((holding) => {
        const value = holding.quantity * holding.currentPrice;
        breakdown[holding.assetClass] = (breakdown[holding.assetClass] || 0) + value;
    });
    return breakdown;
}

/**
 * Calculate member stats from group state
 */
export function getMemberStats(state: GroupState, memberId: string) {
    const holdings = getMemberHoldings(state.holdings, memberId);
    const totalValue = getTotalPortfolioValue(holdings);
    const costBasis = getTotalCostBasis(holdings);
    const pnl = totalValue - costBasis;
    const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

    return {
        holdings,
        totalValue,
        costBasis,
        pnl,
        pnlPercent,
        holdingCount: holdings.length,
    };
}

/**
 * Sort members by P/L percentage (for leaderboard)
 */
export function sortMembersByPerformance(state: GroupState) {
    return state.members
        .map(member => {
            const stats = getMemberStats(state, member.id);
            return {
                member,
                ...stats,
            };
        })
        .sort((a, b) => b.pnlPercent - a.pnlPercent);
}
