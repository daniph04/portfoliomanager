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
