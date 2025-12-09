"use client";

import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface PerformanceChartProps {
    currentValue: number;
    totalCostBasis: number;
    hasHoldings?: boolean;
    className?: string;
}

export default function PerformanceChart({
    currentValue,
    totalCostBasis,
    hasHoldings = false,
    className = ""
}: PerformanceChartProps) {
    const unrealizedPnL = currentValue - totalCostBasis;
    const pnlPercent = totalCostBasis > 0 ? (unrealizedPnL / totalCostBasis) * 100 : 0;
    const isPositive = unrealizedPnL >= 0;

    // Generate smooth curve with multiple points
    const data = useMemo(() => {
        if (!hasHoldings || totalCostBasis === 0) {
            // No holdings - flat line
            return Array.from({ length: 10 }, (_, i) => ({
                label: "",
                value: currentValue,
            }));
        }

        // Generate 20 points for a smooth curve from cost basis to current value
        const numPoints = 20;
        const points = [];
        const totalChange = currentValue - totalCostBasis;

        // Use a seed based on the values for consistent randomness
        const seed = (totalCostBasis * 100 + currentValue) % 1000;
        const pseudoRandom = (i: number) => {
            const x = Math.sin(seed + i * 12.9898) * 43758.5453;
            return x - Math.floor(x);
        };

        for (let i = 0; i < numPoints; i++) {
            const progress = i / (numPoints - 1); // 0 to 1

            // Base value: linear interpolation
            const baseValue = totalCostBasis + (totalChange * progress);

            // Add some realistic volatility that follows the trend
            // More volatility in the middle, less at start and end
            const volatilityFactor = Math.sin(progress * Math.PI) * 0.3; // Max volatility at middle
            const noise = (pseudoRandom(i) - 0.5) * Math.abs(totalChange) * volatilityFactor;

            // Apply easing for smoother curve - slightly ease towards the trend
            const easedProgress = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            const value = totalCostBasis + (totalChange * easedProgress) + noise * 0.3;

            points.push({
                label: i === 0 ? "Inicio" : i === numPoints - 1 ? "Hoy" : "",
                value: Math.max(value, totalCostBasis * 0.8), // Don't go too low
            });
        }

        // Make sure first point is cost basis and last is current value
        points[0].value = totalCostBasis;
        points[numPoints - 1].value = currentValue;

        return points;
    }, [currentValue, totalCostBasis, hasHoldings]);

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
                        <span>{formatCurrencyFull(Math.abs(unrealizedPnL))}</span>
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
            <div className="h-40 sm:h-56 w-full">
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
                            formatter={(value: number) => [formatCurrencyFull(value), "Valor"]}
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
            </div>

            {/* Quick Stats */}
            {hasHoldings && totalCostBasis > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider">Cost Basis</div>
                        <div className="text-lg font-semibold text-slate-300">{formatCurrency(totalCostBasis)}</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider">Valor Actual</div>
                        <div className="text-lg font-semibold text-slate-100">{formatCurrency(currentValue)}</div>
                    </div>
                </div>
            )}
        </div>
    );
}
