"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from "recharts";
import { useState, useCallback } from "react";

interface DonutChartProps {
    data: { name: string; value: number; color: string }[];
    centerLabel: string;
    centerValue: string;
    highlightedCategory?: string | null;
    onHoverCategory?: (category: string | null) => void;
    size?: number;
}

// Format asset class names for display
const formatCategoryName = (name: string): string => {
    switch (name) {
        case "STOCK": return "Stocks";
        case "CRYPTO": return "Crypto";
        case "ETF": return "ETFs";
        case "OTHER": return "Other";
        default: return name;
    }
};

// Custom active shape renderer for the highlighted slice
const renderActiveShape = (props: any) => {
    const {
        cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill,
    } = props;

    return (
        <g>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius - 2}
                outerRadius={outerRadius + 8}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                style={{
                    filter: "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4))",
                    transition: "all 0.2s ease-out",
                }}
            />
        </g>
    );
};

export default function DonutChart({
    data,
    centerLabel,
    centerValue,
    highlightedCategory,
    onHoverCategory,
    size = 280,
}: DonutChartProps) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    // Find active index from highlighted category
    const externalActiveIndex = highlightedCategory
        ? data.findIndex(d => d.name === highlightedCategory)
        : -1;

    const currentActiveIndex = externalActiveIndex >= 0 ? externalActiveIndex : activeIndex;

    const onPieEnter = useCallback((_: any, index: number) => {
        setActiveIndex(index);
        onHoverCategory?.(data[index]?.name || null);
    }, [data, onHoverCategory]);

    const onPieLeave = useCallback(() => {
        setActiveIndex(null);
        onHoverCategory?.(null);
    }, [onHoverCategory]);

    if (data.length === 0) {
        return (
            <div
                className="flex items-center justify-center"
                style={{ width: size, height: size }}
            >
                <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-700 mx-auto mb-3 flex items-center justify-center">
                        <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                        </svg>
                    </div>
                    <div className="text-slate-500 text-sm">No data</div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={size * 0.32}
                        outerRadius={size * 0.42}
                        paddingAngle={2}
                        onMouseEnter={onPieEnter}
                        onMouseLeave={onPieLeave}
                        activeIndex={currentActiveIndex !== null ? currentActiveIndex : undefined}
                        activeShape={renderActiveShape}
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={entry.name}
                                fill={entry.color}
                                stroke="transparent"
                                style={{
                                    opacity: currentActiveIndex !== null && currentActiveIndex !== index ? 0.4 : 1,
                                    transition: "opacity 0.2s ease-out",
                                    cursor: "pointer",
                                }}
                            />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>

            {/* Center text */}
            <div
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            >
                <div className="text-sm text-slate-400 mb-1">
                    {currentActiveIndex !== null && data[currentActiveIndex]
                        ? formatCategoryName(data[currentActiveIndex].name)
                        : centerLabel}
                </div>
                <div className="text-2xl font-bold text-white">
                    {centerValue}
                </div>
                {currentActiveIndex !== null && data[currentActiveIndex] && (
                    <div className="text-xs text-slate-400 mt-1">
                        {((data[currentActiveIndex].value / data.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(1)}% of total
                    </div>
                )}
            </div>
        </div>
    );
}
