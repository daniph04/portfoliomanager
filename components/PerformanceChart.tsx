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
    const [showPercentage, setShowPercentage] = useState(true);

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
            : portfolioHistory;

        if (!memberId) {
            // Group aggregation - sum all members' values at each timestamp
            const grouped = new Map<string, number>();
            history.forEach(s => {
                const timeKey = new Date(s.timestamp).setSeconds(0, 0);
                grouped.set(timeKey.toString(), (grouped.get(timeKey.toString()) || 0) + s.totalValue);
            });

            history = Array.from(grouped.entries()).map(([ts, val]) => ({
                timestamp: new Date(parseInt(ts)).toISOString(),
                totalValue: val,
                memberId: "group",
                costBasis: initialCapital // Use group initial capital
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
            costBasis: initialCapital,
            memberId: memberId || "group",
            percentChange: initialCapital > 0 ? ((currentValue - initialCapital) / initialCapital) * 100 : 0,
        };

        // If no history, create baseline
        if (filtered.length === 0) {
            const startPoint = {
                timestamp: new Date(now.getTime() - 3600000).toISOString(),
                totalValue: initialCapital,
                costBasis: initialCapital,
                memberId: memberId || "group",
                percentChange: 0,
            };
            return [startPoint, currentPoint];
        }

        // Calculate percentage change for each point relative to initial capital
        const dataWithPercent = filtered.map(point => ({
            ...point,
            percentChange: initialCapital > 0
                ? ((point.totalValue - initialCapital) / initialCapital) * 100
                : 0,
        }));

        return [...dataWithPercent, currentPoint];
    }, [portfolioHistory, memberId, timeRange, currentValue, initialCapital]);

    // Calculate variations for display (based on time range, not all-time)
    const startValue = chartData.length > 0 ? chartData[0].totalValue : initialCapital;
    const changeValue = currentValue - startValue;
    const changePercent = startValue > 0 ? (changeValue / startValue) * 100 : 0;
    const isPositive = changeValue >= 0;

    // Total return from initial capital
    const totalReturn = currentValue - initialCapital;
    const totalReturnPercent = initialCapital > 0 ? (totalReturn / initialCapital) * 100 : 0;

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
                        <YAxis
                            hide={false}
                            domain={['auto', 'auto']}
                            tickFormatter={(value) => showPercentage
                                ? `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
                                : formatCurrency(value, 0)
                            }
                            stroke="#64748b"
                            style={{ fontSize: '11px' }}
                            width={50}
                        />
                        <XAxis hide={true} />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    const date = new Date(data.timestamp);
                                    const pct = data.percentChange || 0;
                                    return (
                                        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
                                            <p className="text-slate-400 text-xs mb-1">
                                                {date.toLocaleString(undefined, {
                                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </p>
                                            <p className="text-white font-bold">
                                                {formatCurrency(data.totalValue)}
                                            </p>
                                            <p className={`text-xs font-medium mt-1 ${pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {pct >= 0 ? '+' : ''}{formatPercent(pct)} from start
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey={showPercentage ? "percentChange" : "totalValue"}
                            stroke={color}
                            strokeWidth={3}
                            fill="url(#chartColor)"
                            animationDuration={1000}
                        />
                        {/* Zero line reference */}
                        {showPercentage && (
                            <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" strokeWidth={1} />
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Time Controls */}
            {showControls && (
                <div className="flex justify-between items-center mt-4">
                    <div className="flex gap-1">
                        {(["1D", "1W", "1M", "1Y"] as TimeRange[]).map((r) => (
                            <button
                                key={r}
                                onClick={() => setTimeRange(r)}
                                className={`
                                    px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                                    ${timeRange === r
                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                                    }
                                `}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setShowPercentage(!showPercentage)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-300 hover:bg-slate-800/50 transition-all"
                    >
                        {showPercentage ? "%" : "$"}
                    </button>
                </div>
            )}
        </div>
    );
}
