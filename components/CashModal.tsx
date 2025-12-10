"use client";

import { useState } from "react";

interface CashModalProps {
    isOpen: boolean;
    mode: "deposit" | "withdraw";
    currentBalance: number;
    onClose: () => void;
    onConfirm: (amount: number) => Promise<void>;
}

// Parse number that may use comma or period as decimal separator
const parseLocaleNumber = (value: string): number => {
    if (!value) return 0;
    // Remove any characters except digits, dots, and commas
    const cleaned = value.replace(/[^0-9.,]/g, "");
    // Replace comma with period for parsing
    const normalized = cleaned.replace(",", ".");
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
};

export default function CashModal({ isOpen, mode, currentBalance, onClose, onConfirm }: CashModalProps) {
    const [amount, setAmount] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const handleSubmit = async () => {
        const value = parseLocaleNumber(amount);

        if (isNaN(value) || value <= 0) {
            setError("Please enter a valid amount");
            return;
        }

        if (mode === "withdraw" && value > currentBalance) {
            setError("Insufficient balance");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            await onConfirm(value);
            setAmount("");
            onClose();
        } catch (err) {
            setError("An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with blur */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Modal - Premium Glass Effect */}
            <div className="relative glass border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${mode === "deposit"
                                ? "bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/20"
                                : "bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-500/20"
                            }`}>
                            {mode === "deposit" ? "💰" : "💸"}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                {mode === "deposit" ? "Deposit" : "Withdraw"}
                            </h2>
                            <p className="text-sm text-slate-400">
                                Balance: <span className={mode === "deposit" ? "text-emerald-400" : "text-cyan-400"}>${currentBalance.toLocaleString()}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Amount Input - Premium styling */}
                <div className="relative mb-6">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold gradient-text">
                        $
                    </div>
                    <input
                        type="text"
                        inputMode="text"
                        pattern="[0-9.,]*"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0"
                        className="w-full pl-12 pr-4 py-4 bg-white/5 border-2 border-white/10 focus:border-emerald-500/50 rounded-xl text-3xl font-bold text-white placeholder-slate-600 focus:outline-none transition-all"
                        autoFocus
                    />
                    <p className="text-xs text-slate-500 mt-2 ml-1">Use . or , for decimals</p>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-slate-300 font-medium rounded-xl transition-all border border-white/10"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !amount}
                        className={`flex-1 py-3.5 font-semibold rounded-xl transition-all disabled:opacity-50 ${mode === "deposit"
                            ? "bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-lg shadow-emerald-500/20"
                            : "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-lg shadow-orange-500/20"
                            }`}
                    >
                        {isSubmitting ? "Processing..." : mode === "deposit" ? "Deposit" : "Withdraw"}
                    </button>
                </div>
            </div>
        </div>
    );
}
