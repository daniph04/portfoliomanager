"use client";

import { useState } from "react";
import { GroupState, Holding } from "@/lib/types";
import { GroupDataHelpers } from "@/lib/useGroupData";
import { formatCurrency, formatPercent, getMemberColor, getHoldingPnl, getHoldingPnlPercent, getTotalCostBasis, getMemberHoldings, getTotalPortfolioValue } from "@/lib/utils";
import HoldingFormModal from "./HoldingFormModal";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface MyPortfolioTabProps {
    group: GroupState;
    currentProfileId: string;
    cashBalance: number;
    onDeposit: () => void;
    onWithdraw: () => void;
    helpers: GroupDataHelpers;
}

// Simple donut chart component
const DonutChart = ({ data, colors }: { data: { name: string, value: number }[], colors: string[] }) => (
    <ResponsiveContainer width={120} height={120}>
        <PieChart>
            <Pie
                data={data}
                innerRadius={35}
                outerRadius={55}
                paddingAngle={2}
                dataKey="value"
            >
                {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
            </Pie>
            <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
            />
        </PieChart>
    </ResponsiveContainer>
);

export default function MyPortfolioTab({
    group,
    currentProfileId,
    cashBalance,
    onDeposit,
    onWithdraw,
    helpers,
}: MyPortfolioTabProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Get current user's data
    const currentMember = group.members.find(m => m.id === currentProfileId);
    const myHoldings = getMemberHoldings(group.holdings, currentProfileId);

    if (!currentMember) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="text-6xl mb-4">🔐</div>
                <h3 className="text-xl font-semibold text-slate-200 mb-2">Loading your portfolio...</h3>
            </div>
        );
    }

    const totalValue = getTotalPortfolioValue(myHoldings);
    const costBasis = getTotalCostBasis(myHoldings);
    const totalWithCash = totalValue + cashBalance;
    const pnl = totalValue - costBasis;
    const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

    // Chart data
    const assetAllocation = myHoldings.reduce((acc, h) => {
        const value = h.quantity * h.currentPrice;
        acc[h.assetClass] = (acc[h.assetClass] || 0) + value;
        return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(assetAllocation).map(([name, value]) => ({
        name,
        value,
    }));
    if (cashBalance > 0) {
        chartData.push({ name: "CASH", value: cashBalance });
    }

    const chartColors = ["#10b981", "#06b6d4", "#f59e0b", "#8b5cf6", "#6b7280"];

    // Handlers
    const handleAddHolding = () => {
        setModalMode("create");
        setEditingHolding(null);
        setIsModalOpen(true);
    };

    const handleEditHolding = (holding: Holding) => {
        setModalMode("edit");
        setEditingHolding(holding);
        setIsModalOpen(true);
    };

    const handleSellHolding = async (holding: Holding) => {
        if (confirm(`Sell all ${holding.quantity} shares of ${holding.symbol}?`)) {
            await helpers.sellHolding(holding.id);
        }
    };

    const handleSubmit = async (formData: any) => {
        if (modalMode === "create") {
            await helpers.addHolding(currentProfileId, formData);
        } else if (editingHolding) {
            // Update existing holding - just update via price map for now
            await helpers.updateHoldingPrices({ [editingHolding.symbol]: formData.currentPrice });
        }
    };

    return (
        <div className="space-y-6">
            {/* Header with user info */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <div
                            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg"
                            style={{ backgroundColor: getMemberColor(currentMember.colorHue) }}
                        >
                            {currentMember.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-100">{currentMember.name}</h1>
                            <p className="text-slate-400">{myHoldings.length} positions</p>
                        </div>
                    </div>
                    <button
                        onClick={handleAddHolding}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Position
                    </button>
                </div>

                {/* Portfolio stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-800/50 rounded-xl p-4">
                        <div className="text-xs text-slate-500 uppercase">Total Value</div>
                        <div className="text-xl font-bold text-white">{formatCurrency(totalWithCash, 0)}</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4">
                        <div className="text-xs text-slate-500 uppercase">Invested</div>
                        <div className="text-lg font-bold text-slate-300">{formatCurrency(costBasis, 0)}</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4">
                        <div className="text-xs text-slate-500 uppercase">P/L</div>
                        <div className={`text-lg font-bold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {pnl >= 0 ? "+" : ""}{formatCurrency(pnl, 0)} ({formatPercent(pnlPercent, 1)})
                        </div>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4">
                        <div className="text-xs text-slate-500 uppercase">Cash</div>
                        <div className="text-lg font-bold text-emerald-400">{formatCurrency(cashBalance, 0)}</div>
                        <div className="flex gap-1 mt-1">
                            <button onClick={onDeposit} className="text-xs px-2 py-0.5 bg-emerald-600/20 text-emerald-400 rounded">+ Deposit</button>
                            <button onClick={onWithdraw} className="text-xs px-2 py-0.5 bg-slate-700 text-slate-400 rounded">- Withdraw</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Asset Allocation */}
            {chartData.length > 0 && (
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-4">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Distribution</h3>
                    <div className="flex items-center gap-4">
                        <DonutChart data={chartData} colors={chartColors} />
                        <div className="flex-1 space-y-2">
                            {chartData.map((item, i) => (
                                <div key={item.name} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors[i] }} />
                                        <span className="text-slate-300">{item.name}</span>
                                    </div>
                                    <span className="text-slate-400">{formatCurrency(item.value, 0)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Holdings List */}
            <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Positions</h3>
                {myHoldings.length === 0 ? (
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 text-center">
                        <div className="text-4xl mb-3">📋</div>
                        <p className="text-slate-400 mb-4">No open positions</p>
                        <button
                            onClick={handleAddHolding}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
                        >
                            Add first position
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {myHoldings.map((holding) => {
                            const holdingValue = holding.quantity * holding.currentPrice;
                            const holdingPnl = getHoldingPnl(holding);
                            const holdingPnlPercent = getHoldingPnlPercent(holding);

                            return (
                                <div
                                    key={holding.id}
                                    className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className={`px-2 py-1 rounded text-xs font-medium ${holding.assetClass === "CRYPTO" ? "bg-amber-500/20 text-amber-400" :
                                                holding.assetClass === "ETF" ? "bg-purple-500/20 text-purple-400" :
                                                    "bg-cyan-500/20 text-cyan-400"
                                                }`}>
                                                {holding.assetClass}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-100">{holding.symbol}</div>
                                                <div className="text-xs text-slate-500">{holding.name}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-slate-100">{formatCurrency(holdingValue)}</div>
                                            <div className={`text-sm ${holdingPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                {holdingPnl >= 0 ? "+" : ""}{formatCurrency(holdingPnl)} ({formatPercent(holdingPnlPercent, 1)})
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                                        <span>{holding.quantity.toLocaleString()} shares @ ${holding.avgBuyPrice.toFixed(2)}</span>
                                        <span>Current: ${holding.currentPrice.toFixed(2)}</span>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEditHolding(holding)}
                                            className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm font-medium"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleSellHolding(holding)}
                                            className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors text-sm font-medium"
                                        >
                                            Sell
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Holding Modal */}
            <HoldingFormModal
                open={isModalOpen}
                mode={modalMode}
                initialValues={editingHolding ? {
                    symbol: editingHolding.symbol,
                    name: editingHolding.name,
                    assetClass: editingHolding.assetClass,
                    quantity: editingHolding.quantity,
                    avgBuyPrice: editingHolding.avgBuyPrice,
                    currentPrice: editingHolding.currentPrice,
                    cryptoId: editingHolding.cryptoId,
                } : undefined}
                availableCash={cashBalance}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
            />
        </div>
    );
}
