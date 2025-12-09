"use client";

import { GroupState } from "@/lib/types";
import { sortMembersByPerformance, formatCurrency, formatPercent, getMemberColor } from "@/lib/utils";

interface LeaderboardTabProps {
    group: GroupState;
}

export default function LeaderboardTab({ group }: LeaderboardTabProps) {
    // Calculate rankings sorted by P/L%
    const rankings = sortMembersByPerformance(group);

    // Empty state
    if (group.members.length === 0) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-100">Leaderboard</h2>
                    <p className="text-slate-400 mt-1">Performance rankings across all investors</p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-12 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                        <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-slate-200 mb-2">No investors to rank</h3>
                    <p className="text-slate-400 max-w-md mx-auto">
                        Add investors using the sidebar to see performance rankings.
                    </p>
                </div>
            </div>
        );
    }

    // Check if anyone has holdings
    const hasAnyHoldings = group.holdings.length > 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-100">Leaderboard</h2>
                <p className="text-slate-400 mt-1">Performance rankings across all investors</p>
            </div>

            {/* Leaderboard Table */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800">
                    <h3 className="text-lg font-semibold text-slate-100">Performance Ranking</h3>
                    <p className="text-sm text-slate-400 mt-1">Sorted by return percentage (unrealized P/L %)</p>
                </div>

                {!hasAnyHoldings ? (
                    <div className="p-12 text-center">
                        <div className="text-slate-500 text-lg mb-2">No holdings to rank</div>
                        <div className="text-slate-600 text-sm">
                            Add holdings to your investors to see the leaderboard
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-800/50 border-b border-slate-700">
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-20">
                                        Rank
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                        Investor
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                        Portfolio Value
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                        Unrealized P/L
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                        Return %
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {rankings.map((entry, index) => {
                                    const memberColor = getMemberColor(entry.member.colorHue);
                                    const rank = index + 1;

                                    // Medal for top 3
                                    const getMedalBadge = (r: number) => {
                                        if (r === 1) return { emoji: "🥇", bg: "bg-amber-500/10", border: "border-amber-500/30" };
                                        if (r === 2) return { emoji: "🥈", bg: "bg-slate-400/10", border: "border-slate-400/30" };
                                        if (r === 3) return { emoji: "🥉", bg: "bg-orange-500/10", border: "border-orange-500/30" };
                                        return null;
                                    };
                                    const medal = getMedalBadge(rank);

                                    return (
                                        <tr
                                            key={entry.member.id}
                                            className={`hover:bg-slate-800/30 transition-colors ${medal ? medal.bg : ""}`}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    {medal ? (
                                                        <span className="text-2xl">{medal.emoji}</span>
                                                    ) : (
                                                        <span className="text-lg font-bold text-slate-400 w-8 text-center">
                                                            #{rank}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                                                        style={{ backgroundColor: memberColor }}
                                                    >
                                                        {entry.member.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-100">{entry.member.name}</div>
                                                        <div className="text-xs text-slate-500">
                                                            {entry.holdingCount} holding{entry.holdingCount !== 1 ? "s" : ""}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="font-medium text-slate-100">
                                                    {formatCurrency(entry.totalValue)}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    Cost: {formatCurrency(entry.costBasis)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className={`font-medium ${entry.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                    {entry.pnl >= 0 ? "+" : ""}{formatCurrency(entry.pnl)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${entry.pnlPercent >= 0
                                                        ? "bg-emerald-500/20 text-emerald-400"
                                                        : "bg-red-500/20 text-red-400"
                                                    }`}>
                                                    {entry.pnlPercent >= 0 ? "▲" : "▼"}
                                                    {formatPercent(entry.pnlPercent, 1).replace("+", "")}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Stats Summary */}
            {hasAnyHoldings && rankings.length > 1 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Top Performer</div>
                        <div className="flex items-center gap-2">
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                                style={{ backgroundColor: getMemberColor(rankings[0].member.colorHue) }}
                            >
                                {rankings[0].member.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="font-medium text-slate-100">{rankings[0].member.name}</div>
                                <div className="text-sm text-emerald-400">{formatPercent(rankings[0].pnlPercent)}</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Biggest Portfolio</div>
                        {(() => {
                            const biggestPortfolio = [...rankings].sort((a, b) => b.totalValue - a.totalValue)[0];
                            return (
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                                        style={{ backgroundColor: getMemberColor(biggestPortfolio.member.colorHue) }}
                                    >
                                        {biggestPortfolio.member.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-100">{biggestPortfolio.member.name}</div>
                                        <div className="text-sm text-slate-400">{formatCurrency(biggestPortfolio.totalValue)}</div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Group Average</div>
                        <div className="text-2xl font-bold text-slate-100">
                            {formatPercent(
                                rankings.reduce((sum, r) => sum + r.pnlPercent, 0) / rankings.length
                            )}
                        </div>
                        <div className="text-xs text-slate-500">average return</div>
                    </div>
                </div>
            )}
        </div>
    );
}
