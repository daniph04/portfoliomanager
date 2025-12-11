import { Holding, Member, GroupState, Season, PortfolioSnapshot } from "./types";

type MetricsMode = "allTime" | "season";

/**
 * Computes metrics for a single position (holding).
 * @param holding The holding to compute metrics for.
 */
export function computePositionMetrics(holding: Holding) {
    const currentValue = holding.quantity * holding.currentPrice;
    const costBasis = holding.quantity * holding.avgBuyPrice;
    const unrealizedPL = currentValue - costBasis;
    const unrealizedPLPct = costBasis === 0 ? 0 : (unrealizedPL / costBasis) * 100;

    return {
        ...holding,
        currentValue,
        costBasis,
        unrealizedPL,
        unrealizedPLPct
    };
}

/**
 * Computes metrics for an investor (member), aggregating their holdings.
 * @param member The member (investor).
 * @param holdings The array of all holdings (will be filtered for this member).
 */
export function computeInvestorMetrics(member: Member, holdings: Holding[]) {
    const memberHoldings = holdings.filter(h => h.memberId === member.id);

    // Calculate metrics for each holding
    const positions = memberHoldings.map(computePositionMetrics);

    // Aggregates
    const investedValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
    const totalCostBasis = positions.reduce((sum, p) => sum + p.costBasis, 0);

    // Portfolio Value = Cash + Invested
    const portfolioValue = member.cashBalance + investedValue;

    // Daily PL / Unrealized PL is different. 
    // "Unrealized PL" is purely on holdings.
    const unrealizedPL = investedValue - totalCostBasis;
    const unrealizedPLPct = totalCostBasis === 0 ? 0 : (unrealizedPL / totalCostBasis) * 100;

    return {
        ...member,
        positions,
        investedValue,
        portfolioValue,
        totalCostBasis,
        unrealizedPL,
        unrealizedPLPct,
    };
}

const getEarliestSnapshotValue = (
    snapshots: PortfolioSnapshot[],
    memberId: string
): number | null => {
    const filtered = snapshots
        .filter(s => (s.entityId || s.memberId) === memberId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (filtered.length === 0) return null;
    return filtered[0].totalValue;
};

const computeCurrentValue = (member: Member, holdings: Holding[]): number => {
    const memberHoldings = holdings.filter(h => h.memberId === member.id);
    const investedValue = memberHoldings.reduce((sum, h) => sum + h.quantity * h.currentPrice, 0);
    return member.cashBalance + investedValue;
};

const computeBaselineAllTime = (
    member: Member,
    holdings: Holding[],
    history: PortfolioSnapshot[] = []
): number => {
    if (member.initialValue !== undefined) return member.initialValue;
    if (member.initialCapital !== undefined) return member.initialCapital;

    const earliestSnapshot = getEarliestSnapshotValue(history, member.id);
    if (earliestSnapshot !== null) return earliestSnapshot;

    const costBasis = holdings
        .filter(h => h.memberId === member.id)
        .reduce((sum, h) => sum + h.quantity * h.avgBuyPrice, 0);

    return member.cashBalance + costBasis;
};

const computeBaselineSeason = (
    member: Member,
    holdings: Holding[],
    season: Season | null,
    history: PortfolioSnapshot[] = []
): number => {
    if (!season) return computeCurrentValue(member, holdings);

    const snapshotValue = season.memberSnapshots[member.id];
    if (snapshotValue !== undefined) return snapshotValue;

    // Fallback: closest snapshot to season start
    const startMs = new Date(season.startTime).getTime();
    const memberHistory = history
        .filter(s => (s.entityId || s.memberId) === member.id)
        .map(s => ({ ...s, ts: new Date(s.timestamp).getTime() }))
        .sort((a, b) => a.ts - b.ts);

    const closest = memberHistory.reduce<{ diff: number; value: number } | null>((best, snap) => {
        const diff = Math.abs(snap.ts - startMs);
        if (!best || diff < best.diff) {
            return { diff, value: snap.totalValue };
        }
        return best;
    }, null);

    if (closest) return closest.value;

    return computeCurrentValue(member, holdings);
};

/**
 * Unified metrics interface for consistent UI display
 */
export interface UnifiedMetrics {
    currentValue: number;      // Portfolio value right now
    baseline: number;          // Starting point (allTime or season)
    plAbs: number;             // P&L absolute ($)
    plPct: number;             // P&L percentage
    mode: MetricsMode;         // Which mode these metrics are for
    modeLabel: string;         // "All Time" or season name
    portfolioValue: number;    // Same as currentValue
    investedValue: number;     // Current value in positions
    cashBalance: number;       // Cash
}

/**
 * Get unified metrics for a member based on display mode.
 * This is the single source of truth for P&L calculations.
 */
export function getMetricsForMode(
    member: Member,
    holdings: Holding[],
    season: Season | null,
    mode: MetricsMode,
    history: PortfolioSnapshot[] = []
): UnifiedMetrics {
    const investorMetrics = computeInvestorMetrics(member, holdings);

    const currentValue = investorMetrics.portfolioValue;

    const seasonBaseline = computeBaselineSeason(member, holdings, season, history);
    const allTimeBaseline = computeBaselineAllTime(member, holdings, history);

    if (mode === "season" && season) {
        const plAbs = currentValue - seasonBaseline;
        const plPct = seasonBaseline > 0 ? (plAbs / seasonBaseline) * 100 : 0;

        return {
            currentValue,
            baseline: seasonBaseline,
            plAbs,
            plPct,
            mode: "season",
            modeLabel: season.name,
            portfolioValue: currentValue,
            investedValue: investorMetrics.investedValue,
            cashBalance: member.cashBalance,
        };
    }

    // All Time mode
    const plAbs = currentValue - allTimeBaseline;
    const plPct = allTimeBaseline > 0 ? (plAbs / allTimeBaseline) * 100 : 0;

    return {
        currentValue,
        baseline: allTimeBaseline,
        plAbs,
        plPct,
        mode: "allTime",
        modeLabel: "All Time",
        portfolioValue: currentValue,
        investedValue: investorMetrics.investedValue,
        cashBalance: member.cashBalance,
    };
}

/**
 * Get unified metrics for the entire group based on display mode.
 */
export function getGroupMetricsForMode(
    group: GroupState,
    season: Season | null,
    mode: MetricsMode,
    history: PortfolioSnapshot[] = []
): UnifiedMetrics & { memberCount: number; totalCash: number } {
    const memberMetrics = group.members.map(m =>
        getMetricsForMode(m, group.holdings, season, mode, history)
    );

    const currentValue = memberMetrics.reduce((sum, m) => sum + m.currentValue, 0);
    const baseline = memberMetrics.reduce((sum, m) => sum + m.baseline, 0);
    const totalCash = memberMetrics.reduce((sum, m) => sum + m.cashBalance, 0);
    const investedValue = memberMetrics.reduce((sum, m) => sum + m.investedValue, 0);

    const plAbs = currentValue - baseline;
    const plPct = baseline > 0 ? (plAbs / baseline) * 100 : 0;

    return {
        currentValue,
        baseline,
        plAbs,
        plPct,
        mode,
        modeLabel: mode === "season" && season ? season.name : "All Time",
        portfolioValue: currentValue,
        investedValue,
        cashBalance: totalCash,
        memberCount: group.members.length,
        totalCash,
    };
}

/**
 * Convenience export for mode type to keep imports stable.
 */
export type { MetricsMode };
