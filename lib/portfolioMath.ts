import { Holding, Member, GroupState } from "./types";

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
