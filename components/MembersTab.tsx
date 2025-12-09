"use client";

import { useState } from "react";
import { GroupState, Holding, HoldingFormValues, Member } from "@/lib/types";
import { GroupDataHelpers } from "@/lib/useGroupData";
import {
    getMemberHoldings, getTotalPortfolioValue, getTotalPnl, getTotalPnlPercent,
    getHoldingPnl, getHoldingPnlPercent, getHoldingValue, getAssetClassBreakdown,
    formatCurrency, formatPercent, getMemberColor, getTotalCostBasis
} from "@/lib/utils";
import HoldingFormModal from "./HoldingFormModal";
import SellConfirmModal from "./SellConfirmModal";
import DonutChart from "./DonutChart";

interface MembersTabProps {
    group: GroupState;
    selectedMemberId: string | null;
    currentProfileId: string | null;
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
    const [addInvestorModalOpen, setAddInvestorModalOpen] = useState(false);
    const [newInvestorName, setNewInvestorName] = useState("");

    // Find selected member
    const selectedMember = selectedMemberId
        ? group.members.find((m) => m.id === selectedMemberId)
        : null;

    const handleAddInvestor = () => {
        if (!newInvestorName.trim()) return;
        const newMember = helpers.addMember(newInvestorName.trim());
        setNewInvestorName("");
        setAddInvestorModalOpen(false);
        onSelectMember(newMember.id);
    };

    // Get member stats
    const memberHoldings = selectedMember ? getMemberHoldings(group.holdings, selectedMember.id) : [];
    const totalValue = getTotalPortfolioValue(memberHoldings);
    const costBasis = getTotalCostBasis(memberHoldings);
    const totalPnl = getTotalPnl(memberHoldings);
    const totalPnlPercent = getTotalPnlPercent(memberHoldings);

    // Asset allocation for donut chart
    const assetBreakdown = getAssetClassBreakdown(memberHoldings);
    const chartData = Object.entries(assetBreakdown)
        .map(([name, value]) => ({
            name,
            value,
            color: ASSET_COLORS[name] || ASSET_COLORS.OTHER,
        }))
        .sort((a, b) => b.value - a.value);

    // Refreshable symbols
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

    // Empty state - no members
    if (group.members.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                    <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-200 mb-2">Añade tu primer inversor</h3>
                <p className="text-slate-400 text-center max-w-md mb-4">
                    Crea perfiles de inversores para trackear sus portfolios.
                </p>
                <button
                    onClick={() => setAddInvestorModalOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
                >
                    Añadir inversor
                </button>
                {renderAddInvestorModal()}
            </div>
        );
    }

    // Render investor sidebar item
    function InvestorItem({ member }: { member: Member }) {
        const holdings = getMemberHoldings(group.holdings, member.id);
        const value = getTotalPortfolioValue(holdings);
        const pnlPct = getTotalPnlPercent(holdings);
        const isSelected = selectedMemberId === member.id;
        const color = getMemberColor(member.colorHue);

        return (
            <button
                onClick={() => onSelectMember(member.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${isSelected ? "bg-slate-800" : "hover:bg-slate-800/50"
                    }`}
            >
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: color }}
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
    }

    function renderAddInvestorModal() {
        if (!addInvestorModalOpen) return null;
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60" onClick={() => setAddInvestorModalOpen(false)} />
                <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
                    <h3 className="text-xl font-bold text-slate-100 mb-4">Añadir inversor</h3>
                    <input
                        type="text"
                        value={newInvestorName}
                        onChange={(e) => setNewInvestorName(e.target.value)}
                        placeholder="Nombre del inversor"
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
                    />
                    <div className="flex gap-3">
                        <button
                            onClick={() => setAddInvestorModalOpen(false)}
                            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleAddInvestor}
                            disabled={!newInvestorName.trim()}
                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-semibold rounded-xl transition-all"
                        >
                            Crear
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex gap-6 h-full">
            {/* Sidebar - Desktop only */}
            <div className="hidden lg:block w-72 flex-shrink-0">
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 sticky top-20">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-100">Inversores</h3>
                        <button
                            onClick={() => setAddInvestorModalOpen(true)}
                            className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>
                    <div className="space-y-1">
                        {group.members.map((member) => (
                            <InvestorItem key={member.id} member={member} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Main panel */}
            <div className="flex-1 min-w-0">
                {/* Mobile investor selector */}
                <div className="lg:hidden mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-bold text-slate-100">Inversores</h2>
                        <button
                            onClick={() => setAddInvestorModalOpen(true)}
                            className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {group.members.map((member) => {
                            const isSelected = selectedMemberId === member.id;
                            return (
                                <button
                                    key={member.id}
                                    onClick={() => onSelectMember(member.id)}
                                    className={`flex-shrink-0 px-4 py-2 rounded-full transition-all ${isSelected ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-300"
                                        }`}
                                >
                                    {member.name}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* No selection state */}
                {!selectedMember && (
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                            <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-slate-200 mb-2">Selecciona un inversor</h3>
                        <p className="text-slate-400">
                            Elige un inversor de la lista para ver su portfolio.
                        </p>
                    </div>
                )}

                {/* Selected member view */}
                {selectedMember && (
                    <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white"
                                    style={{ backgroundColor: getMemberColor(selectedMember.colorHue) }}
                                >
                                    {selectedMember.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-100">{selectedMember.name}</h2>
                                    <p className="text-slate-400 text-sm">{memberHoldings.length} posiciones</p>
                                </div>
                            </div>
                            <button
                                onClick={handleAddHolding}
                                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-medium rounded-lg transition-all flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <span className="hidden sm:inline">Añadir</span>
                            </button>
                        </div>

                        {/* Stats */}
                        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-4">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <div className="text-xs text-slate-500 uppercase tracking-wider">Valor Total</div>
                                    <div className="text-xl font-bold text-slate-100">{formatCurrency(totalValue)}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 uppercase tracking-wider">Cost Basis</div>
                                    <div className="text-xl font-bold text-slate-300">{formatCurrency(costBasis)}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 uppercase tracking-wider">P/L</div>
                                    <div className={`text-xl font-bold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {formatCurrency(totalPnl)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500 uppercase tracking-wider">Retorno</div>
                                    <div className={`text-xl font-bold ${totalPnlPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {formatPercent(totalPnlPercent)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Asset Allocation */}
                        {memberHoldings.length > 0 && chartData.length > 0 && (
                            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-4">
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Allocation</h3>
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

                        {/* Refresh button */}
                        {refreshableSymbols.length > 0 && (
                            <button
                                onClick={handleRefreshPrices}
                                disabled={isRefreshing}
                                className="w-full py-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 text-slate-300 hover:text-white disabled:text-slate-500 rounded-xl transition-all flex items-center justify-center gap-2 text-sm font-medium"
                            >
                                <svg className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                {isRefreshing ? "Actualizando..." : "Actualizar precios"}
                            </button>
                        )}

                        {/* Holdings */}
                        <div>
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Holdings</h3>
                            {memberHoldings.length === 0 ? (
                                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 text-center">
                                    <p className="text-slate-400 mb-4">Sin posiciones abiertas</p>
                                    <button
                                        onClick={handleAddHolding}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
                                    >
                                        Añadir primera posición
                                    </button>
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
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleEditHolding(holding)}
                                                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm font-medium"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleSellHolding(holding)}
                                                        className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors text-sm font-medium"
                                                    >
                                                        Vender
                                                    </button>
                                                </div>
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
            {renderAddInvestorModal()}

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
                        availableCash={999999} // No cash limit since we removed cash
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
