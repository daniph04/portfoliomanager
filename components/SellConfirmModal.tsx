"use client";

import { useState, useEffect } from "react";
import { Holding } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/utils";

interface SellConfirmModalProps {
    open: boolean;
    holding: Holding | null;
    onClose: () => void;
    onConfirm: (sellPrice: number, note?: string) => void;
}

export default function SellConfirmModal({ open, holding, onClose, onConfirm }: SellConfirmModalProps) {
    const [sellPrice, setSellPrice] = useState(0);
    const [note, setNote] = useState("");
    const [priceError, setPriceError] = useState("");

    // Reset form when modal opens
    useEffect(() => {
        if (open && holding) {
            setSellPrice(holding.currentPrice);
            setNote("");
            setPriceError("");
        }
    }, [open, holding]);

    if (!open || !holding) return null;

    const totalValue = holding.quantity * sellPrice;
    const costBasis = holding.quantity * holding.avgBuyPrice;
    const realizedPnl = totalValue - costBasis;
    const pnlPercent = costBasis > 0 ? (realizedPnl / costBasis) * 100 : 0;

    const handleConfirm = () => {
        if (sellPrice <= 0) {
            setPriceError("Sell price must be greater than 0");
            return;
        }
        onConfirm(sellPrice, note.trim() || undefined);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 bg-red-500/5">
                    <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Sell Position
                    </h2>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Position Info */}
                    <div className="bg-slate-800/50 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="font-bold text-lg text-slate-100">{holding.symbol}</div>
                            <span className="text-sm text-slate-400">{holding.name}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <div className="text-slate-500">Quantity</div>
                                <div className="text-slate-200 font-medium">
                                    {holding.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                                </div>
                            </div>
                            <div>
                                <div className="text-slate-500">Avg Cost</div>
                                <div className="text-slate-200 font-medium">{formatCurrency(holding.avgBuyPrice)}</div>
                            </div>
                            <div>
                                <div className="text-slate-500">Current Price</div>
                                <div className="text-slate-200 font-medium">{formatCurrency(holding.currentPrice)}</div>
                            </div>
                            <div>
                                <div className="text-slate-500">Cost Basis</div>
                                <div className="text-slate-200 font-medium">{formatCurrency(costBasis)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Sell Price Input */}
                    <div>
                        <label htmlFor="sellPrice" className="block text-sm font-medium text-slate-300 mb-2">
                            Sell Price
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                            <input
                                id="sellPrice"
                                type="number"
                                step="0.01"
                                value={sellPrice}
                                onChange={(e) => {
                                    setSellPrice(parseFloat(e.target.value) || 0);
                                    setPriceError("");
                                }}
                                className={`w-full pl-8 pr-4 py-3 bg-slate-800 border ${priceError ? "border-red-500" : "border-slate-700"} rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                            />
                        </div>
                        {priceError && <p className="text-red-400 text-xs mt-1">{priceError}</p>}
                    </div>

                    {/* Note Input */}
                    <div>
                        <label htmlFor="note" className="block text-sm font-medium text-slate-300 mb-2">
                            Note (optional)
                        </label>
                        <textarea
                            id="note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Why are you selling?"
                            rows={2}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                        />
                    </div>

                    {/* P/L Summary */}
                    <div className={`rounded-xl p-4 ${realizedPnl >= 0 ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                        <div className="text-sm text-slate-400 mb-1">Realized P/L</div>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-2xl font-bold ${realizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {realizedPnl >= 0 ? "+" : ""}{formatCurrency(realizedPnl)}
                            </span>
                            <span className={`text-sm ${realizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                ({formatPercent(pnlPercent)})
                            </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                            Proceeds: {formatCurrency(totalValue)}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-800 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors font-medium"
                    >
                        Confirm Sell
                    </button>
                </div>
            </div>
        </div>
    );
}
