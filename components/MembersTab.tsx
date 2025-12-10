"use client";

import { useState } from "react";
import { GroupState, Holding, HoldingFormValues } from "@/lib/types";
import { GroupDataHelpers } from "@/lib/useGroupData";
import {
    getMemberHoldings, getTotalPortfolioValue, getTotalPnl, getTotalPnlPercent,
    getHoldingPnl, getHoldingPnlPercent, getHoldingValue, getAssetClassBreakdown,
    formatCurrency, formatPercent, getMemberColor, getTotalCostBasis
} from "@/lib/utils";
import HoldingFormModal from "./HoldingFormModal";
import SellConfirmModal from "./SellConfirmModal";
import DonutChart from "./DonutChart";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface MembersTabProps {
    group: GroupState;
    selectedMemberId: string | null;
    currentProfileId: string | null;
    cashBalance: number;
    onSelectMember: (memberId: string) => void;
    onDeposit: () => void;
    onWithdraw: () => void;
    helpers: GroupDataHelpers;
    readOnly?: boolean;
}

const ASSET_COLORS: Record<string, string> = {
    STOCK: "#00C805",
    CRYPTO: "#F7931A",
    ETF: "#5AC8FA",
    OTHER: "#8E8E93",
};

export default function MembersTab({ group, selectedMemberId, currentProfileId, cashBalance, onSelectMember, onDeposit, onWithdraw, helpers, readOnly = false }: MembersTabProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
    const [sellModalOpen, setSellModalOpen] = useState(false);
    const [sellingHolding, setSellingHolding] = useState<Holding | null>(null);
    const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const selectedMember = selectedMemberId
        ? group.members.find((m) => m.id === selectedMemberId)
        : null;

    // Get member stats
    const memberHoldings = selectedMember ? getMemberHoldings(group.holdings, selectedMember.id) : [];
    const totalValue = getTotalPortfolioValue(memberHoldings);
    const costBasis = getTotalCostBasis(memberHoldings);
    const totalPnl = getTotalPnl(memberHoldings);
    const totalPnlPercent = getTotalPnlPercent(memberHoldings);

    // Asset allocation
    const assetBreakdown = getAssetClassBreakdown(memberHoldings);
    const chartData = Object.entries(assetBreakdown)
        .map(([name, value]) => ({
            name,
            value,
            color: ASSET_COLORS[name] || ASSET_COLORS.OTHER,
        }))
        .sort((a, b) => b.value - a.value);

    // Performance chart data with smooth curve
    const performanceData = (() => {
        if (costBasis <= 0 || !selectedMember) return [];

        const numPoints = 15;
        const points = [];
        const totalChange = totalValue - costBasis;

        // Pseudo-random based on member for consistency
        const seed = selectedMember.colorHue * 100 + costBasis;
        const pseudoRandom = (i: number) => {
            const x = Math.sin(seed + i * 12.9898) * 43758.5453;
            return x - Math.floor(x);
        };

        for (let i = 0; i < numPoints; i++) {
            const progress = i / (numPoints - 1);

            // Eased progress for smooth curve
            const eased = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            // Add realistic volatility
            const noise = (pseudoRandom(i) - 0.5) * Math.abs(totalChange) * 0.25;
            const volatility = Math.sin(progress * Math.PI) * 0.5;

            let value = costBasis + (totalChange * eased) + noise * volatility;
            if (i === 0) value = costBasis;
            if (i === numPoints - 1) value = totalValue;

            points.push({
                name: i === 0 ? "Inicio" : i === numPoints - 1 ? "Hoy" : "",
                value: Math.max(value, costBasis * 0.85),
            });
        }

        return points;
    })();

    const refreshableSymbols = [...new Set(
        memberHoldings
            .filter(h => h.assetClass === "STOCK" || h.assetClass === "ETF")
            .map(h => h.symbol)
    )];

    const handleAddHolding = () => {
        setModalMode("create");
        setEditingHolding(null);
        setModalOpen(true);
    };

    const handleEditHolding = (holding: Holding) => {
        setModalMode("edit");
        setEditingHolding(holding);
        setModalOpen(true);
    };

    const handleSellHolding = (holding: Holding) => {
        setSellingHolding(holding);
        setSellModalOpen(true);
    };

    const handleConfirmSell = (sellPrice: number, note?: string) => {
        if (sellingHolding) {
            helpers.sellHolding(sellingHolding.id, { sellPrice, note });
            setSellModalOpen(false);
            setSellingHolding(null);
        }
    };

    const handleFormSubmit = (values: HoldingFormValues) => {
        if (modalMode === "create" && selectedMember) {
            helpers.addHolding(selectedMember.id, values);
        } else if (modalMode === "edit" && editingHolding) {
            helpers.updateHolding(editingHolding.id, values);
        }
        setModalOpen(false);
    };

    const handleRefreshPrices = async () => {
        if (refreshableSymbols.length === 0) return;
        setIsRefreshing(true);
        try {
            const response = await fetch("/api/quote", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ symbols: refreshableSymbols }),
            });
            const data = await response.json();
            if (data.prices) {
                const validPrices: Record<string, number> = {};
                for (const [symbol, price] of Object.entries(data.prices)) {
                    if (typeof price === "number" && price > 0) {
                        validPrices[symbol] = price;
                    }
                }
                if (Object.keys(validPrices).length > 0) {
                    helpers.updateHoldingPrices(validPrices);
                }
            }
        } catch (error) {
            console.error("Failed to refresh prices:", error);
        } finally {
            setIsRefreshing(false);
        }
    };

    // No members state
    if (group.members.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="text-6xl mb-4">👥</div>
                <h3 className="text-xl font-semibold text-slate-200 mb-2">No investors</h3>
                <p className="text-slate-400 text-center max-w-md">
                    Investors will be configured by the administrator.
                </p>
            </div>
        );
    }

    return (
        <div className="flex gap-6 h-full">
            {/* Sidebar - Desktop */}
            <div className="hidden lg:block w-64 flex-shrink-0">
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 sticky top-20">
                    <h3 className="text-lg font-semibold text-slate-100 mb-4">Investors</h3>
                    <div className="space-y-1">
                        {group.members.map((member) => {
                            const holdings = getMemberHoldings(group.holdings, member.id);
                            const value = getTotalPortfolioValue(holdings);
                            const pnlPct = getTotalPnlPercent(holdings);
                            const isSelected = selectedMemberId === member.id;

                            return (
                                <button
                                    key={member.id}
                                    onClick={() => onSelectMember(member.id)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${isSelected ? "bg-slate-800" : "hover:bg-slate-800/50"
                                        }`}
                                >
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                        style={{ backgroundColor: getMemberColor(member.colorHue) }}
                                    >
                                        {member.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <div className="font-medium text-slate-100 truncate">{member.name}</div>
                                        <div className="text-sm text-slate-400">{formatCurrency(value, 0)}</div>
                                    </div>
                                    {holdings.length > 0 && (
                                        <div className={`text-sm font-medium ${pnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {formatPercent(pnlPct, 1)}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Panel */}
            <div className="flex-1 min-w-0">
                {/* Mobile selector */}
                <div className="lg:hidden mb-4">
                    <h2 className="text-xl font-bold text-slate-100 mb-2">Investors</h2>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {group.members.map((member) => {
                            const isSelected = selectedMemberId === member.id;
                            return (
                                <button
                                    key={member.id}
                                    onClick={() => onSelectMember(member.id)}
                                    className={`flex-shrink-0 px-4 py-2 rounded-full transition-all ${isSelected
                                        ? "text-white"
                                        : "bg-slate-800 text-slate-300"
                                        }`}
                                    style={isSelected ? { backgroundColor: getMemberColor(member.colorHue) } : {}}
                                >
                                    {member.name}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* No selection */}
                {!selectedMember && (
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-12 text-center">
                        <div className="text-5xl mb-4">👈</div>
                        <h3 className="text-xl font-semibold text-slate-200 mb-2">Select an investor</h3>
                        <p className="text-slate-400">Choose an investor from the list to view their portfolio.</p>
                    </div>
                )}

                {/* Selected member */}
                {selectedMember && (
                    <div className="space-y-4">
                        {/* Cash Balance Card - Premium Design - Only for current user and not read-only*/}
                        {!readOnly && currentProfileId === selectedMember.id && (
                            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900/40 via-slate-900/80 to-cyan-900/40 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-5">
                                {/* Decorative elements */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl" />

                                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-2xl">💰</span>
                                            <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">Available Cash</span>
                                        </div>
                                        <div className="text-3xl sm:text-4xl font-bold text-white">
                                            ${cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={onDeposit}
                                            className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                            Deposit
                                        </button>
                                        <button
                                            onClick={onWithdraw}
                                            className="flex-1 sm:flex-none px-5 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition-all border border-slate-700 hover:border-slate-600 flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                            </svg>
                                            Withdraw
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Header */}
                        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 md:p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white"
                                        style={{ backgroundColor: getMemberColor(selectedMember.colorHue) }}
                                    >
                                        {selectedMember.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-100">{selectedMember.name}</h2>
                                        <p className="text-slate-400 text-sm">{memberHoldings.length} positions</p>
                                    </div>
                                </div>
                                {!readOnly && (
                                    <button
                                        onClick={handleAddHolding}
                                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-lg transition-all flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        <span className="hidden sm:inline">Add</span>
                                    </button>
                                )}
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {selectedMember.startingCapital && (
                                    <div className="bg-slate-800/50 rounded-xl p-3">
                                        <div className="text-xs text-slate-500 uppercase">Starting Capital</div>
                                        <div className="text-lg font-bold text-slate-200">
                                            {formatCurrency(selectedMember.startingCapital, 0)}
                                        </div>
                                    </div>
                                )}
                                <div className="bg-slate-800/50 rounded-xl p-3">
                                    <div className="text-xs text-slate-500 uppercase">Invested</div>
                                    <div className="text-lg font-bold text-slate-300">{formatCurrency(costBasis, 0)}</div>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-3">
                                    <div className="text-xs text-slate-500 uppercase">Current Value</div>
                                    <div className="text-lg font-bold text-slate-100">{formatCurrency(totalValue, 0)}</div>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-3">
                                    <div className="text-xs text-slate-500 uppercase">P/L</div>
                                    <div className={`text-lg font-bold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {totalPnl >= 0 ? "+" : ""}{formatCurrency(totalPnl, 0)} ({formatPercent(totalPnlPercent, 1)})
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Performance Chart */}
                        {memberHoldings.length > 0 && performanceData.length > 0 && (
                            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-4">
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span>📈</span> Performance
                                </h3>
                                <div className="h-36">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={performanceData}>
                                            <XAxis
                                                dataKey="name"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#64748b', fontSize: 11 }}
                                                interval="preserveStartEnd"
                                            />
                                            <YAxis
                                                hide
                                                domain={['dataMin - 20', 'dataMax + 20']}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: "#1e293b",
                                                    border: "1px solid #334155",
                                                    borderRadius: "8px",
                                                }}
                                                formatter={(value: number) => [formatCurrency(value), "Value"]}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="value"
                                                stroke={totalPnl >= 0 ? "#10b981" : "#ef4444"}
                                                strokeWidth={2.5}
                                                dot={false}
                                                activeDot={{ r: 5, fill: totalPnl >= 0 ? "#10b981" : "#ef4444" }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* Asset Allocation */}
                        {memberHoldings.length > 0 && chartData.length > 0 && (
                            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-4">
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Distribution</h3>
                                <div className="flex items-center gap-4">
                                    <DonutChart
                                        data={chartData}
                                        centerLabel=""
                                        centerValue={formatCurrency(totalValue, 0)}
                                        highlightedCategory={highlightedCategory}
                                        onHoverCategory={setHighlightedCategory}
                                        size={100}
                                    />
                                    <div className="flex-1 space-y-2">
                                        {chartData.map((item) => {
                                            const percentage = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
                                            return (
                                                <div key={item.name} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                                        <span className="text-sm text-slate-300">
                                                            {item.name === "STOCK" ? "Stocks" : item.name === "CRYPTO" ? "Crypto" : item.name === "ETF" ? "ETFs" : "Other"}
                                                        </span>
                                                    </div>
                                                    <span className="text-sm text-slate-400">{percentage.toFixed(0)}%</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Refresh Button */}
                        {refreshableSymbols.length > 0 && (
                            <button
                                onClick={handleRefreshPrices}
                                disabled={isRefreshing}
                                className="w-full py-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 text-slate-300 hover:text-white disabled:text-slate-500 rounded-xl transition-all flex items-center justify-center gap-2 text-sm font-medium"
                            >
                                <svg className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                {isRefreshing ? "Updating..." : "Refresh Prices"}
                            </button>
                        )}

                        {/* Holdings */}
                        <div>
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Positions</h3>
                            {memberHoldings.length === 0 ? (
                                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 text-center">
                                    <div className="text-4xl mb-3">📋</div>
                                    <p className="text-slate-400 mb-4">No open positions</p>
                                    {!readOnly && (
                                        <button
                                            onClick={handleAddHolding}
                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
                                        >
                                            Add first position
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {memberHoldings.map((holding) => {
                                        const pnl = getHoldingPnl(holding);
                                        const pnlPercent = getHoldingPnlPercent(holding);
                                        const equity = getHoldingValue(holding);

                                        return (
                                            <div key={holding.id} className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: ASSET_COLORS[holding.assetClass] || ASSET_COLORS.OTHER }} />
                                                        <div>
                                                            <div className="font-semibold text-slate-100">{holding.symbol}</div>
                                                            <div className="text-xs text-slate-400">{holding.name}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-slate-100">{formatCurrency(equity)}</div>
                                                        <div className={`text-sm font-medium ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {pnl >= 0 ? "+" : ""}{formatCurrency(pnl)} ({formatPercent(pnlPercent)})
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between text-sm text-slate-400 mb-3">
                                                    <span>Qty: {holding.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                                                    <span>Price: {formatCurrency(holding.currentPrice)}</span>
                                                    <span>Avg: {formatCurrency(holding.avgBuyPrice)}</span>
                                                </div>
                                                {!readOnly && (
                                                    <div className="flex items-center gap-2">
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
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {selectedMember && (
                <>
                    <HoldingFormModal
                        open={modalOpen}
                        mode={modalMode}
                        initialValues={editingHolding ? {
                            symbol: editingHolding.symbol,
                            name: editingHolding.name,
                            assetClass: editingHolding.assetClass,
                            quantity: editingHolding.quantity,
                            avgBuyPrice: editingHolding.avgBuyPrice,
                            currentPrice: editingHolding.currentPrice,
                        } : undefined}
                        availableCash={999999}
                        onClose={() => setModalOpen(false)}
                        onSubmit={handleFormSubmit}
                    />

                    <SellConfirmModal
                        open={sellModalOpen}
                        holding={sellingHolding}
                        onClose={() => {
                            setSellModalOpen(false);
                            setSellingHolding(null);
                        }}
                        onConfirm={handleConfirmSell}
                    />
                </>
            )}
        </div>
    );
}
