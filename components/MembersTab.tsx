"use client";

import { useState } from "react";
import { GroupState, Holding, HoldingFormValues } from "@/lib/types";
import { GroupDataHelpers } from "@/lib/useGroupData";
import {
    getMemberHoldings, getTotalPortfolioValue, getTotalPnl, getTotalPnlPercent,
    getHoldingPnl, getHoldingPnlPercent, getHoldingValue, getAssetClassBreakdown,
    formatCurrency, formatPercent, getMemberColor
} from "@/lib/utils";
import HoldingFormModal from "./HoldingFormModal";
import SellConfirmModal from "./SellConfirmModal";
import DonutChart from "./DonutChart";

interface MembersTabProps {
    group: GroupState;
    selectedMemberId: string | null;
    currentProfileId: string | null; // Current logged-in user (can only edit own holdings)
    onSelectMember: (memberId: string) => void;
    helpers: GroupDataHelpers;
}

// Asset class colors
const ASSET_COLORS: Record<string, string> = {
    STOCK: "#00C805",
    CRYPTO: "#F7931A",
    ETF: "#5AC8FA",
    OTHER: "#8E8E93",
};

export default function MembersTab({ group, selectedMemberId, currentProfileId, onSelectMember, helpers }: MembersTabProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
    const [sellModalOpen, setSellModalOpen] = useState(false);
    const [sellingHolding, setSellingHolding] = useState<Holding | null>(null);
    const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Find selected member
    const selectedMember = selectedMemberId
        ? group.members.find((m) => m.id === selectedMemberId)
        : null;

    // No member selected state
    if (!selectedMember) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-100">Investor Portfolio</h2>
                    <p className="text-slate-400 mt-1">View and manage individual holdings</p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-12 text-center">
                    {group.members.length === 0 ? (
                        <>
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                                <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-slate-200 mb-2">Create your first investor</h3>
                            <p className="text-slate-400 max-w-md mx-auto">
                                Use the sidebar on the left to add an investor, then start tracking their holdings.
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                                <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-slate-200 mb-2">Select an investor</h3>
                            <p className="text-slate-400 max-w-md mx-auto">
                                Choose an investor from the sidebar to view and manage their portfolio.
                            </p>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // Get member's holdings and stats
    const memberHoldings = getMemberHoldings(group.holdings, selectedMember.id);
    const totalValue = getTotalPortfolioValue(memberHoldings);
    const totalPnl = getTotalPnl(memberHoldings);
    const totalPnlPercent = getTotalPnlPercent(memberHoldings);
    const memberColor = getMemberColor(selectedMember.colorHue);

    // Asset allocation for donut chart
    const assetBreakdown = getAssetClassBreakdown(memberHoldings);
    const chartData = Object.entries(assetBreakdown)
        .map(([name, value]) => ({
            name,
            value,
            color: ASSET_COLORS[name] || ASSET_COLORS.OTHER,
        }))
        .sort((a, b) => b.value - a.value);

    // Refreshable symbols (STOCK and ETF only)
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
        if (modalMode === "create") {
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-100">Investor Portfolio</h2>
                    <p className="text-slate-400 mt-1">View and manage individual holdings</p>
                </div>
                <div className="flex items-center gap-3">
                    {refreshableSymbols.length > 0 && (
                        <button
                            onClick={handleRefreshPrices}
                            disabled={isRefreshing}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 text-slate-300 hover:text-white disabled:text-slate-500 rounded-lg transition-all flex items-center gap-2 text-sm"
                        >
                            <svg
                                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {isRefreshing ? "..." : "Refresh"}
                        </button>
                    )}
                    <button
                        onClick={handleAddHolding}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-medium rounded-lg transition-all transform hover:scale-105 flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Holding
                    </button>
                </div>
            </div>

            {/* Member Summary Card */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-4 mb-6">
                    <div
                        className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white"
                        style={{ backgroundColor: memberColor }}
                    >
                        {selectedMember.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-100">{selectedMember.name}</h3>
                        <p className="text-slate-400">{memberHoldings.length} holding{memberHoldings.length !== 1 ? "s" : ""}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
                    <div>
                        <div className="text-sm text-slate-400 mb-1">Holdings Value</div>
                        <div className="text-2xl font-bold text-slate-100">{formatCurrency(totalValue)}</div>
                    </div>
                    <div>
                        <div className="text-sm text-slate-400 mb-1">Cash Balance</div>
                        <div className="text-2xl font-bold text-emerald-400">{formatCurrency(selectedMember.cashBalance)}</div>
                    </div>
                    <div>
                        <div className="text-sm text-slate-400 mb-1">Total Value</div>
                        <div className="text-2xl font-bold text-slate-100">{formatCurrency(totalValue + selectedMember.cashBalance)}</div>
                    </div>
                    <div>
                        <div className="text-sm text-slate-400 mb-1">Unrealized P/L</div>
                        <div className={`text-2xl font-bold ${totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {formatCurrency(totalPnl)}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm text-slate-400 mb-1">Realized P/L</div>
                        <div className={`text-2xl font-bold ${selectedMember.totalRealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {formatCurrency(selectedMember.totalRealizedPnl)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Asset Allocation - Robinhood Style */}
            {memberHoldings.length > 0 && (
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-slate-100 mb-6">Asset Allocation</h3>

                    <div className="flex flex-col lg:flex-row items-center gap-8">
                        {/* Category List */}
                        <div className="flex-1 w-full space-y-2">
                            {chartData.map((item) => {
                                const percentage = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
                                const isHighlighted = highlightedCategory === item.name;

                                return (
                                    <button
                                        key={item.name}
                                        onMouseEnter={() => setHighlightedCategory(item.name)}
                                        onMouseLeave={() => setHighlightedCategory(null)}
                                        className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200 ${isHighlighted
                                            ? "bg-slate-800 scale-[1.02]"
                                            : "hover:bg-slate-800/50"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-4 h-4 rounded-full"
                                                style={{ backgroundColor: item.color }}
                                            />
                                            <span className="font-medium text-slate-200">
                                                {item.name === "STOCK" ? "Stocks" :
                                                    item.name === "CRYPTO" ? "Crypto" :
                                                        item.name === "ETF" ? "ETFs" : "Other"}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-slate-400 text-sm">{percentage.toFixed(1)}%</div>
                                            <div className="font-medium text-slate-200">{formatCurrency(item.value)}</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Donut Chart */}
                        <div className="flex-shrink-0">
                            <DonutChart
                                data={chartData}
                                centerLabel="Total portfolio value"
                                centerValue={formatCurrency(totalValue, 0)}
                                highlightedCategory={highlightedCategory}
                                onHoverCategory={setHighlightedCategory}
                                size={240}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Holdings Table */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800">
                    <h3 className="text-lg font-semibold text-slate-100">Holdings</h3>
                </div>

                {memberHoldings.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                            <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="text-slate-400 text-lg mb-2">No holdings yet</div>
                        <div className="text-slate-500 text-sm mb-4">
                            Add this investor&apos;s first position to start tracking their portfolio
                        </div>
                        <button
                            onClick={handleAddHolding}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
                        >
                            Add First Holding
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-800/50 border-b border-slate-700">
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Asset</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Shares</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Price</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Cost</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Return</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Equity</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {memberHoldings.map((holding) => {
                                    const pnl = getHoldingPnl(holding);
                                    const pnlPercent = getHoldingPnlPercent(holding);
                                    const equity = getHoldingValue(holding);

                                    return (
                                        <tr key={holding.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-2 h-8 rounded-full"
                                                        style={{ backgroundColor: ASSET_COLORS[holding.assetClass] || ASSET_COLORS.OTHER }}
                                                    />
                                                    <div>
                                                        <div className="font-semibold text-slate-100">{holding.symbol}</div>
                                                        <div className="text-sm text-slate-400">{holding.name}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-300">
                                                {holding.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-300">
                                                {formatCurrency(holding.currentPrice)}
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-300">
                                                {formatCurrency(holding.avgBuyPrice)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className={`font-medium ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                    {pnl >= 0 ? "▲" : "▼"} {formatCurrency(Math.abs(pnl))}
                                                </div>
                                                <div className={`text-sm ${pnlPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                    {formatPercent(pnlPercent)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-slate-100">
                                                {formatCurrency(equity)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEditHolding(holding)}
                                                        className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleSellHolding(holding)}
                                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                                                        title="Sell"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modals */}
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
                availableCash={selectedMember.cashBalance}
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
        </div>
    );
}
