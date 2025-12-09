"use client";

import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface PerformanceChartProps {
    currentValue: number;
    totalCostBasis: number; // Sum of all avgBuyPrice * quantity
    hasHoldings?: boolean;
    className?: string;
}

export default function PerformanceChart({
    currentValue,
    totalCostBasis,
    hasHoldings = false,
    className = ""
}: PerformanceChartProps) {
    // Calculate REAL P/L based on actual data
    const unrealizedPnL = currentValue - totalCostBasis;
    const pnlPercent = totalCostBasis > 0 ? (unrealizedPnL / totalCostBasis) * 100 : 0;
    const isPositive = unrealizedPnL >= 0;

    // Generate simple chart data - just a line showing cost basis to current value
    // This is honest - we show what we know: where you started and where you are
    const data = useMemo(() => {
        if (!hasHoldings || totalCostBasis === 0) {
            // No holdings - just show flat line at current value (cash only)
            return [
                { label: "Inicio", value: currentValue },
                { label: "Actual", value: currentValue },
            ];
        }

        // Show trajectory from cost basis to current value
        // This represents the actual P/L journey
        return [
            { label: "Inversión", value: totalCostBasis },
            { label: "Actual", value: currentValue },
        ];
    }, [currentValue, totalCostBasis, hasHoldings]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

    return (
        <div className={`bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 sm:p-6 ${className}`}>
            {/* Value Display */}
            <div className="mb-4">
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1">
                    {formatCurrency(currentValue)}
                </div>
                {hasHoldings && totalCostBasis > 0 ? (
                    <div className={`text-base sm:text-lg font-medium flex flex-wrap items-center gap-1 sm:gap-2 ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                        <span>{isPositive ? "▲" : "▼"}</span>
                        <span>{formatCurrency(Math.abs(unrealizedPnL))}</span>
                        <span>({isPositive ? "+" : ""}{pnlPercent.toFixed(2)}%)</span>
                        <span className="text-slate-500 text-xs sm:text-sm ml-1">
                            P/L no realizado
                        </span>
                    </div>
                ) : (
                    <div className="text-slate-400 text-sm">
                        Sin posiciones activas
                    </div>
                )}
            </div>

            {/* Chart */}
            <div className="h-32 sm:h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
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
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12 }}
                        />
                        <YAxis hide domain={["auto", "auto"]} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#1e293b",
                                border: "1px solid #334155",
                                borderRadius: "8px",
                                color: "#f1f5f9",
                            }}
                            formatter={(value: number) => [formatCurrency(value), "Valor"]}
                            labelFormatter={(label) => label}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={isPositive ? "#00C805" : "#ef4444"}
                            strokeWidth={3}
                            fill="url(#colorValue)"
                            animationDuration={500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Info about the chart */}
            {hasHoldings && totalCostBasis > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <div className="text-slate-500">Costo Base</div>
                            <div className="text-slate-200 font-medium">{formatCurrency(totalCostBasis)}</div>
                        </div>
                        <div>
                            <div className="text-slate-500">Valor Actual</div>
                            <div className="text-slate-200 font-medium">{formatCurrency(currentValue)}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
