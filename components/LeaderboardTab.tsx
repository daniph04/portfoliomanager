"use client";

import { GroupState, Holding } from "@/lib/types";
import { sortMembersByPerformance, formatCurrency, formatPercent, getMemberColor, getHoldingPnlPercent, getHoldingPnl, getTotalCostBasis, getTotalPortfolioValue } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface LeaderboardTabProps {
    group: GroupState;
}

export default function LeaderboardTab({ group }: LeaderboardTabProps) {
    const rankings = sortMembersByPerformance(group);
    const hasAnyHoldings = group.holdings.length > 0;

    // Get best and worst trades
    const allHoldingsWithPnl = group.holdings.map(h => ({
        holding: h,
        pnl: getHoldingPnl(h),
        pnlPercent: getHoldingPnlPercent(h),
        memberName: group.members.find(m => m.id === h.memberId)?.name || "Unknown",
    })).sort((a, b) => b.pnlPercent - a.pnlPercent);

    const bestTrades = allHoldingsWithPnl.filter(h => h.pnlPercent > 0).slice(0, 3);
    const worstTrades = allHoldingsWithPnl.filter(h => h.pnlPercent < 0).slice(-3).reverse();

    // Group stats
    const totalGroupValue = rankings.reduce((sum, r) => sum + r.totalValue, 0);
    const totalGroupCost = rankings.reduce((sum, r) => sum + r.costBasis, 0);
    const totalGroupPnl = rankings.reduce((sum, r) => sum + r.pnl, 0);
    const avgReturn = rankings.length > 0 ? rankings.reduce((sum, r) => sum + r.pnlPercent, 0) / rankings.length : 0;

    // Generate race chart data with multiple points for curve effect
    const generateRaceData = () => {
        if (rankings.length === 0) return [];

        const numPoints = 12;
        const points = [];

        // Pseudo-random function for consistent curve
        const pseudoRandom = (seed: number, i: number) => {
            const x = Math.sin(seed + i * 12.9898) * 43758.5453;
            return x - Math.floor(x);
        };

        for (let i = 0; i < numPoints; i++) {
            const progress = i / (numPoints - 1);
            const label = i === 0 ? "Start" : i === numPoints - 1 ? "Today" : ``;

            const point: Record<string, number | string> = { name: label };

            rankings.forEach((r, idx) => {
                const targetPnl = r.pnlPercent;
                // Eased progress for smooth curve
                const eased = progress < 0.5
                    ? 2 * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;

                // Add some variation per investor
                const noise = (pseudoRandom(idx * 100 + r.member.colorHue, i) - 0.5) * Math.abs(targetPnl) * 0.3;
                const volatility = Math.sin(progress * Math.PI) * 0.5;

                let value = targetPnl * eased + noise * volatility;
                if (i === 0) value = 0;
                if (i === numPoints - 1) value = targetPnl;

                point[r.member.name] = value;
            });

            points.push(point);
        }

        return points;
    };

    const raceData = generateRaceData();

    // Empty state
    if (group.members.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="text-xl font-semibold text-slate-200 mb-2">No investors</h3>
                <p className="text-slate-400 text-center max-w-md">
                    The ranking will appear when there are investors with positions.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-emerald-500/10 border border-slate-700 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="text-4xl">🏆</span>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-100">Ranking</h2>
                            <p className="text-slate-400">{group.members.length} investors</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-6 text-center">
                        <div>
                            <div className="text-xl md:text-2xl font-bold text-slate-100">{formatCurrency(totalGroupValue, 0)}</div>
                            <div className="text-xs text-slate-500 uppercase">Total Value</div>
                        </div>
                        <div>
                            <div className={`text-xl md:text-2xl font-bold ${totalGroupPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {totalGroupPnl >= 0 ? "+" : ""}{formatCurrency(totalGroupPnl, 0)}
                            </div>
                            <div className="text-xs text-slate-500 uppercase">Group P/L</div>
                        </div>
                        <div>
                            <div className={`text-xl md:text-2xl font-bold ${avgReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {formatPercent(avgReturn, 1)}
                            </div>
                            <div className="text-xs text-slate-500 uppercase">Average</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Race Chart */}
            {hasAnyHoldings && rankings.length > 0 && (
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 md:p-6">
                    <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                        <span>🏁</span> Performance Race
                    </h3>
                    <div className="h-48 md:h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={raceData}>
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    tickFormatter={(value) => `${value.toFixed(0)}%`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#1e293b",
                                        border: "1px solid #334155",
                                        borderRadius: "8px",
                                        color: "#f1f5f9",
                                    }}
                                    formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name]}
                                />
                                <Legend />
                                {rankings.map((entry, idx) => (
                                    <Line
                                        key={entry.member.id}
                                        type="monotone"
                                        dataKey={entry.member.name}
                                        stroke={getMemberColor(entry.member.colorHue)}
                                        strokeWidth={3}
                                        dot={{ r: 6, fill: getMemberColor(entry.member.colorHue) }}
                                        activeDot={{ r: 8 }}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Podium - Top 3 */}
            {hasAnyHoldings && rankings.length >= 1 && (
                <div className="grid grid-cols-3 gap-2 md:gap-4">
                    {/* 2nd Place */}
                    <div className={`flex flex-col items-center pt-6 ${rankings.length < 2 ? "opacity-20" : ""}`}>
                        {rankings[1] ? (
                            <>
                                <div
                                    className="w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-lg font-bold text-white border-4 border-slate-400 shadow-lg"
                                    style={{ backgroundColor: getMemberColor(rankings[1].member.colorHue) }}
                                >
                                    {rankings[1].member.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="text-2xl mt-1">🥈</div>
                                <div className="font-medium text-slate-200 text-sm truncate max-w-full">{rankings[1].member.name}</div>
                                <div className={`text-sm font-bold ${rankings[1].pnlPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                    {formatPercent(rankings[1].pnlPercent, 1)}
                                </div>
                                <div className="bg-gradient-to-t from-slate-600 to-slate-500 w-full h-14 rounded-t-lg mt-2" />
                            </>
                        ) : <div className="h-32" />}
                    </div>

                    {/* 1st Place */}
                    <div className="flex flex-col items-center">
                        <div
                            className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-xl font-bold text-white border-4 border-amber-400 shadow-xl shadow-amber-400/20"
                            style={{ backgroundColor: getMemberColor(rankings[0].member.colorHue) }}
                        >
                            {rankings[0].member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-3xl mt-1">🥇</div>
                        <div className="font-bold text-slate-100 truncate max-w-full">{rankings[0].member.name}</div>
                        <div className={`text-lg font-bold ${rankings[0].pnlPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {formatPercent(rankings[0].pnlPercent, 1)}
                        </div>
                        <div className="text-xs text-slate-500">{formatCurrency(rankings[0].totalValue, 0)}</div>
                        <div className="bg-gradient-to-t from-amber-600 to-amber-500 w-full h-20 rounded-t-lg mt-2" />
                    </div>

                    {/* 3rd Place */}
                    <div className={`flex flex-col items-center pt-10 ${rankings.length < 3 ? "opacity-20" : ""}`}>
                        {rankings[2] ? (
                            <>
                                <div
                                    className="w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center text-base font-bold text-white border-4 border-orange-600 shadow-lg"
                                    style={{ backgroundColor: getMemberColor(rankings[2].member.colorHue) }}
                                >
                                    {rankings[2].member.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="text-2xl mt-1">🥉</div>
                                <div className="font-medium text-slate-200 text-sm truncate max-w-full">{rankings[2].member.name}</div>
                                <div className={`text-sm font-bold ${rankings[2].pnlPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                    {formatPercent(rankings[2].pnlPercent, 1)}
                                </div>
                                <div className="bg-gradient-to-t from-orange-700 to-orange-600 w-full h-10 rounded-t-lg mt-2" />
                            </>
                        ) : <div className="h-28" />}
                    </div>
                </div>
            )}

            {/* Full Ranking Table */}
            {hasAnyHoldings && rankings.length > 0 && (
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-100">Full Ranking</h3>
                        <span className="text-xs text-slate-500">Sorted by % return</span>
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-800/50 border-b border-slate-700">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Rank</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Investor</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Cost Basis</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Current Value</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">P/L</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Return</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {rankings.map((entry, index) => {
                                    const rank = index + 1;
                                    const getMedal = (r: number) => {
                                        if (r === 1) return "🥇";
                                        if (r === 2) return "🥈";
                                        if (r === 3) return "🥉";
                                        return `#${r}`;
                                    };

                                    return (
                                        <tr key={entry.member.id} className={`hover:bg-slate-800/30 ${rank <= 3 ? "bg-slate-800/20" : ""}`}>
                                            <td className="px-4 py-3">
                                                <span className={rank <= 3 ? "text-xl" : "text-slate-500 font-bold"}>{getMedal(rank)}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                                                        style={{ backgroundColor: getMemberColor(entry.member.colorHue) }}
                                                    >
                                                        {entry.member.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-100">{entry.member.name}</div>
                                                        <div className="text-xs text-slate-500">{entry.holdingCount} positions</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-300">
                                                {formatCurrency(entry.costBasis, 0)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-slate-100">
                                                {formatCurrency(entry.totalValue, 0)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`font-medium ${entry.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                    {entry.pnl >= 0 ? "+" : ""}{formatCurrency(entry.pnl, 0)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-bold ${entry.pnlPercent >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                                                    }`}>
                                                    {entry.pnlPercent >= 0 ? "▲" : "▼"} {Math.abs(entry.pnlPercent).toFixed(1)}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile List */}
                    <div className="md:hidden divide-y divide-slate-800">
                        {rankings.map((entry, index) => {
                            const rank = index + 1;
                            return (
                                <div key={entry.member.id} className={`p-4 ${rank <= 3 ? "bg-slate-800/20" : ""}`}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 text-center">
                                            {rank === 1 && <span className="text-xl">🥇</span>}
                                            {rank === 2 && <span className="text-xl">🥈</span>}
                                            {rank === 3 && <span className="text-xl">🥉</span>}
                                            {rank > 3 && <span className="text-lg font-bold text-slate-500">#{rank}</span>}
                                        </div>
                                        <div
                                            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                                            style={{ backgroundColor: getMemberColor(entry.member.colorHue) }}
                                        >
                                            {entry.member.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-slate-100">{entry.member.name}</div>
                                            <div className="text-xs text-slate-500">{entry.holdingCount} positions</div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-lg font-bold ${entry.pnlPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                {formatPercent(entry.pnlPercent, 1)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                                            <div className="text-slate-500">Invested</div>
                                            <div className="text-slate-200 font-medium">{formatCurrency(entry.costBasis, 0)}</div>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                                            <div className="text-slate-500">Value</div>
                                            <div className="text-slate-200 font-medium">{formatCurrency(entry.totalValue, 0)}</div>
                                        </div>
                                        <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                                            <div className="text-slate-500">P/L</div>
                                            <div className={`font-medium ${entry.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                {entry.pnl >= 0 ? "+" : ""}{formatCurrency(entry.pnl, 0)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Best & Worst Trades - Always show both side by side */}
            {hasAnyHoldings && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Best Trades - Left */}
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-emerald-500/30 rounded-2xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-800 bg-emerald-500/5">
                            <h3 className="font-semibold text-emerald-400 flex items-center gap-2">
                                <span>🚀</span> Best Trades
                            </h3>
                        </div>
                        {bestTrades.length > 0 ? (
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
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-emerald-400">{formatPercent(trade.pnlPercent, 1)}</div>
                                            <div className="text-xs text-slate-500">+{formatCurrency(trade.pnl, 0)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 text-center text-slate-500">
                                No profitable trades yet
                            </div>
                        )}
                    </div>

                    {/* Worst Trades - Right */}
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-red-500/30 rounded-2xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-800 bg-red-500/5">
                            <h3 className="font-semibold text-red-400 flex items-center gap-2">
                                <span>📉</span> Worst Trades
                            </h3>
                        </div>
                        {worstTrades.length > 0 ? (
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
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-red-400">{formatPercent(trade.pnlPercent, 1)}</div>
                                            <div className="text-xs text-slate-500">{formatCurrency(trade.pnl, 0)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 text-center">
                                <span className="text-2xl">🎉</span>
                                <p className="text-emerald-400 font-medium mt-1">All in the green!</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Quick Stats Grid */}
            {hasAnyHoldings && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4 text-center">
                        <div className="text-3xl mb-1">📊</div>
                        <div className="text-2xl font-bold text-slate-100">{group.holdings.length}</div>
                        <div className="text-xs text-slate-500">Total Positions</div>
                    </div>
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4 text-center">
                        <div className="text-3xl mb-1">👥</div>
                        <div className="text-2xl font-bold text-slate-100">{group.members.length}</div>
                        <div className="text-xs text-slate-500">Investors</div>
                    </div>
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4 text-center">
                        <div className="text-3xl mb-1">✅</div>
                        <div className="text-2xl font-bold text-emerald-400">
                            {allHoldingsWithPnl.filter(h => h.pnlPercent > 0).length}
                        </div>
                        <div className="text-xs text-slate-500">In Green</div>
                    </div>
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4 text-center">
                        <div className="text-3xl mb-1">❌</div>
                        <div className="text-2xl font-bold text-red-400">
                            {allHoldingsWithPnl.filter(h => h.pnlPercent < 0).length}
                        </div>
                        <div className="text-xs text-slate-500">In Red</div>
                    </div>
                </div>
            )}

            {/* No Holdings State */}
            {!hasAnyHoldings && (
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-12 text-center">
                    <div className="text-6xl mb-4">🏁</div>
                    <h3 className="text-xl font-semibold text-slate-200 mb-2">Start the race!</h3>
                    <p className="text-slate-400 max-w-md mx-auto">
                        Add positions to investors to see who leads the ranking.
                    </p>
                </div>
            )}
        </div>
    );
}
