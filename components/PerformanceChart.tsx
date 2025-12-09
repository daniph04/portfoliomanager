"use client";

import { useState, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type TimeRange = "1D" | "1W" | "1M" | "3M" | "YTD" | "1Y" | "ALL";

interface PerformanceChartProps {
    currentValue: number;
    hasHoldings?: boolean; // If false, show flat line (no volatility)
    className?: string;
}

// Generate mock historical data based on current value
function generateMockData(currentValue: number, range: TimeRange, hasHoldings: boolean) {
    const points: { date: string; value: number; label: string }[] = [];
    let numPoints: number;
    let daysBetween: number;

    switch (range) {
        case "1D":
            numPoints = 24;
            daysBetween = 0;
            break;
        case "1W":
            numPoints = 7;
            daysBetween = 1;
            break;
        case "1M":
            numPoints = 30;
            daysBetween = 1;
            break;
        case "3M":
            numPoints = 12;
            daysBetween = 7;
            break;
        case "YTD":
            numPoints = 12;
            daysBetween = 30;
            break;
        case "1Y":
            numPoints = 12;
            daysBetween = 30;
            break;
        case "ALL":
            numPoints = 24;
            daysBetween = 30;
            break;
        default:
            numPoints = 30;
            daysBetween = 1;
    }

    const now = new Date();
    // Only add volatility if there are actual holdings (investments)
    // If it's just cash, the line should be flat
    const volatility = hasHoldings ? 0.02 : 0; // 2% daily volatility only for holdings
    let value = currentValue;

    // Generate backwards from current value
    for (let i = numPoints - 1; i >= 0; i--) {
        const date = new Date(now);
        if (range === "1D") {
            date.setHours(date.getHours() - i);
        } else {
            date.setDate(date.getDate() - (i * daysBetween));
        }

        // Random walk backwards - only if there are holdings
        if (i < numPoints - 1 && hasHoldings) {
            const change = (Math.random() - 0.48) * volatility * value; // Slight upward bias
            value = value - change;
        }

        let label: string;
        if (range === "1D") {
            label = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } else {
            label = date.toLocaleDateString([], { month: "short", day: "numeric" });
        }

        points.push({
            date: date.toISOString(),
            value: value,
            label,
        });
    }

    // Ensure last point is exactly current value
    points[points.length - 1].value = currentValue;

    return points;
}

export default function PerformanceChart({ currentValue, hasHoldings = false, className = "" }: PerformanceChartProps) {
    const [selectedRange, setSelectedRange] = useState<TimeRange>("1M");
    const [hoveredValue, setHoveredValue] = useState<number | null>(null);

    const data = useMemo(() => generateMockData(currentValue, selectedRange, hasHoldings), [currentValue, selectedRange, hasHoldings]);

    const startValue = data[0]?.value || 0;
    const displayValue = hoveredValue ?? currentValue;
    const change = displayValue - startValue;
    const changePercent = startValue > 0 ? (change / startValue) * 100 : 0;
    const isPositive = change >= 0;

    const timeRanges: TimeRange[] = ["1D", "1W", "1M", "3M", "YTD", "1Y", "ALL"];

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

    return (
        <div className={`bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 ${className}`}>
            {/* Value Display */}
            <div className="mb-4">
                <div className="text-4xl font-bold text-white mb-1">
                    {formatCurrency(displayValue)}
                </div>
                <div className={`text-lg font-medium flex items-center gap-2 ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                    <span>{isPositive ? "▲" : "▼"}</span>
                    <span>{formatCurrency(Math.abs(change))}</span>
                    <span>({isPositive ? "+" : ""}{changePercent.toFixed(2)}%)</span>
                    <span className="text-slate-500 text-sm ml-2">
                        {selectedRange === "1D" ? "Today" : selectedRange}
                    </span>
                </div>
            </div>

            {/* Chart */}
            <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        onMouseMove={(e) => {
                            if (e.activePayload?.[0]) {
                                setHoveredValue(e.activePayload[0].value as number);
                            }
                        }}
                        onMouseLeave={() => setHoveredValue(null)}
                    >
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop
                                    offset="5%"
                                    stopColor={isPositive ? "#00C805" : "#ef4444"}
                                    stopOpacity={0.3}
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
                            hide={true}
                        />
                        <YAxis hide domain={["auto", "auto"]} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#1e293b",
                                border: "1px solid #334155",
                                borderRadius: "8px",
                                color: "#f1f5f9",
                            }}
                            formatter={(value: number) => [formatCurrency(value), "Value"]}
                            labelFormatter={(label) => label}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={isPositive ? "#00C805" : "#ef4444"}
                            strokeWidth={2}
                            fill="url(#colorValue)"
                            animationDuration={500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Time Range Selector */}
            <div className="flex items-center justify-center gap-1 mt-4 bg-slate-800/50 rounded-lg p-1">
                {timeRanges.map((range) => (
                    <button
                        key={range}
                        onClick={() => setSelectedRange(range)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${selectedRange === range
                            ? "bg-slate-700 text-white"
                            : "text-slate-400 hover:text-slate-200"
                            }`}
                    >
                        {range}
                    </button>
                ))}
            </div>
        </div>
    );
}
