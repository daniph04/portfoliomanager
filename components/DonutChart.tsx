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
                outerRadius={outerRadius + 6}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                style={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,0.2))" }}
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
            <div className="flex items-center justify-center opacity-50" style={{ width: size, height: size }}>
                No Data
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
                        innerRadius={size * 0.38} // Thinner ring
                        outerRadius={size * 0.45}
                        paddingAngle={4}
                        cornerRadius={4}
                        onMouseEnter={onPieEnter}
                        onMouseLeave={onPieLeave}
                        activeIndex={currentActiveIndex !== null ? currentActiveIndex : undefined}
                        activeShape={renderActiveShape}
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={entry.name}
                                fill={entry.color}
                                style={{
                                    opacity: currentActiveIndex !== null && currentActiveIndex !== index ? 0.3 : 1,
                                    transition: "opacity 0.2s ease",
                                    cursor: "pointer",
                                }}
                            />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>

            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">
                    {currentActiveIndex !== null && data[currentActiveIndex]
                        ? formatCategoryName(data[currentActiveIndex].name)
                        : centerLabel}
                </div>
                <div className="text-2xl font-bold text-white tracking-tight">
                    {centerValue}
                </div>
            </div>
        </div>
    );
}
