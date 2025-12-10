"use client";

import { useState, FormEvent } from "react";
import { OnboardingHolding, AssetClass } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import SymbolSearch from "./SymbolSearch";

interface OnboardingModalProps {
    onClose: () => void;
    onComplete: (data: {
        name: string;
        initialCash: number;
        holdings: OnboardingHolding[]
    }) => void;
}

// Parse number that may use comma or period as decimal separator
const parseLocaleNumber = (value: string): number => {
    if (!value) return 0;
    // Replace comma with period for parsing
    const normalized = value.replace(",", ".");
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
};

export default function OnboardingModal({ onClose, onComplete }: OnboardingModalProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [name, setName] = useState("");
    const [initialCash, setInitialCash] = useState<number>(0);
    const [holdings, setHoldings] = useState<OnboardingHolding[]>([]);
    const [error, setError] = useState("");

    // For adding new holding
    const [isAddingHolding, setIsAddingHolding] = useState(false);
    const [pendingHolding, setPendingHolding] = useState<Partial<OnboardingHolding>>({});

    const handleSymbolSelect = (result: {
        symbol: string;
        name: string;
        assetClass: AssetClass;
        currentPrice: number;
        cryptoId?: string;
    }) => {
        setPendingHolding({
            symbol: result.symbol,
            name: result.name,
            assetClass: result.assetClass,
            currentPrice: result.currentPrice,
            cryptoId: result.cryptoId,
            quantity: 0,
            avgBuyPrice: result.currentPrice,
        });
    };

    const handleAddHolding = () => {
        if (!pendingHolding.symbol || !pendingHolding.quantity || pendingHolding.quantity <= 0) {
            return;
        }

        const newHolding: OnboardingHolding = {
            symbol: pendingHolding.symbol!,
            name: pendingHolding.name || pendingHolding.symbol!,
            assetClass: pendingHolding.assetClass || "STOCK",
            quantity: pendingHolding.quantity,
            avgBuyPrice: pendingHolding.avgBuyPrice || pendingHolding.currentPrice || 0,
            currentPrice: pendingHolding.currentPrice || pendingHolding.avgBuyPrice || 0,
            cryptoId: pendingHolding.cryptoId,
        };

        setHoldings([...holdings, newHolding]);
        setPendingHolding({});
        setIsAddingHolding(false);
    };

    const handleRemoveHolding = (index: number) => {
        setHoldings(holdings.filter((_, i) => i !== index));
    };

    const handleNext = () => {
        if (step === 1) {
            if (!name.trim()) {
                setError("Enter your name");
                return;
            }
            setError("");
            setStep(2);
        } else if (step === 2) {
            if (initialCash < 0) {
                setError("Cash cannot be negative");
                return;
            }
            setError("");
            setStep(3);
        }
    };

    const handleBack = () => {
        if (step === 2) setStep(1);
        if (step === 3) setStep(2);
    };

    const handleComplete = () => {
        onComplete({
            name: name.trim(),
            initialCash,
            holdings,
        });
    };

    // Calculate totals
    const totalInvested = holdings.reduce((sum, h) => sum + (h.quantity * h.avgBuyPrice), 0);
    const remainingCash = initialCash - totalInvested;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                {/* Progress Bar */}
                <div className="h-1 bg-slate-800">
                    <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                        style={{ width: `${(step / 3) * 100}%` }}
                    />
                </div>

                <div className="p-6">
                    {/* Step 1: Name */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-100">Create Your Profile</h2>
                                <p className="text-slate-400 mt-1">What&apos;s your name?</p>
                            </div>

                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter your name"
                                autoFocus
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-lg"
                            />

                            {error && (
                                <p className="text-red-400 text-sm">{error}</p>
                            )}
                        </div>
                    )}

                    {/* Step 2: Portfolio Value */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-100">Portfolio Value</h2>
                                <p className="text-slate-400 mt-1">What&apos;s your total portfolio value?</p>
                            </div>

                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">$</span>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={initialCash || ""}
                                    onChange={(e) => setInitialCash(parseLocaleNumber(e.target.value))}
                                    placeholder="0 (use . or , for decimals)"
                                    autoFocus
                                    className="w-full px-4 py-3 pl-8 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-2xl font-mono"
                                />
                            </div>

                            <p className="text-slate-500 text-sm">
                                Enter your total portfolio value (cash + investments). When you add holdings, it will be deducted from this amount.
                            </p>

                            {error && (
                                <p className="text-red-400 text-sm">{error}</p>
                            )}
                        </div>
                    )}

                    {/* Step 3: Add Holdings */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-100">Your Holdings</h2>
                                <p className="text-slate-400 mt-1">Add any assets you already own (optional)</p>
                            </div>

                            {/* Portfolio value summary */}
                            <div className="flex justify-between text-sm bg-slate-800/50 rounded-lg p-3">
                                <span className="text-slate-400">Portfolio Value:</span>
                                <span className="text-slate-200">{formatCurrency(initialCash)}</span>
                            </div>

                            {/* Holdings list */}
                            {holdings.length > 0 && (
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {holdings.map((h, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between bg-slate-800 rounded-lg p-3"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${h.assetClass === "CRYPTO"
                                                    ? "bg-orange-500/20 text-orange-400"
                                                    : h.assetClass === "ETF"
                                                        ? "bg-blue-500/20 text-blue-400"
                                                        : "bg-emerald-500/20 text-emerald-400"
                                                    }`}>
                                                    {h.assetClass}
                                                </span>
                                                <div>
                                                    <span className="font-medium text-slate-100">{h.symbol}</span>
                                                    <span className="text-slate-400 ml-2">×{h.quantity}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-slate-300">
                                                    {formatCurrency(h.quantity * h.avgBuyPrice)}
                                                </span>
                                                <button
                                                    onClick={() => handleRemoveHolding(i)}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add holding form */}
                            {isAddingHolding ? (
                                <div className="space-y-3 bg-slate-800/50 rounded-xl p-4">
                                    <SymbolSearch
                                        onSelect={handleSymbolSelect}
                                    />

                                    {pendingHolding.symbol && (
                                        <>
                                            <div className="flex gap-3">
                                                <div className="flex-1">
                                                    <label className="text-xs text-slate-400">Quantity</label>
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={pendingHolding.quantity || ""}
                                                        onChange={(e) => setPendingHolding({
                                                            ...pendingHolding,
                                                            quantity: parseLocaleNumber(e.target.value)
                                                        })}
                                                        placeholder="0 (use . or ,)"
                                                        className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-xs text-slate-400">Avg Buy Price</label>
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={pendingHolding.avgBuyPrice || ""}
                                                        onChange={(e) => setPendingHolding({
                                                            ...pendingHolding,
                                                            avgBuyPrice: parseLocaleNumber(e.target.value)
                                                        })}
                                                        placeholder="0 (use . or ,)"
                                                        className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => { setIsAddingHolding(false); setPendingHolding({}); }}
                                                    className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleAddHolding}
                                                    disabled={!pendingHolding.quantity || pendingHolding.quantity <= 0}
                                                    className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsAddingHolding(true)}
                                    className="w-full py-3 border-2 border-dashed border-slate-700 rounded-xl text-slate-400 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors"
                                >
                                    + Add Holding
                                </button>
                            )}

                            {/* Summary */}
                            {holdings.length > 0 && (
                                <div className="space-y-1 pt-2 border-t border-slate-800">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Total Invested:</span>
                                        <span className="text-slate-200">{formatCurrency(totalInvested)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400">Available:</span>
                                        <span className={remainingCash >= 0 ? "text-emerald-400" : "text-red-400"}>
                                            {formatCurrency(remainingCash)}
                                        </span>
                                    </div>
                                    {remainingCash < 0 && (
                                        <p className="text-red-400 text-xs mt-2">
                                            ⚠️ You&apos;ve invested more than available. Reduce holdings or increase portfolio value.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex gap-3 mt-8">
                        {step > 1 && (
                            <button
                                onClick={handleBack}
                                className="px-6 py-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors"
                            >
                                Back
                            </button>
                        )}

                        <button
                            onClick={step === 3 ? handleComplete : handleNext}
                            className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl transition-all"
                        >
                            {step === 3 ? "Create Profile" : "Continue"}
                        </button>
                    </div>
                </div>
            </div >
        </div >
    );
}
