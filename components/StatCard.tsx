"use client";

import { ReactNode } from "react";

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: ReactNode;
    trend?: {
        value: string;
        positive: boolean;
    };
}

export default function StatCard({ title, value, subtitle, icon, trend }: StatCardProps) {
    return (
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 transition-all duration-200 hover:shadow-lg hover:border-slate-700">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="text-sm font-medium text-slate-400 mb-1">{title}</div>
                    <div className="text-3xl font-bold text-slate-100 mb-1">{value}</div>
                    {subtitle && <div className="text-sm text-slate-500">{subtitle}</div>}
                    {trend && (
                        <div
                            className={`inline-flex items-center space-x-1 text-sm font-medium mt-2 ${trend.positive ? "text-emerald-400" : "text-red-400"
                                }`}
                        >
                            <span>{trend.positive ? "↑" : "↓"}</span>
                            <span>{trend.value}</span>
                        </div>
                    )}
                </div>
                {icon && (
                    <div className="text-slate-600 opacity-50">
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
}
