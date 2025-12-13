"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MetricsMode } from "@/lib/portfolioMath";
import { PerformanceScope, PortfolioSnapshot } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/utils";

export type Timeframe = "LIVE" | "1D" | "1W" | "1M" | "3M" | "YTD" | "ALL";

const MINUTES = 60 * 1000;
const HOURS = 60 * MINUTES;
const DAYS = 24 * HOURS;

const TIMEFRAME_CONFIG: Record<Timeframe, { bucket: number; start: (now: number, firstPoint: number) => number }> = {
    LIVE: {
        bucket: 5 * MINUTES,
        start: (now) => now - (6 * HOURS), // rolling intraday view
    },
    "1D": {
        bucket: 5 * MINUTES,
        start: (now) => now - DAYS,
    },
    "1W": {
        bucket: HOURS,
        start: (now) => now - (7 * DAYS),
    },
    "1M": {
        bucket: HOURS,
        start: (now) => now - (30 * DAYS),
    },
    "3M": {
        bucket: DAYS,
        start: (now) => now - (90 * DAYS),
    },
    "YTD": {
        bucket: DAYS,
        start: (now) => new Date(new Date(now).getFullYear(), 0, 1).getTime(),
    },
    "ALL": {
        bucket: DAYS,
        start: (_now, firstPoint) => firstPoint || 0,
    },
};

type Point = { timestamp: number; value: number };

function bucketize(points: Point[], bucketSize: number): Point[] {
    const buckets = new Map<number, Point>();

    points.forEach(p => {
        const bucketStart = Math.floor(p.timestamp / bucketSize) * bucketSize;
        const existing = buckets.get(bucketStart);
        if (!existing || p.timestamp > existing.timestamp) {
            buckets.set(bucketStart, { timestamp: bucketStart, value: p.value });
        }
    });

    return Array.from(buckets.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([timestamp, point]) => ({ ...point, timestamp }));
}

interface PerformanceChartProps {
    snapshots: PortfolioSnapshot[];
    scope: PerformanceScope;
    entityId: string;
    timeframe: Timeframe;
    mode: MetricsMode;
    netDeposits: number;  // Initial investment - baseline for % calculations
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
    netDeposits,
    seasonBaseline,
    seasonStart,
    className = "",
    height = 220, // Reduced from 280 to leave room for controls below
    showControls = false,
    onTimeframeChange,
}: PerformanceChartProps) {
    const [showPercentage, setShowPercentage] = useState(true);
    const [nowTick, setNowTick] = useState(() => Date.now());

    // Keep "now" fresh so LIVE/1D feel like they build over time
    useEffect(() => {
        const id = setInterval(() => setNowTick(Date.now()), 60 * 1000);
        return () => clearInterval(id);
    }, []);

    const { series, rangeStart, rangeEnd } = useMemo(() => {
        const now = nowTick;
        const config = TIMEFRAME_CONFIG[timeframe];

        const normalized = snapshots
            .filter(s => (s.scope || "user") === scope && (s.entityId || s.memberId) === entityId)
            .map(s => ({
                timestamp: typeof s.timestamp === "string" ? new Date(s.timestamp).getTime() : s.timestamp,
                value: s.totalCurrentValue ?? s.totalValue,
                costBasis: s.costBasis,
            }))
            .sort((a, b) => a.timestamp - b.timestamp);

        const firstPointTs = normalized[0]?.timestamp ?? now;
        const start = config.start(now, firstPointTs);
        const alignedStart = Math.floor(start / config.bucket) * config.bucket;

        // Determine baseline value
        const baseValue = mode === "season"
            ? (seasonBaseline ?? netDeposits)
            : netDeposits;

        // Build working set within timeframe, starting at baseline so the line begins at "deposit" level
        const filtered = normalized.filter(p => p.timestamp >= alignedStart);
        const working: Point[] = [
            { timestamp: alignedStart, value: baseValue },
            ...filtered.map(p => ({ timestamp: p.timestamp, value: p.value })),
        ];

        const lastPoint = working[working.length - 1];
        if (lastPoint) {
            // Make sure we always have a point at "now" so the chart ends at the present
            if (now > lastPoint.timestamp) {
                working.push({ timestamp: now, value: lastPoint.value });
            }
        } else {
            // No history at all, seed with baseline
            working.push({ timestamp: now, value: baseValue });
        }

        const bucketed = bucketize(working, config.bucket);

        // If only one point, duplicate to allow Recharts to render an area
        if (bucketed.length === 1) {
            bucketed.push({ ...bucketed[0], timestamp: bucketed[0].timestamp + config.bucket });
        }

        const seriesWithPct = bucketed.map(point => ({
            timestamp: point.timestamp,
            value: point.value,
            pct: baseValue > 0
                ? ((point.value - baseValue) / baseValue) * 100
                : 0,
        }));

        return { series: seriesWithPct, rangeStart: alignedStart, rangeEnd: now };
    }, [snapshots, scope, entityId, timeframe, mode, netDeposits, seasonBaseline, nowTick]);

    const latest = series[series.length - 1] || { value: 0, pct: 0, timestamp: Date.now() };
    const first = series[0] || latest;
    const changeValue = latest.value - first.value;
    const changePct = first.value !== 0 ? (changeValue / first.value) * 100 : 0;
    const isPositive = changeValue >= 0;
    const color = isPositive ? "#10b981" : "#ef4444";

    const formatTimestamp = (timestamp: number) => {
        if (timeframe === "LIVE" || timeframe === "1D") {
            return new Date(timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
        }
        if (timeframe === "1W" || timeframe === "1M") {
            return new Date(timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit" });
        }
        return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    };

    return (
        <div className={`w-full ${className}`}>
            <div className="w-full" style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={series}
                        margin={{ top: 20, right: 16, left: 0, bottom: 12 }}
                        syncId={`${entityId}-${scope}`}
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
                            domain={[rangeStart, rangeEnd]}
                            hide
                        />
                        <YAxis
                            dataKey={showPercentage ? "pct" : "value"}
                            domain={['auto', 'auto']}
                            hide
                        />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload as any;
                                    return (
                                        <div className="bg-slate-900/95 border border-slate-700 px-3 py-2 rounded-lg text-xs">
                                            <div className="text-slate-400">{formatTimestamp(data.timestamp)}</div>
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
                            animationDuration={300}
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
                        {(["LIVE", "1D", "1W", "1M", "3M", "YTD", "ALL"] as Timeframe[]).map(tf => (
                            <button
                                key={tf}
                                onClick={() => onTimeframeChange?.(tf)}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${timeframe === tf ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"} ${tf === "LIVE" ? "uppercase" : ""}`}
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
