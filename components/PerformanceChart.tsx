"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PerformancePoint } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { MetricsMode } from "@/lib/portfolioMath";

type Timeframe = "1D" | "1W" | "1M" | "YTD" | "ALL";

interface PerformanceChartProps {
    points: PerformancePoint[];
    baseline: number;
    mode: MetricsMode;
    startTime?: number;
    className?: string;
    height?: number;
    showHeader?: boolean;
    showControls?: boolean;
    initialTimeframe?: Timeframe;
    onTimeframeChange?: (value: Timeframe) => void;
}

export default function PerformanceChart({
    points,
    baseline,
    mode,
    startTime,
    className = "",
    height = 280,
    showHeader = false,
    showControls = true,
    initialTimeframe = "1M",
    onTimeframeChange,
}: PerformanceChartProps) {
    const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe);
    const [showPercentage, setShowPercentage] = useState(true);

    const cutoff = useMemo(() => {
        const now = Date.now();
        switch (timeframe) {
            case "1D": return now - 24 * 60 * 60 * 1000;
            case "1W": return now - 7 * 24 * 60 * 60 * 1000;
            case "1M": return now - 30 * 24 * 60 * 60 * 1000;
            case "YTD": {
                const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
                return yearStart;
            }
            case "ALL":
            default:
                return 0;
        }
    }, [timeframe]);

    const series = useMemo(() => {
        const sorted = [...points].sort((a, b) => a.timestamp - b.timestamp);
        const latestValue = sorted[sorted.length - 1]?.value ?? baseline;
        const nowPoint = { timestamp: Date.now(), value: latestValue, scope: "user" as const, entityId: "" };
        const working = [...sorted, nowPoint];

        const filtered = working.filter(p => {
            const meetsTimeframe = p.timestamp >= cutoff;
            const meetsStart = startTime ? p.timestamp >= startTime : true;
            return meetsTimeframe && meetsStart;
        });

        let base = baseline;
        if (mode === "season" && startTime) {
            const anchor = working.find(p => p.timestamp >= startTime) || working[working.length - 1];
            if (anchor) base = anchor.value;
        } else if (filtered.length > 0) {
            base = filtered[0].value;
        }

        const safeBase = base > 0 ? base : latestValue || 1;

        let normalized = filtered.length > 0 ? filtered : [{ timestamp: Date.now(), value: safeBase, scope: "user", entityId: "" }];
        if (normalized.length === 1) {
            normalized = [
                normalized[0],
                { ...normalized[0], timestamp: normalized[0].timestamp + 1000 },
            ];
        }

        return normalized.map(point => ({
            timestamp: point.timestamp,
            value: point.value,
            pct: ((point.value - safeBase) / safeBase) * 100,
        }));
    }, [points, baseline, cutoff, mode, startTime]);

    const latest = series[series.length - 1] || { value: baseline, pct: 0, timestamp: Date.now() };
    const first = series[0] || latest;
    const changeValue = latest.value - first.value;
    const changePct = first.value !== 0 ? (changeValue / first.value) * 100 : 0;
    const totalReturn = latest.value - baseline;
    const totalReturnPct = baseline !== 0 ? (totalReturn / baseline) * 100 : 0;
    const isPositive = totalReturn >= 0;
    const color = isPositive ? "#10b981" : "#ef4444";

    const handleTimeframe = (tf: Timeframe) => {
        setTimeframe(tf);
        onTimeframeChange?.(tf);
    };

    return (
        <div className={`w-full ${className}`}>
            {showHeader && (
                <div className="mb-3">
                    <div className="text-2xl font-bold text-white">{formatCurrency(latest.value)}</div>
                    <div className={`text-sm font-medium flex items-center gap-2 ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                        <span>{isPositive ? "▲" : "▼"} {formatCurrency(Math.abs(totalReturn))}</span>
                        <span>({isPositive ? "+" : ""}{formatPercent(totalReturnPct)})</span>
                    </div>
                </div>
            )}

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
                                onClick={() => handleTimeframe(tf)}
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
