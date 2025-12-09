"use client";

import { GroupState, Holding } from "@/lib/types";
import { sortMembersByPerformance, formatCurrency, formatPercent, getMemberColor, getMemberHoldings, getHoldingPnlPercent, getHoldingPnl, getHoldingValue } from "@/lib/utils";

interface LeaderboardTabProps {
    group: GroupState;
}

export default function LeaderboardTab({ group }: LeaderboardTabProps) {
    // Calculate rankings sorted by P/L%
    const rankings = sortMembersByPerformance(group);
    const hasAnyHoldings = group.holdings.length > 0;

    // Get best and worst trades across all investors
    const allHoldingsWithPnl = group.holdings.map(h => ({
        holding: h,
        pnl: getHoldingPnl(h),
        pnlPercent: getHoldingPnlPercent(h),
        value: getHoldingValue(h),
        memberName: group.members.find(m => m.id === h.memberId)?.name || "Unknown",
    })).sort((a, b) => b.pnlPercent - a.pnlPercent);

    const bestTrades = allHoldingsWithPnl.filter(h => h.pnlPercent > 0).slice(0, 3);
    const worstTrades = allHoldingsWithPnl.filter(h => h.pnlPercent < 0).slice(-3).reverse();

    // Group stats
    const totalGroupValue = rankings.reduce((sum, r) => sum + r.totalValue, 0);
    const totalGroupPnl = rankings.reduce((sum, r) => sum + r.pnl, 0);
    const avgReturn = rankings.length > 0 ? rankings.reduce((sum, r) => sum + r.pnlPercent, 0) / rankings.length : 0;

    // Empty state
    if (group.members.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                    <span className="text-4xl">🏆</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-200 mb-2">No hay inversores</h3>
                <p className="text-slate-400 text-center max-w-md">
                    Añade inversores para ver el ranking de rendimiento.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Group Stats */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                            <span className="text-3xl">🏆</span> Ranking
                        </h2>
                        <p className="text-slate-400 mt-1">{group.members.length} inversores compitiendo</p>
                    </div>
                    <div className="flex gap-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-slate-100">{formatCurrency(totalGroupValue, 0)}</div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider">Total Grupo</div>
                        </div>
                        <div className="text-center">
                            <div className={`text-2xl font-bold ${totalGroupPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {totalGroupPnl >= 0 ? "+" : ""}{formatCurrency(totalGroupPnl, 0)}
                            </div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider">P/L Total</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Podium - Top 3 */}
            {hasAnyHoldings && rankings.length >= 1 && (
                <div className="grid grid-cols-3 gap-3">
                    {/* 2nd Place */}
                    <div className={`flex flex-col items-center pt-8 ${rankings.length < 2 ? "opacity-30" : ""}`}>
                        {rankings[1] && (
                            <>
                                <div
                                    className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-lg md:text-xl font-bold text-white border-4 border-slate-400"
                                    style={{ backgroundColor: getMemberColor(rankings[1].member.colorHue) }}
                                >
                                    {rankings[1].member.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="text-2xl mt-2">🥈</div>
                                <div className="font-medium text-slate-200 text-center text-sm md:text-base truncate max-w-full px-2">
                                    {rankings[1].member.name}
                                </div>
                                <div className={`text-sm font-bold ${rankings[1].pnlPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                    {formatPercent(rankings[1].pnlPercent, 1)}
                                </div>
                                <div className="bg-gradient-to-t from-slate-700 to-slate-600 w-full h-16 rounded-t-xl mt-2" />
                            </>
                        )}
                    </div>

                    {/* 1st Place */}
                    <div className="flex flex-col items-center">
                        {rankings[0] && (
                            <>
                                <div
                                    className="w-18 h-18 md:w-20 md:h-20 rounded-full flex items-center justify-center text-xl md:text-2xl font-bold text-white border-4 border-amber-400 shadow-lg shadow-amber-400/30"
                                    style={{ backgroundColor: getMemberColor(rankings[0].member.colorHue), width: "5rem", height: "5rem" }}
                                >
                                    {rankings[0].member.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="text-3xl mt-2">🥇</div>
                                <div className="font-bold text-slate-100 text-center text-base md:text-lg truncate max-w-full px-2">
                                    {rankings[0].member.name}
                                </div>
                                <div className={`text-lg font-bold ${rankings[0].pnlPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                    {formatPercent(rankings[0].pnlPercent, 1)}
                                </div>
                                <div className="text-xs text-slate-500">{formatCurrency(rankings[0].totalValue, 0)}</div>
                                <div className="bg-gradient-to-t from-amber-600 to-amber-500 w-full h-24 rounded-t-xl mt-2" />
                            </>
                        )}
                    </div>

                    {/* 3rd Place */}
                    <div className={`flex flex-col items-center pt-12 ${rankings.length < 3 ? "opacity-30" : ""}`}>
                        {rankings[2] && (
                            <>
                                <div
                                    className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-base md:text-lg font-bold text-white border-4 border-orange-600"
                                    style={{ backgroundColor: getMemberColor(rankings[2].member.colorHue) }}
                                >
                                    {rankings[2].member.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="text-2xl mt-2">🥉</div>
                                <div className="font-medium text-slate-200 text-center text-sm md:text-base truncate max-w-full px-2">
                                    {rankings[2].member.name}
                                </div>
                                <div className={`text-sm font-bold ${rankings[2].pnlPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                    {formatPercent(rankings[2].pnlPercent, 1)}
                                </div>
                                <div className="bg-gradient-to-t from-orange-700 to-orange-600 w-full h-12 rounded-t-xl mt-2" />
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Full Ranking List */}
            {hasAnyHoldings && rankings.length > 0 && (
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-800">
                        <h3 className="font-semibold text-slate-100">Ranking Completo</h3>
                    </div>
                    <div className="divide-y divide-slate-800">
                        {rankings.map((entry, index) => {
                            const rank = index + 1;
                            const isTop3 = rank <= 3;

                            return (
                                <div
                                    key={entry.member.id}
                                    className={`flex items-center gap-3 p-4 ${isTop3 ? "bg-slate-800/30" : ""}`}
                                >
                                    {/* Rank */}
                                    <div className="w-8 text-center flex-shrink-0">
                                        {rank === 1 && <span className="text-xl">🥇</span>}
                                        {rank === 2 && <span className="text-xl">🥈</span>}
                                        {rank === 3 && <span className="text-xl">🥉</span>}
                                        {rank > 3 && <span className="text-lg font-bold text-slate-500">#{rank}</span>}
                                    </div>

                                    {/* Avatar & Name */}
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                                        style={{ backgroundColor: getMemberColor(entry.member.colorHue) }}
                                    >
                                        {entry.member.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-slate-100 truncate">{entry.member.name}</div>
                                        <div className="text-xs text-slate-500">{entry.holdingCount} posiciones</div>
                                    </div>

                                    {/* Stats */}
                                    <div className="text-right flex-shrink-0">
                                        <div className="font-medium text-slate-200">{formatCurrency(entry.totalValue, 0)}</div>
                                        <div className={`text-sm font-bold ${entry.pnlPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                            {entry.pnlPercent >= 0 ? "▲" : "▼"} {formatPercent(entry.pnlPercent, 1).replace("+", "")}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Best & Worst Trades */}
            {hasAnyHoldings && (bestTrades.length > 0 || worstTrades.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Best Trades */}
                    {bestTrades.length > 0 && (
                        <div className="bg-slate-900/50 backdrop-blur-xl border border-emerald-500/30 rounded-2xl overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-800 bg-emerald-500/5">
                                <h3 className="font-semibold text-emerald-400 flex items-center gap-2">
                                    <span>🚀</span> Mejores Trades
                                </h3>
                            </div>
                            <div className="divide-y divide-slate-800">
                                {bestTrades.map((trade, idx) => (
                                    <div key={trade.holding.id} className="flex items-center gap-3 p-3">
                                        <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 font-bold text-sm">
                                            #{idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-100">{trade.holding.symbol}</span>
                                                <span className="text-xs text-slate-500">• {trade.memberName}</span>
                                            </div>
                                            <div className="text-xs text-slate-400 truncate">{trade.holding.name}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-emerald-400">{formatPercent(trade.pnlPercent, 1)}</div>
                                            <div className="text-xs text-slate-500">+{formatCurrency(trade.pnl, 0)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Worst Trades */}
                    {worstTrades.length > 0 && (
                        <div className="bg-slate-900/50 backdrop-blur-xl border border-red-500/30 rounded-2xl overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-800 bg-red-500/5">
                                <h3 className="font-semibold text-red-400 flex items-center gap-2">
                                    <span>📉</span> Peores Trades
                                </h3>
                            </div>
                            <div className="divide-y divide-slate-800">
                                {worstTrades.map((trade, idx) => (
                                    <div key={trade.holding.id} className="flex items-center gap-3 p-3">
                                        <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center text-red-400 font-bold text-sm">
                                            #{idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-100">{trade.holding.symbol}</span>
                                                <span className="text-xs text-slate-500">• {trade.memberName}</span>
                                            </div>
                                            <div className="text-xs text-slate-400 truncate">{trade.holding.name}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-red-400">{formatPercent(trade.pnlPercent, 1)}</div>
                                            <div className="text-xs text-slate-500">{formatCurrency(trade.pnl, 0)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Stats Cards */}
            {hasAnyHoldings && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4 text-center">
                        <div className="text-3xl mb-2">📊</div>
                        <div className="text-xl font-bold text-slate-100">{group.holdings.length}</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider">Posiciones</div>
                    </div>
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4 text-center">
                        <div className="text-3xl mb-2">👥</div>
                        <div className="text-xl font-bold text-slate-100">{group.members.length}</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider">Inversores</div>
                    </div>
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4 text-center">
                        <div className="text-3xl mb-2">📈</div>
                        <div className={`text-xl font-bold ${avgReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {formatPercent(avgReturn, 1)}
                        </div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider">Media Grupo</div>
                    </div>
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4 text-center">
                        <div className="text-3xl mb-2">🎯</div>
                        <div className="text-xl font-bold text-emerald-400">
                            {allHoldingsWithPnl.filter(h => h.pnlPercent > 0).length}/{allHoldingsWithPnl.length}
                        </div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider">En Verde</div>
                    </div>
                </div>
            )}

            {/* No Holdings State */}
            {!hasAnyHoldings && (
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-12 text-center">
                    <div className="text-5xl mb-4">🏁</div>
                    <h3 className="text-xl font-semibold text-slate-200 mb-2">¡Empieza la competición!</h3>
                    <p className="text-slate-400 max-w-md mx-auto">
                        Añade posiciones a los inversores para ver quién tiene el mejor rendimiento.
                    </p>
                </div>
            )}
        </div>
    );
}
