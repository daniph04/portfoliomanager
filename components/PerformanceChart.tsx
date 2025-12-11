"use client";

import { useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { PortfolioSnapshot } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/utils";

type TimeRange = "1D" | "1W" | "1M" | "1Y" | "ALL";

interface PerformanceChartProps {
    currentValue: number;
    initialCapital: number; // Used for "ALL" time return
    portfolioHistory: PortfolioSnapshot[];
    memberId?: string; // If provided, filters for specific member
    className?: string;
    showControls?: boolean;
}

export default function PerformanceChart({
    currentValue,
    initialCapital,
    portfolioHistory,
    memberId,
    className = "",
    showControls = true,
}: PerformanceChartProps) {
    const [timeRange, setTimeRange] = useState<TimeRange>("1W");

    // Filter and aggregate history
    const chartData = useMemo(() => {
        const now = new Date();
        let cutoffTime: Date;

        switch (timeRange) {
            case "1D": cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
            case "1W": cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
            case "1M": cutoffTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
            case "1Y": cutoffTime = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
            case "ALL": default: cutoffTime = new Date(0);
        }

        // 1. Filter by member if needed
        let history = memberId
            ? portfolioHistory.filter(s => s.memberId === memberId)
            : portfolioHistory; // usage for group would need pre-aggregated data passed in, or we aggregate here.

        // If memberId is NOT provided, we assume we are given raw snapshots for ALL members and need to aggregate them by time?
        // OR the parent component passes pre-aggregated milestones?
        // Let's assume for GROUP view, the parent passes aggregated snapshots OR `memberId` is undefined and we aggregate here.
        // The implementation in useGroupData records individual snapshots. So we must aggregate here if memberId is missing.

        if (!memberId) {
            // Group aggregation
            // Group snapshots by timestamp (approximate to minute)
            const grouped = new Map<string, number>();
            history.forEach(s => {
                // Round to minute to group concurrent updates
                const timeKey = new Date(s.timestamp).setSeconds(0, 0);
                grouped.set(timeKey.toString(), (grouped.get(timeKey.toString()) || 0) + s.totalValue);
            });

            history = Array.from(grouped.entries()).map(([ts, val]) => ({
                timestamp: new Date(parseInt(ts)).toISOString(),
                totalValue: val,
                memberId: "group",
                costBasis: 0 // Not strictly needed for the chart line
            })).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        } else {
            history = history.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        }

        // 2. Filter by time range
        const filtered = history.filter(s => new Date(s.timestamp) >= cutoffTime);

        // 3. Add current point (live)
        const currentPoint = {
            timestamp: now.toISOString(),
            totalValue: currentValue,
            costBasis: 0,
            memberId: memberId || "group",
        };

        // If no history, just show start -> now flat line
        if (filtered.length === 0) {
            // If ALL, show mostly flat from initial capital
            if (timeRange === "ALL" && initialCapital > 0) {
                return [
                    { ...currentPoint, timestamp: cutoffTime.toISOString(), totalValue: initialCapital },
                    currentPoint
                ];
            }
            // Otherwise just a flat line of current value
            return [
                { ...currentPoint, timestamp: new Date(now.getTime() - 3600000).toISOString() }, // 1h ago
                currentPoint
            ];
        }

        return [...filtered, currentPoint];
    }, [portfolioHistory, memberId, timeRange, currentValue, initialCapital]);

    // Calculate variations for display
    const startValue = chartData.length > 0 ? chartData[0].totalValue : initialCapital;
    const changeValue = currentValue - startValue;
    const changePercent = startValue > 0 ? (changeValue / startValue) * 100 : 0;
    const isPositive = changeValue >= 0;

    // Theme colors
    const color = isPositive ? "#10b981" : "#ef4444"; // emerald-500 : red-500
    // Additional gold accent for high performance could be added later

    return (
        <div className={`w-full ${className}`}>
            {/* Header / Stats */}
            <div className="mb-6">
                <div className="text-3xl font-bold text-white tracking-tight">
                    {formatCurrency(currentValue)}
                </div>
                <div className={`flex items-center gap-2 text-sm font-medium ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                    <span>{isPositive ? "▲" : "▼"} {formatCurrency(Math.abs(changeValue))}</span>
                    <span>({formatPercent(Math.abs(changePercent))})</span>
                    <span className="text-slate-500 font-normal uppercase ml-1">{timeRange === "ALL" ? "All Time" : timeRange}</span>
                </div>
            </div>

            {/* Chart */}
            <div className="h-64 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="chartColor" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    const date = new Date(data.timestamp);
                                    return (
                                        <div className="bg-slate-900 border border-slate-700 p-2 rounded-lg shadow-xl">
                                            <p className="text-slate-400 text-xs mb-1">
                                                {date.toLocaleString(undefined, {
                                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </p>
                                            <p className="text-white font-bold">
                                                {formatCurrency(data.totalValue)}
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="totalValue"
                            stroke={color}
                            strokeWidth={3}
                            fill="url(#chartColor)"
                            animationDuration={1000}
                        />
                        {/* Baseline (Initial Capital) for reference only if ALL */}
                        {timeRange === "ALL" && (
                            <ReferenceLine y={initialCapital} stroke="#334155" strokeDasharray="3 3" />
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Time Controls */}
            {showControls && (
                <div className="flex justify-between mt-4">
                    {(["1D", "1W", "1M", "1Y", "ALL"] as TimeRange[]).map((r) => (
                        <button
                            key={r}
                            onClick={() => setTimeRange(r)}
                            className={`
                                px-4 py-2 rounded-full text-xs font-bold transition-all
                                ${timeRange === r
                                    ? "bg-slate-800 text-white shadow-lg"
                                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                                }
                            `}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
