"use client";

import { useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { PortfolioSnapshot } from "@/lib/types";

type TimeRange = "1D" | "1W" | "1M" | "1Y" | "ALL";

interface PerformanceChartProps {
    currentValue: number;
    totalCostBasis: number;
    hasHoldings?: boolean;
    className?: string;
    portfolioHistory: PortfolioSnapshot[];
    memberId?: string;
}

export default function PerformanceChart({
    currentValue,
    totalCostBasis,
    hasHoldings = false,
    className = "",
    portfolioHistory,
    memberId,
}: PerformanceChartProps) {
    const [timeRange, setTimeRange] = useState<TimeRange>("1W");

    // Filter history by time range
    const filteredHistory = useMemo(() => {
        if (!portfolioHistory || portfolioHistory.length === 0) return [];

        const now = new Date();
        let cutoffTime: Date;

        switch (timeRange) {
            case "1D":
                cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case "1W":
                cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case "1M":
                cutoffTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case "1Y":
                cutoffTime = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            case "ALL":
            default:
                cutoffTime = new Date(0); // Beginning of time
        }

        if (memberId) {
            // Single member view - filter by member and time
            let filtered = portfolioHistory.filter(s => {
                const snapshotTime = new Date(s.timestamp);
                return s.memberId === memberId && snapshotTime >= cutoffTime;
            });

            // Sort by timestamp
            filtered = filtered.sort((a, b) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );

            return filtered;
        } else {
            // Group view - aggregate all members by timestamp
            const byTimestamp: Record<string, {
                timestamp: string;
                totalValue: number;
                costBasis: number;
                count: number;
            }> = {};

            portfolioHistory.forEach(snapshot => {
                const snapshotTime = new Date(snapshot.timestamp);
                if (snapshotTime < cutoffTime) return;

                // Round to nearest minute for grouping
                const roundedTime = new Date(Math.floor(snapshotTime.getTime() / 60000) * 60000);
                const key = roundedTime.toISOString();

                if (!byTimestamp[key]) {
                    byTimestamp[key] = {
                        timestamp: key,
                        totalValue: 0,
                        costBasis: 0,
                        count: 0,
                    };
                }

                byTimestamp[key].totalValue += snapshot.totalValue;
                byTimestamp[key].costBasis += snapshot.costBasis;
                byTimestamp[key].count += 1;
            });

            // Convert to array and sort
            const aggregated = Object.values(byTimestamp)
                .map(item => ({
                    timestamp: item.timestamp,
                    memberId: "", // Group level
                    totalValue: item.totalValue,
                    costBasis: item.costBasis,
                }))
                .sort((a, b) =>
                    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );

            return aggregated;
        }
    }, [portfolioHistory, timeRange, memberId]);

    // Calculate data for the chart
    const data = useMemo(() => {
        // Always add current value as the last point
        const currentPoint = {
            label: "Now",
            value: currentValue,
            timestamp: new Date().toISOString(),
        };

        if (filteredHistory.length === 0) {
            // No history - show just the current point
            return [currentPoint];
        }

        // Map historical data to chart format
        const historicalData = filteredHistory.map((snapshot, index) => {
            const date = new Date(snapshot.timestamp);
            let label = "";

            // Format label based on time range
            if (timeRange === "1D") {
                label = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
            } else if (timeRange === "1W" || timeRange === "1M") {
                label = date.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
            } else {
                label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            }

            return {
                label: index === 0 ? label : "",  // Only show first label to avoid clutter
                value: snapshot.totalValue,
                timestamp: snapshot.timestamp,
            };
        });

        // Add current value at the end
        return [...historicalData, currentPoint];
    }, [filteredHistory, currentValue, timeRange]);

    // Calculate P&L based on visible range
    const { pnlValue, pnlPercent, isPositive } = useMemo(() => {
        if (data.length <= 1) {
            // No history to compare
            const unrealized = currentValue - totalCostBasis;
            return {
                pnlValue: unrealized,
                pnlPercent: totalCostBasis > 0 ? (unrealized / totalCostBasis) * 100 : 0,
                isPositive: unrealized >= 0,
            };
        }

        // Compare first point to current value
        const startValue = data[0].value;
        const change = currentValue - startValue;
        const percent = startValue > 0 ? (change / startValue) * 100 : 0;

        return {
            pnlValue: change,
            pnlPercent: percent,
            isPositive: change >= 0,
        };
    }, [data, currentValue, totalCostBasis]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    const formatCurrencyFull = (value: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

    const timeRangeButtons: TimeRange[] = ["1D", "1W", "1M", "1Y", "ALL"];

    // Check if we have enough data for each range
    const getDataCount = (range: TimeRange) => {
        if (!portfolioHistory || portfolioHistory.length === 0) return 0;
        const now = new Date();
        let cutoffTime: Date;
        switch (range) {
            case "1D": cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
            case "1W": cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
            case "1M": cutoffTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
            case "1Y": cutoffTime = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
            default: cutoffTime = new Date(0);
        }
        return portfolioHistory.filter(s => {
            const matchesMember = memberId ? s.memberId === memberId : true;
            return matchesMember && new Date(s.timestamp) >= cutoffTime;
        }).length;
    };

    return (
        <div className={`bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 sm:p-6 ${className}`}>
            {/* Value Display */}
            <div className="mb-4">
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1">
                    {formatCurrencyFull(currentValue)}
                </div>
                {hasHoldings && totalCostBasis > 0 ? (
                    <div className={`text-base sm:text-lg font-medium flex flex-wrap items-center gap-1 sm:gap-2 ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                        <span>{isPositive ? "▲" : "▼"}</span>
                        <span>{formatCurrencyFull(Math.abs(pnlValue))}</span>
                        <span>({isPositive ? "+" : ""}{pnlPercent.toFixed(2)}%)</span>
                        <span className="text-slate-500 text-xs sm:text-sm ml-1">
                            {timeRange === "ALL" ? "Total" : timeRange}
                        </span>
                    </div>
                ) : (
                    <div className="text-slate-400 text-sm">
                        No active positions
                    </div>
                )}
            </div>

            {/* Time Range Buttons */}
            <div className="flex gap-1 mb-4">
                {timeRangeButtons.map((range) => {
                    const count = getDataCount(range);
                    return (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${timeRange === range
                                ? "bg-slate-700 text-white"
                                : count > 0
                                    ? "bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300"
                                    : "bg-slate-800/30 text-slate-600 cursor-default"
                                }`}
                            disabled={count === 0 && range !== timeRange}
                        >
                            {range}
                        </button>
                    );
                })}
            </div>

            {/* Chart */}
            <div className="h-40 sm:h-56 w-full">
                {data.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                        <div className="text-center">
                            <div className="mb-2">📊</div>
                            <div>No data yet</div>
                            <div className="text-xs text-slate-600 mt-1">
                                Buy/sell or refresh prices to start tracking
                            </div>
                        </div>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop
                                        offset="5%"
                                        stopColor={isPositive ? "#00C805" : "#ef4444"}
                                        stopOpacity={0.4}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor={isPositive ? "#00C805" : "#ef4444"}
                                        stopOpacity={0}
                                    />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="label"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 11 }}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                hide
                                domain={['dataMin - 10', 'dataMax + 10']}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#1e293b",
                                    border: "1px solid #334155",
                                    borderRadius: "8px",
                                }}
                                formatter={(value: number) => [formatCurrencyFull(value), "Value"]}
                                labelFormatter={(label, payload) => {
                                    if (payload && payload[0]?.payload?.timestamp) {
                                        const date = new Date(payload[0].payload.timestamp);
                                        return date.toLocaleString("en-US", {
                                            weekday: "short",
                                            day: "numeric",
                                            month: "short",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        });
                                    }
                                    return label;
                                }}
                                labelStyle={{ color: "#94a3b8" }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke={isPositive ? "#00C805" : "#ef4444"}
                                strokeWidth={2.5}
                                fill="url(#colorValue)"
                                dot={false}
                                activeDot={{ r: 6, fill: isPositive ? "#00C805" : "#ef4444" }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Quick Stats */}
            {hasHoldings && totalCostBasis > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider">Cost Basis</div>
                        <div className="text-lg font-semibold text-slate-300">{formatCurrency(totalCostBasis)}</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider">Current Value</div>
                        <div className="text-lg font-semibold text-slate-100">{formatCurrency(currentValue)}</div>
                    </div>
                </div>
            )}

            {/* Data Info */}
            <div className="mt-3 text-xs text-slate-600 text-center">
                {filteredHistory.length > 0
                    ? `${filteredHistory.length} data points in this range`
                    : "Snapshots are saved when prices update"
                }
            </div>
        </div>
    );
}
