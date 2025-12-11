"use client";

import { useMemo, useState } from "react";
import { GroupState, Holding, Season } from "@/lib/types";
import { formatCurrency, formatPercent, getMemberColor, getHoldingPnlPercent, getHoldingPnl, getTotalCostBasis, getTotalPortfolioValue } from "@/lib/utils";
import { getMetricsForMode, MetricsMode } from "@/lib/portfolioMath";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

type RankingMode = "season" | "allTime";
type Timeframe = "1W" | "1M" | "YTD" | "ALL";

interface LeaderboardTabProps {
    group: GroupState;
    currentSeason?: Season | null;
    isLeader?: boolean;
    onStartSeason?: () => void;
    onEndSeason?: () => void;
}

export default function LeaderboardTab({
    group,
    isLeader = false,
    onStartSeason,
    onEndSeason,
}: LeaderboardTabProps) {
    const [rankingMode, setRankingMode] = useState<RankingMode>("allTime");
    const [chartTimeframe, setChartTimeframe] = useState<Timeframe>("1M");

    // Derive current season from group state
    const currentSeason = group.currentSeasonId && group.seasons.find(s => s.id === group.currentSeasonId) || null;

    const rankings = useMemo(() => {
        return group.members.map(member => {
            const metrics = getMetricsForMode(
                member,
                group.holdings,
                currentSeason || null,
                rankingMode,
                group.portfolioHistory
            );
            const memberHoldings = group.holdings.filter(h => h.memberId === member.id);
            const costBasis = getTotalCostBasis(memberHoldings);
            return {
                member,
                totalValue: metrics.currentValue,
                costBasis,
                baseline: metrics.baseline,
                pnl: metrics.plAbs,
                pnlPercent: metrics.plPct,
                holdingCount: memberHoldings.length,
            };
        }).sort((a, b) => b.pnlPercent - a.pnlPercent);
    }, [group.members, group.holdings, group.portfolioHistory, currentSeason, rankingMode]);

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
    const totalGroupPnl = rankings.reduce((sum, r) => sum + r.pnl, 0);
    const avgReturn = rankings.length > 0 ? rankings.reduce((sum, r) => sum + r.pnlPercent, 0) / rankings.length : 0;

    // Generate race chart data from snapshots with timeframe + mode baselines
    const raceData = useMemo(() => {
        if (rankings.length === 0) return [];
        const now = Date.now();
        const cutoff = (() => {
            switch (chartTimeframe) {
                case "1W": return now - 7 * 24 * 60 * 60 * 1000;
                case "1M": return now - 30 * 24 * 60 * 60 * 1000;
                case "YTD": return new Date(new Date().getFullYear(), 0, 1).getTime();
                case "ALL":
                default: return 0;
            }
        })();

        const memberSeries = rankings.map(entry => {
            const snapshots = group.portfolioHistory
                .filter(s => (s.entityId || s.memberId) === entry.member.id)
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                .map(s => ({
                    timestamp: typeof s.timestamp === "string" ? new Date(s.timestamp).getTime() : s.timestamp,
                    value: s.totalCurrentValue ?? s.totalValue,
                }));

            const filtered = snapshots.filter(p => p.timestamp >= cutoff);
            const working = filtered.length > 0 ? filtered : snapshots;
            const fallbackPoint = working[0] ?? { timestamp: now, value: entry.baseline };

            const baseCandidate = rankingMode === "season"
                ? entry.baseline
                : working[0]?.value ?? entry.baseline;
            const base = baseCandidate && baseCandidate > 0 ? baseCandidate : fallbackPoint.value || 1;

            const series = (working.length > 0 ? working : [fallbackPoint]).map(p => ({
                timestamp: p.timestamp,
                pct: base > 0 ? ((p.value - base) / base) * 100 : 0,
            }));

            if (series.length === 1) {
                series.push({ timestamp: series[0].timestamp + 1000, pct: series[0].pct });
            }

            return { member: entry.member, series };
        });

        const timestamps = Array.from(new Set(memberSeries.flatMap(m => m.series.map(p => p.timestamp)))).sort((a, b) => a - b);
        const lastSeen: Record<string, number> = {};

        const data = timestamps.map(ts => {
            const row: Record<string, number | string> = {
                name: new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
            };
            memberSeries.forEach(ms => {
                const hit = ms.series.find(p => p.timestamp === ts);
                if (hit) {
                    lastSeen[ms.member.id] = hit.pct;
                }
                row[ms.member.name] = lastSeen[ms.member.id] ?? 0;
            });
            return row;
        });

        if (data.length === 0) {
            return [
                { name: "Start", ...Object.fromEntries(rankings.map(r => [r.member.name, 0])) },
                { name: "Today", ...Object.fromEntries(rankings.map(r => [r.member.name, r.pnlPercent])) }
            ];
        }

        return data;
    }, [rankings, group.portfolioHistory, chartTimeframe, rankingMode]);

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
        <div className="space-y-6 animate-fade-in">
            {/* Header Stats - Premium */}
            <div className="card-premium rounded-2xl p-6 border-t-2 border-amber-500/50">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <span className="text-5xl">🏆</span>
                            <div className="absolute inset-0 blur-xl bg-amber-400/30 -z-10" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold gradient-text">Leaderboard</h2>
                            <p className="text-slate-400">{group.members.length} investors competing</p>
                        </div>
                    </div>

                    {/* Season Controls - visible to leader */}
                    <div className="flex items-center gap-3">
                        {/* Mode Toggle */}
                        <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1">
                            <button
                                onClick={() => setRankingMode("allTime")}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${rankingMode === "allTime"
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "text-slate-500 hover:text-slate-300"
                                    }`}
                            >
                                All Time
                            </button>
                            <button
                                onClick={() => currentSeason && setRankingMode("season")}
                                disabled={!currentSeason}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${rankingMode === "season"
                                    ? "bg-amber-500/20 text-amber-400"
                                    : "text-slate-500 hover:text-slate-300"
                                    } ${!currentSeason ? "opacity-40 cursor-not-allowed" : ""}`}
                            >
                                Season
                            </button>
                        </div>

                        {currentSeason && (
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-semibold">
                                <span className="text-[10px] uppercase tracking-wide">Active</span>
                                <span>{currentSeason.name}</span>
                            </div>
                        )}

                        {/* Start/End Season Button - only for leader */}
                        {isLeader && !currentSeason && onStartSeason && (
                            <button
                                onClick={onStartSeason}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-bold text-sm hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg"
                            >
                                <span>🚀</span>
                                Start Season
                            </button>
                        )}
                        {isLeader && currentSeason && onEndSeason && (
                            <button
                                onClick={onEndSeason}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg font-medium text-sm hover:bg-slate-600 transition-all"
                            >
                                End Season
                            </button>
                        )}
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
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                            <span>🏁</span> Performance Race
                            <span className="text-xs font-normal text-slate-500 ml-2">· Leader in bold</span>
                        </h3>
                        <div className="flex gap-1 bg-slate-800/60 rounded-lg p-1">
                            {(["1W", "1M", "YTD", "ALL"] as Timeframe[]).map(tf => (
                                <button
                                    key={tf}
                                    onClick={() => setChartTimeframe(tf)}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${chartTimeframe === tf ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}
                                >
                                    {tf}
                                </button>
                            ))}
                        </div>
                    </div>
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
                                {rankings.map((entry, idx) => {
                                    const isLeader = idx === 0;
                                    return (
                                        <Line
                                            key={entry.member.id}
                                            type="monotone"
                                            dataKey={entry.member.name}
                                            stroke={isLeader ? "#f59e0b" : getMemberColor(entry.member.colorHue)}
                                            strokeWidth={isLeader ? 4 : 2}
                                            dot={{ r: isLeader ? 6 : 4, fill: isLeader ? "#f59e0b" : getMemberColor(entry.member.colorHue) }}
                                            activeDot={{ r: isLeader ? 10 : 6 }}
                                            style={isLeader ? { filter: "drop-shadow(0 0 4px rgba(245, 158, 11, 0.5))" } : undefined}
                                        />
                                    );
                                })}
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
