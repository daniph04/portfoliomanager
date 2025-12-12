"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MetricsMode } from "@/lib/portfolioMath";
import { PerformanceScope, PortfolioSnapshot } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/utils";

export type Timeframe = "1D" | "1W" | "1M" | "YTD" | "ALL";

interface PerformanceChartProps {
    snapshots: PortfolioSnapshot[];
    scope: PerformanceScope;
    entityId: string;
    timeframe: Timeframe;
    mode: MetricsMode;
    seasonBaseline?: number;
    seasonStart?: number;
    className?: string;
    height?: number;
    showControls?: boolean;
    onTimeframeChange?: (value: Timeframe) => void;
}

export default function PerformanceChart({
    snapshots,
    scope,
    entityId,
    timeframe,
    mode,
    seasonBaseline,
    seasonStart,
    className = "",
    height = 220, // Reduced from 280 to leave room for controls below
    showControls = false,
    onTimeframeChange,
}: PerformanceChartProps) {
    const [showPercentage, setShowPercentage] = useState(true);

    const cutoff = useMemo(() => {
        const now = Date.now();
        switch (timeframe) {
            case "1D": return now - 24 * 60 * 60 * 1000;
            case "1W": return now - 7 * 24 * 60 * 60 * 1000;
            case "1M": return now - 30 * 24 * 60 * 60 * 1000;
            case "YTD": return new Date(new Date().getFullYear(), 0, 1).getTime();
            case "ALL":
            default:
                return 0;
        }
    }, [timeframe]);

    const series = useMemo(() => {
        const normalized = snapshots
            .filter(s => (s.scope || "user") === scope && (s.entityId || s.memberId) === entityId)
            .map(s => ({
                timestamp: typeof s.timestamp === "string" ? new Date(s.timestamp).getTime() : s.timestamp,
                value: s.totalCurrentValue ?? s.totalValue,
                costBasis: s.costBasis,
            }))
            .sort((a, b) => a.timestamp - b.timestamp);

        const filtered = normalized.filter(p => p.timestamp >= cutoff);
        const working = filtered.length > 0 ? filtered : normalized;

        // ROUND 5 FIX: Detect empty/neutral state
        // Don't show scary -100% red line for portfolios with no meaningful data
        const hasNoMeaningfulData = (
            working.length === 0 ||
            (mode === "allTime" && (seasonBaseline ?? 0) < 1 && working.every(p => p.value === 0)) ||
            (mode === "season" && (seasonBaseline ?? 0) < 1)
        );

        if (hasNoMeaningfulData) {
            // Return neutral flat line at 0%
            const now = Date.now();
            return [
                { timestamp: now - 86400000, value: 0, pct: 0 }, // Yesterday
                { timestamp: now, value: 0, pct: 0 }, // Now
            ];
        }

        // Determine base value (season baseline or first point)
        let baseValue: number | undefined;
        if (mode === "season") {
            if (seasonBaseline !== undefined) {
                baseValue = seasonBaseline;
            } else if (seasonStart) {
                const anchor = working.find(p => p.timestamp >= seasonStart);
                baseValue = anchor?.value ?? working[0]?.value;
            }
        }
        if (baseValue === undefined) {
            baseValue = working[0]?.value ?? 0;
        }

        let data = working.length > 0 ? working : [{
            timestamp: Date.now(),
            value: baseValue,
            costBasis: baseValue,
        }];

        if (data.length === 1) {
            data = [
                data[0],
                { ...data[0], timestamp: data[0].timestamp + 1000 },
            ];
        }

        // Use safePlPct logic: if baseline too small, return 0% (not division by zero)
        const safeBase = baseValue > 1 ? baseValue : undefined;

        return data.map(point => ({
            timestamp: point.timestamp,
            value: point.value,
            pct: safeBase ? ((point.value - safeBase) / safeBase) * 100 : 0,
        }));
    }, [snapshots, scope, entityId, cutoff, mode, seasonBaseline, seasonStart]);

    const latest = series[series.length - 1] || { value: 0, pct: 0, timestamp: Date.now() };
    const first = series[0] || latest;
    const changeValue = latest.value - first.value;
    const changePct = first.value !== 0 ? (changeValue / first.value) * 100 : 0;
    const isPositive = changeValue >= 0;
    const color = isPositive ? "#10b981" : "#ef4444";

    return (
        <div className={`w-full ${className}`}>
            <div className="w-full" style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={series}
                        margin={{ top: 20, right: 16, left: 0, bottom: 12 }}
                    >
                        <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="timestamp"
                            type="number"
                            scale="time"
                            domain={['auto', 'auto']}
                            hide
                        />
                        <YAxis
                            dataKey={showPercentage ? "pct" : "value"}
                            domain={['auto', 'auto']}
                            tickFormatter={(value) => showPercentage ? `${value.toFixed(1)}%` : formatCurrency(value, 0)}
                            width={showPercentage ? 60 : 70}
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload as any;
                                    return (
                                        <div className="bg-slate-900/95 border border-slate-700 px-3 py-2 rounded-lg text-xs">
                                            <div className="text-slate-400">
                                                {new Date(data.timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                            </div>
                                            <div className="text-white font-semibold">{formatCurrency(data.value)}</div>
                                            <div className={`${data.pct >= 0 ? "text-emerald-400" : "text-red-400"} font-medium`}>
                                                {data.pct >= 0 ? "+" : ""}{formatPercent(data.pct)}
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey={showPercentage ? "pct" : "value"}
                            stroke={color}
                            strokeWidth={2.5}
                            fill="url(#chartGradient)"
                            animationDuration={400}
                            isAnimationActive={series.length < 100}
                        />
                        {showPercentage && (
                            <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" strokeWidth={1} />
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {showControls && (
                <div className="flex items-center justify-between mt-4">
                    <div className="flex gap-1 bg-slate-900/60 border border-slate-800 rounded-lg p-1">
                        {(["1D", "1W", "1M", "YTD", "ALL"] as Timeframe[]).map(tf => (
                            <button
                                key={tf}
                                onClick={() => onTimeframeChange?.(tf)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${timeframe === tf ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setShowPercentage(!showPercentage)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300 hover:text-white transition-colors"
                    >
                        {showPercentage ? "% view" : "$ view"}
                    </button>
                </div>
            )}

            <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
                <span>{mode === "season" ? "Season performance" : "All-time performance"}</span>
                <span>·</span>
                <span>{formatCurrency(changeValue)} ({formatPercent(changePct)}) {changeValue >= 0 ? "up" : "down"} in range</span>
            </div>
        </div>
    );
}
