// Type definitions for Portfolio League

// Asset classes - NO CASH (only tracking invested assets)
export type AssetClass = "STOCK" | "CRYPTO" | "ETF" | "OTHER";

// Each holding belongs to a member via memberId
export interface Holding {
    id: string;
    memberId: string;           // Links to Member
    symbol: string;             // e.g. "NVDA", "BTC"
    name: string;               // e.g. "NVIDIA Corporation"
    assetClass: AssetClass;
    quantity: number;
    avgBuyPrice: number;        // Cost basis per unit
    currentPrice: number;       // Last known price per unit
    lastPriceUpdate?: string;   // ISO timestamp of last live price update
    cryptoId?: string;          // CoinGecko ID for crypto (e.g. "bitcoin")
}

// Member with starting capital and realized P/L tracking
export interface Member {
    id: string;
    name: string;
    colorHue: number;           // 0-360 for HSL color generation
    cashBalance: number;        // Uninvested cash
    totalRealizedPnl: number;   // Cumulative realized P/L from all sales
    netDeposits: number;        // Total deposits - total withdrawals (contributions baseline)
    initialCapital?: number;    // The starting bankroll (fixed when joining) - legacy
    initialValue?: number;      // Explicit all-time baseline (cash + cost basis at join)
    avatarInitials?: string;    // e.g. "DP"
    createdAt: string;          // ISO timestamp
}

// Activity event types - expanded for seasons
export type ActivityType =
    | "BUY" | "SELL" | "UPDATE" | "NOTE" | "DEPOSIT" | "WITHDRAW" | "JOIN"
    | "GROUP_CREATED" | "SEASON_STARTED" | "SEASON_ENDED";

// Activity event for tracking all portfolio changes
export interface ActivityEvent {
    id: string;
    timestamp: string;          // ISO timestamp
    memberId: string | null;    // null for global events (e.g. price refresh)
    type: ActivityType;
    symbol?: string;            // Optional symbol reference
    title: string;              // Short headline (e.g. "Sold NVDA")
    description?: string;       // Optional longer text
    amountChangeUsd?: number;   // Realized P/L for SELL events, or deposit/withdraw amount
}

// Portfolio value snapshot for historical chart
export type PerformanceScope = "user" | "group";

export interface PortfolioSnapshot {
    id?: string;                        // Optional unique id for deduplication
    timestamp: number | string;         // ms timestamp (or ISO legacy)
    memberId: string;                   // Which member this snapshot is for
    totalValue: number;                 // Cash + Holdings value at this moment (mark-to-market)
    costBasis: number;                  // Total cost basis at this moment (cost + cash)
    scope?: PerformanceScope;           // What this snapshot represents
    entityId?: string;                  // userId or groupId
    totalCurrentValue?: number;         // Optional alias for charts (same as totalValue)
}

export interface PerformanceSnapshot {
    id: string;
    scope: PerformanceScope;
    entityId: string;
    timestamp: number;
    totalCurrentValue: number;
    costBasis?: number;
}

// Lightweight points for charts after filtering snapshots
export interface PerformancePoint {
    timestamp: number;          // ms
    value: number;              // portfolio value
    scope: "user" | "group";
    entityId: string;
}

// Season for competitive periods
export interface Season {
    id: string;                    // "season_1", "season_2", etc.
    name: string;                  // "Season 1"
    startTime: string;             // ISO timestamp
    endTime?: string;              // ISO timestamp (undefined if active)
    leaderId: string;              // Who started the season
    memberSnapshots: Record<string, number>; // userId -> portfolio value at season start
}

// Current user session (stored separately from group)
export interface UserSession {
    groupId: string;            // Which group is selected
    profileId: string | null;   // Which member profile is selected (null = not selected yet)
}

// Main state structure with group identity
export interface GroupState {
    id: string;
    name: string;               // Group name for display
    members: Member[];
    holdings: Holding[];        // Flat array, each holding has memberId
    activity: ActivityEvent[];
    portfolioHistory: PortfolioSnapshot[];  // Real historical snapshots
    // Season support
    leaderId?: string;          // Group owner who can start seasons
    currentSeasonId?: string;   // Active season ID (undefined if none)
    seasons: Season[];          // All seasons history
}

// Multi-group storage (localStorage stores multiple groups)
export interface AppState {
    groups: GroupState[];
    currentSession: UserSession | null;
}

// Input type for creating new holdings
export interface NewHoldingInput {
    symbol: string;
    name: string;
    assetClass: AssetClass;
    quantity: number;
    avgBuyPrice: number;
    currentPrice?: number;      // Optional, defaults to avgBuyPrice
    cryptoId?: string;          // For crypto holdings
}

// Form values for holding modal (matches NewHoldingInput but all required)
export interface HoldingFormValues {
    symbol: string;
    name: string;
    assetClass: AssetClass;
    quantity: number;
    avgBuyPrice: number;
    currentPrice: number;
    cryptoId?: string;
}

// Options for selling a holding
export interface SellHoldingOptions {
    sellPrice?: number;         // Defaults to currentPrice
    note?: string;              // Optional note for activity
}

// Initial holding for onboarding (user adds multiple before confirming)
export interface OnboardingHolding {
    symbol: string;
    name: string;
    assetClass: AssetClass;
    quantity: number;
    avgBuyPrice: number;
    currentPrice: number;
    cryptoId?: string;
}

// Profile creation input
export interface CreateProfileInput {
    name: string;
    initialCash: number;
    initialHoldings: OnboardingHolding[];
}
