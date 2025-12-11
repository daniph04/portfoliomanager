import { Holding, Member, GroupState, Season } from "./types";

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

    // Use initialCapital if available (for ranking), otherwise use totalCostBasis as fallback for "return"
    // Ideally initialCapital is set when creating the profile.
    // If not set, we might default to cashBalance + costBasis (which assumes no P/L yet) or 0.
    const startCapital = member.initialCapital ?? (member.cashBalance + totalCostBasis);

    const totalReturnVal = portfolioValue - startCapital;
    const totalReturnPct = startCapital === 0 ? 0 : (totalReturnVal / startCapital) * 100;

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
        totalReturnVal,
        totalReturnPct,
        startCapital,
    };
}

/**
 * Computes metrics for the entire group.
 * @param group The group state.
 */
export function computeGroupMetrics(group: GroupState) {
    const memberMetrics = group.members.map(m => computeInvestorMetrics(m, group.holdings));

    const groupInitialCapital = memberMetrics.reduce((sum, m) => sum + m.startCapital, 0);
    const groupCurrentValue = memberMetrics.reduce((sum, m) => sum + m.portfolioValue, 0);

    const groupPL = groupCurrentValue - groupInitialCapital;
    const groupPLPct = groupInitialCapital === 0 ? 0 : (groupPL / groupInitialCapital) * 100;

    return {
        groupInitialCapital,
        groupCurrentValue,
        groupPL,
        groupPLPct,
        memberMetrics
    };
}

/**
 * Computes season-specific metrics for an investor.
 * Season P&L is calculated from the portfolio value at season start.
 * @param member The member (investor).
 * @param holdings The array of all holdings.
 * @param season The season to calculate metrics for.
 */
export function computeSeasonMetrics(
    member: Member,
    holdings: Holding[],
    season: Season | null
) {
    const investorMetrics = computeInvestorMetrics(member, holdings);

    if (!season) {
        // No active season - return zeroed season metrics
        return {
            ...investorMetrics,
            seasonInitialValue: investorMetrics.portfolioValue,
            seasonCurrentValue: investorMetrics.portfolioValue,
            seasonPLAbs: 0,
            seasonPLPct: 0,
            hasSeasonData: false,
        };
    }

    // Get the member's portfolio value at season start
    const seasonInitialValue = season.memberSnapshots[member.id] ?? investorMetrics.portfolioValue;
    const seasonCurrentValue = investorMetrics.portfolioValue;

    const seasonPLAbs = seasonCurrentValue - seasonInitialValue;
    const seasonPLPct = seasonInitialValue === 0 ? 0 : (seasonPLAbs / seasonInitialValue) * 100;

    return {
        ...investorMetrics,
        seasonInitialValue,
        seasonCurrentValue,
        seasonPLAbs,
        seasonPLPct,
        hasSeasonData: true,
    };
}

/**
 * Computes season metrics for the entire group.
 * @param group The group state.
 * @param season The active season (or null if none).
 */
export function computeGroupSeasonMetrics(group: GroupState, season: Season | null) {
    const memberSeasonMetrics = group.members.map(m =>
        computeSeasonMetrics(m, group.holdings, season)
    );

    const groupSeasonInitial = memberSeasonMetrics.reduce((sum, m) => sum + m.seasonInitialValue, 0);
    const groupSeasonCurrent = memberSeasonMetrics.reduce((sum, m) => sum + m.seasonCurrentValue, 0);

    const groupSeasonPLAbs = groupSeasonCurrent - groupSeasonInitial;
    const groupSeasonPLPct = groupSeasonInitial === 0 ? 0 : (groupSeasonPLAbs / groupSeasonInitial) * 100;

    // Also compute all-time metrics
    const allTimeMetrics = computeGroupMetrics(group);

    return {
        ...allTimeMetrics,
        memberSeasonMetrics,
        groupSeasonInitial,
        groupSeasonCurrent,
        groupSeasonPLAbs,
        groupSeasonPLPct,
    };
}

/**
 * Display mode for P&L calculations
 */
export type MetricsMode = "allTime" | "season";

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
    // For charts
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
    mode: MetricsMode
): UnifiedMetrics {
    const investorMetrics = computeInvestorMetrics(member, holdings);

    const currentValue = investorMetrics.portfolioValue;

    if (mode === "season" && season) {
        const seasonInitial = season.memberSnapshots[member.id] ?? currentValue;
        const plAbs = currentValue - seasonInitial;
        const plPct = seasonInitial > 0 ? (plAbs / seasonInitial) * 100 : 0;

        return {
            currentValue,
            baseline: seasonInitial,
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
    const allTimeBaseline = investorMetrics.startCapital;
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
    mode: MetricsMode
): UnifiedMetrics & { memberCount: number; totalCash: number } {
    const memberMetrics = group.members.map(m =>
        getMetricsForMode(m, group.holdings, season, mode)
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
