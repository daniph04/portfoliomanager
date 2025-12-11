"use client";

import { useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { PortfolioSnapshot, Season } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/utils";

type TimeRange = "1D" | "1W" | "1M" | "YTD" | "ALL";
type DisplayMode = "season" | "allTime";

interface PerformanceChartProps {
    currentValue: number;
    initialCapital: number; // Used for "All Time" return
    portfolioHistory: PortfolioSnapshot[];
    memberId?: string; // If provided, filters for specific member
    className?: string;
    showControls?: boolean;
    showHeader?: boolean; // Whether to show the value header (set false when embedded)
    // Season-related props
    currentSeason?: Season | null;
    seasonInitialValue?: number; // Portfolio value at season start for this member
    showModeToggle?: boolean; // Whether to show Season/AllTime toggle
}

export default function PerformanceChart({
    currentValue,
    initialCapital,
    portfolioHistory,
    memberId,
    className = "",
    showControls = true,
    showHeader = true,
    currentSeason,
    seasonInitialValue,
    showModeToggle = false,
}: PerformanceChartProps) {
    const [timeRange, setTimeRange] = useState<TimeRange>("1W");
    const [displayMode, setDisplayMode] = useState<DisplayMode>("allTime");
    const [showPercentage, setShowPercentage] = useState(true);

    // Determine the base value for percentage calculations
    const baseValue = useMemo(() => {
        if (displayMode === "season" && seasonInitialValue && seasonInitialValue > 0) {
            return seasonInitialValue;
        }
        return initialCapital;
    }, [displayMode, seasonInitialValue, initialCapital]);

    // Determine cutoff time for data filtering
    const cutoffTime = useMemo(() => {
        const now = new Date();

        // In season mode, always start from season start time
        if (displayMode === "season" && currentSeason?.startTime) {
            return new Date(currentSeason.startTime);
        }

        switch (timeRange) {
            case "1D": return new Date(now.getTime() - 24 * 60 * 60 * 1000);
            case "1W": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            case "1M": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            case "YTD": return new Date(now.getFullYear(), 0, 1); // Jan 1 of current year
            case "ALL": default: return new Date(0);
        }
    }, [timeRange, displayMode, currentSeason?.startTime]);

    // Filter and aggregate history
    const chartData = useMemo(() => {
        const now = new Date();

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
                costBasis: baseValue
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
            costBasis: baseValue,
            memberId: memberId || "group",
            percentChange: baseValue > 0 ? ((currentValue - baseValue) / baseValue) * 100 : 0,
        };

        // If no history, create baseline from baseValue
        if (filtered.length === 0) {
            const startPoint = {
                timestamp: new Date(now.getTime() - 3600000).toISOString(),
                totalValue: baseValue,
                costBasis: baseValue,
                memberId: memberId || "group",
                percentChange: 0,
            };
            return [startPoint, currentPoint];
        }

        // Calculate percentage change for each point relative to base value
        const dataWithPercent = filtered.map(point => ({
            ...point,
            percentChange: baseValue > 0
                ? ((point.totalValue - baseValue) / baseValue) * 100
                : 0,
        }));

        return [...dataWithPercent, currentPoint];
    }, [portfolioHistory, memberId, cutoffTime, currentValue, baseValue]);

    // Calculate variations for display
    const startValue = chartData.length > 0 ? chartData[0].totalValue : baseValue;
    const changeValue = currentValue - startValue;
    const changePercent = startValue > 0 ? (changeValue / startValue) * 100 : 0;
    const isPositive = changeValue >= 0;

    // Total return calculation
    const totalReturn = currentValue - baseValue;
    const totalReturnPercent = baseValue > 0 ? (totalReturn / baseValue) * 100 : 0;
    const isTotalPositive = totalReturn >= 0;

    // Theme colors
    const color = isTotalPositive ? "#10b981" : "#ef4444";

    // Display label for mode
    const modeLabel = displayMode === "season"
        ? (currentSeason?.name || "Season")
        : "All Time";

    return (
        <div className={`w-full ${className}`}>
            {/* Header / Stats - only show if showHeader is true */}
            {showHeader && (
                <div className="mb-4">
                    <div className="text-3xl font-bold text-white tracking-tight">
                        {formatCurrency(currentValue)}
                    </div>
                    <div className={`flex items-center gap-2 text-sm font-medium ${isTotalPositive ? "text-emerald-400" : "text-red-400"}`}>
                        <span>{isTotalPositive ? "▲" : "▼"} {formatCurrency(Math.abs(totalReturn))}</span>
                        <span>({isTotalPositive ? "+" : ""}{formatPercent(totalReturnPercent)})</span>
                        <span className="text-slate-500 font-normal ml-1">{modeLabel}</span>
                    </div>
                </div>
            )}

            {/* Mode Toggle (Season / All Time) */}
            {showModeToggle && currentSeason && (
                <div className="flex gap-1 mb-4">
                    <button
                        onClick={() => setDisplayMode("season")}
                        className={`
                            px-4 py-2 rounded-lg text-xs font-bold transition-all
                            ${displayMode === "season"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/50"
                                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent"
                            }
                        `}
                    >
                        {currentSeason.name || "Season"}
                    </button>
                    <button
                        onClick={() => setDisplayMode("allTime")}
                        className={`
                            px-4 py-2 rounded-lg text-xs font-bold transition-all
                            ${displayMode === "allTime"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent"
                            }
                        `}
                    >
                        All Time
                    </button>
                </div>
            )}

            {/* Chart - proper height with padding to prevent cropping */}
            <div className="h-64 w-full relative" style={{ marginLeft: '-8px', paddingRight: '8px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
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
                            width={55}
                            axisLine={false}
                            tickLine={false}
                        />
                        <XAxis hide={true} />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    const date = new Date(data.timestamp);
                                    const pct = data.percentChange || 0;
                                    return (
                                        <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 p-3 rounded-lg shadow-xl">
                                            <p className="text-slate-400 text-xs mb-1">
                                                {date.toLocaleString(undefined, {
                                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </p>
                                            <p className="text-white font-bold">
                                                {formatCurrency(data.totalValue)}
                                            </p>
                                            <p className={`text-xs font-medium mt-1 ${pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {pct >= 0 ? '+' : ''}{formatPercent(pct)} from {displayMode === "season" ? "season start" : "initial"}
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
                            strokeWidth={2.5}
                            fill="url(#chartGradient)"
                            animationDuration={800}
                        />
                        {/* Zero line reference */}
                        {showPercentage && (
                            <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" strokeWidth={1} />
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Time Controls - more prominent styling */}
            {showControls && displayMode === "allTime" && (
                <div className="flex justify-between items-center mt-4 px-1">
                    <div className="flex gap-1 bg-slate-900/50 rounded-lg p-1">
                        {(["1D", "1W", "1M", "YTD", "ALL"] as TimeRange[]).map((r) => (
                            <button
                                key={r}
                                onClick={() => setTimeRange(r)}
                                className={`
                                    px-3 py-1.5 rounded-md text-xs font-bold transition-all
                                    ${timeRange === r
                                        ? "bg-slate-700 text-white"
                                        : "text-slate-500 hover:text-slate-300"
                                    }
                                `}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setShowPercentage(!showPercentage)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-300 hover:bg-slate-800/50 transition-all border border-slate-700"
                    >
                        {showPercentage ? "%" : "$"}
                    </button>
                </div>
            )}

            {/* In season mode, show note about timeframe */}
            {showControls && displayMode === "season" && currentSeason && (
                <div className="mt-4 px-1 text-xs text-slate-500">
                    Showing performance since {new Date(currentSeason.startTime).toLocaleDateString()}
                </div>
            )}
        </div>
    );
}
