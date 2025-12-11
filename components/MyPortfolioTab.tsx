"use client";

import { useState, useMemo } from "react";
import { GroupState, Holding, PerformancePoint, Season } from "@/lib/types";
import { GroupDataHelpers } from "@/lib/useGroupData";
import { formatCurrency, formatPercent, getMemberColor, getHoldingPnl, getHoldingPnlPercent, getTotalCostBasis, getMemberHoldings, getTotalPortfolioValue } from "@/lib/utils";
import { getMetricsForMode, MetricsMode } from "@/lib/portfolioMath";
import HoldingFormModal from "./HoldingFormModal";
import SellConfirmModal from "./SellConfirmModal";
import DonutChart from "./DonutChart";
import PerformanceChart from "./PerformanceChart";
import { ASSET_COLORS } from "@/lib/theme";

interface MyPortfolioTabProps {
    group: GroupState;
    currentProfileId: string;
    cashBalance: number;
    onDeposit: () => void;
    onWithdraw: () => void;
    helpers: GroupDataHelpers;
}

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
    const [sellModalOpen, setSellModalOpen] = useState(false);
    const [sellingHolding, setSellingHolding] = useState<Holding | null>(null);
    const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);
    const [displayMode, setDisplayMode] = useState<MetricsMode>("allTime");

    // Get current user's data
    const currentMember = group.members.find(m => m.id === currentProfileId);
    const myHoldings = getMemberHoldings(group.holdings, currentProfileId);

    // Get current season if active
    const currentSeason = useMemo(() => {
        if (!group.currentSeasonId) return null;
        return group.seasons.find(s => s.id === group.currentSeasonId) || null;
    }, [group.currentSeasonId, group.seasons]);

    // Must calculate metrics before early return - use fallback values if no member
    const metrics = currentMember ? getMetricsForMode(
        currentMember,
        group.holdings,
        currentSeason,
        displayMode,
        group.portfolioHistory
    ) : { currentValue: 0, baseline: 0, plAbs: 0, plPct: 0, modeLabel: "All Time", mode: "allTime" as const, portfolioValue: 0, investedValue: 0, cashBalance: 0 };

    // memberHistory must be before early return
    const memberHistory: PerformancePoint[] = useMemo(() => {
        const raw = group.portfolioHistory.filter(p => (p.entityId || p.memberId) === currentProfileId);
        const mapped = raw.map(p => ({
            timestamp: new Date(p.timestamp).getTime(),
            value: p.totalValue,
            scope: p.scope === "group" ? "group" as const : "user" as const,
            entityId: p.entityId || p.memberId,
        }));
        if (mapped.length === 0) {
            return [{
                timestamp: Date.now(),
                value: metrics.currentValue,
                scope: "user" as const,
                entityId: currentProfileId,
            }];
        }
        return mapped;
    }, [group.portfolioHistory, currentProfileId, metrics.currentValue]);

    if (!currentMember) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-slate-800 animate-pulse mb-4" />
                <h3 className="text-xl font-semibold text-slate-500">Loading profile...</h3>
            </div>
        );
    }

    // For chart and donut
    const totalHoldingsValue = getTotalPortfolioValue(myHoldings);
    const investedAmount = getTotalCostBasis(myHoldings);

    // Chart data
    const assetAllocation = myHoldings.reduce((acc, h) => {
        const value = h.quantity * h.currentPrice;
        acc[h.assetClass] = (acc[h.assetClass] || 0) + value;
        return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(assetAllocation).map(([name, value]) => ({
        name,
        value,
        color: ASSET_COLORS[name as keyof typeof ASSET_COLORS] || ASSET_COLORS.OTHER,
    }));

    if (cashBalance > 0) {
        chartData.push({
            name: "CASH",
            value: cashBalance,
            color: ASSET_COLORS.CASH
        });
    }

    // Sort by value desc
    chartData.sort((a, b) => b.value - a.value);

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
            await helpers.updateHoldingPrices({ [editingHolding.symbol]: formData.currentPrice });
        }
    };

    const memberColor = getMemberColor(currentMember.colorHue);

    return (
        <div className="space-y-6 pb-20 animate-fade-in">
            {/* Main Portfolio Header Card */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-white/5 shadow-2xl">
                {/* Background ambient glow */}
                <div
                    className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2"
                    style={{ backgroundColor: `${memberColor}20` }}
                />

                <div className="relative p-6 z-10">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div
                                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-lg backdrop-blur-md bg-white/10 border border-white/10"
                                    style={{ textShadow: `0 0 10px ${memberColor}` }}
                                >
                                    {currentMember.avatarInitials || currentMember.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-slate-900 rounded-full flex items-center justify-center">
                                    <span className="text-[10px] text-white font-bold">✓</span>
                                </div>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight">{currentMember.name}</h2>
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <span>{metrics.modeLabel}: {formatCurrency(metrics.baseline, 0)}</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleAddHolding}
                            className="bg-white text-slate-900 hover:bg-slate-200 active:scale-95 transition-all text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-white/10 flex items-center gap-2"
                        >
                            <span className="text-lg leading-none">+</span>
                            Trade
                        </button>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex gap-1 mb-4 bg-slate-800/50 rounded-lg p-1 w-fit">
                        <button
                            onClick={() => setDisplayMode("allTime")}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${displayMode === "allTime"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "text-slate-500 hover:text-slate-300"
                                }`}
                        >
                            All Time
                        </button>
                        <button
                            onClick={() => currentSeason && setDisplayMode("season")}
                            disabled={!currentSeason}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${displayMode === "season"
                                ? "bg-amber-500/20 text-amber-400"
                                : "text-slate-500 hover:text-slate-300"
                                } ${!currentSeason ? "opacity-40 cursor-not-allowed" : ""}`}
                        >
                            Season
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <div className="text-sm text-slate-400 font-medium mb-1">Portfolio Value</div>
                            <div className="text-3xl font-bold text-white tracking-tight">
                                {formatCurrency(metrics.currentValue)}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                                {displayMode === "season"
                                    ? `Season start: ${formatCurrency(metrics.baseline)} · Season: ${formatCurrency(metrics.plAbs)} (${formatPercent(metrics.plPct)})`
                                    : `Initial: ${formatCurrency(metrics.baseline)} · All Time: ${formatCurrency(metrics.plAbs)} (${formatPercent(metrics.plPct)})`}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-slate-400 font-medium mb-1">Total Return</div>
                            <div className={`text-3xl font-bold tracking-tight ${metrics.plAbs >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {metrics.plAbs >= 0 ? "+" : ""}{formatCurrency(metrics.plAbs)}
                            </div>
                            <div className={`text-sm font-medium ${metrics.plAbs >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                {metrics.plAbs >= 0 ? "▲" : "▼"} {formatPercent(Math.abs(metrics.plPct))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chart Area - bigger and without overlay covering controls */}
                <div className="px-4 pb-6">
                    <PerformanceChart
                        points={memberHistory}
                        baseline={metrics.baseline}
                        mode={displayMode}
                        startTime={displayMode === "season" && currentSeason ? new Date(currentSeason.startTime).getTime() : undefined}
                        showControls
                        className="h-64"
                    />
                </div>
            </div>

            {/* Cash Balance Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-slate-800/40 border border-white/5 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Buying Power</div>
                        <div className="text-2xl font-bold text-white">{formatCurrency(cashBalance)}</div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onDeposit} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-500/20 transition-colors">
                            Deposit
                        </button>
                        <button onClick={onWithdraw} className="px-3 py-1.5 bg-slate-700/50 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
                            Withdraw
                        </button>
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-800/40 border border-white/5 flex items-center justify-between">
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Invested Assets</div>
                        <div className="text-2xl font-bold text-slate-200">{formatCurrency(totalHoldingsValue)}</div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <span className="text-blue-400 text-lg">📊</span>
                    </div>
                </div>
            </div>

            {/* Holdings & Allocation */}
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Allocation */}
                {chartData.length > 0 && (
                    <div className="lg:w-1/3 bg-slate-900/50 border border-white/5 rounded-3xl p-6">
                        <h3 className="text-lg font-bold text-white mb-6">Allocation</h3>
                        <div className="flex justify-center mb-6">
                            <DonutChart
                                data={chartData}
                                centerLabel="Assets"
                                centerValue={formatCurrency(metrics.currentValue, 0)}
                                highlightedCategory={highlightedCategory}
                                onHoverCategory={setHighlightedCategory}
                                size={220}
                            />
                        </div>
                        <div className="space-y-3">
                            {chartData.map((item) => (
                                <div
                                    key={item.name}
                                    onMouseEnter={() => setHighlightedCategory(item.name)}
                                    onMouseLeave={() => setHighlightedCategory(null)}
                                    className={`flex items-center justify-between p-2 rounded-xl transition-colors cursor-pointer ${highlightedCategory === item.name ? "bg-white/5" : "hover:bg-white/5"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-sm font-medium text-slate-300">
                                            {item.name === "STOCK" ? "Stocks" : item.name === "CRYPTO" ? "Crypto" : item.name}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-white">{((item.value / metrics.currentValue) * 100).toFixed(1)}%</div>
                                        <div className="text-[10px] text-slate-500">{formatCurrency(item.value, 0)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Holdings List */}
                <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white">Your Positions</h3>
                        <span className="text-xs font-medium text-slate-500 bg-slate-800 px-2 py-1 rounded-lg">
                            {myHoldings.length} Assets
                        </span>
                    </div>

                    {myHoldings.length === 0 ? (
                        <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl p-10 text-center">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                                🚀
                            </div>
                            <h3 className="text-white font-bold mb-2">Start Investing</h3>
                            <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">
                                Add your first stock or crypto position to begin tracking your performance.
                            </p>
                            <button
                                onClick={handleAddHolding}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
                            >
                                Add Position
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {myHoldings.map((holding) => {
                                const holdingValue = holding.quantity * holding.currentPrice;
                                const holdingPnl = getHoldingPnl(holding);
                                const holdingPnlPercent = getHoldingPnlPercent(holding);
                                const isProfit = holdingPnl >= 0;

                                return (
                                    <div
                                        key={holding.id}
                                        className="group bg-slate-900/50 border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all hover:bg-slate-800/50"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-4">
                                                {/* Asset Icon */}
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shadow-inner ${holding.assetClass === "CRYPTO" ? "bg-orange-500/10 text-orange-500" :
                                                    holding.assetClass === "ETF" ? "bg-cyan-500/10 text-cyan-500" :
                                                        "bg-emerald-500/10 text-emerald-500"
                                                    }`}>
                                                    {holding.symbol.substring(0, 2)}
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-white text-lg">{holding.symbol}</h4>
                                                        <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-medium">
                                                            {holding.assetClass}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-slate-400">
                                                        {holding.quantity} @ {formatCurrency(holding.avgBuyPrice)}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <div className="font-bold text-white text-lg">
                                                    {formatCurrency(holdingValue)}
                                                </div>
                                                <div className={`text-sm font-medium flex items-center justify-end gap-1 ${isProfit ? "text-emerald-400" : "text-red-400"
                                                    }`}>
                                                    <span>{isProfit ? "+" : ""}{formatCurrency(holdingPnl)}</span>
                                                    <span className={`text-xs px-1.5 py-0.5 rounded ${isProfit ? "bg-emerald-500/10" : "bg-red-500/10"
                                                        }`}>
                                                        {formatPercent(holdingPnlPercent)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="mt-3 pt-3 border-t border-white/5 flex gap-2">
                                            <button
                                                onClick={() => handleEditHolding(holding)}
                                                className="flex-1 px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSellingHolding(holding);
                                                    setSellModalOpen(true);
                                                }}
                                                className="flex-1 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors"
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
            </div>

            {/* Modal */}
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

            {/* Sell Modal */}
            <SellConfirmModal
                open={sellModalOpen}
                holding={sellingHolding}
                onClose={() => {
                    setSellModalOpen(false);
                    setSellingHolding(null);
                }}
                onConfirm={async (sellPrice: number) => {
                    if (sellingHolding) {
                        await helpers.sellHolding(sellingHolding.id, { sellPrice });
                        setSellModalOpen(false);
                        setSellingHolding(null);
                    }
                }}
            />
        </div>
    );
}
