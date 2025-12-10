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

    const formatCurrency = (value: string) => {
        const num = value.replace(/[^0-9.]/g, "");
        if (!num) return "";
        const parsed = parseFloat(num);
        if (isNaN(parsed)) return "";
        return parsed.toLocaleString("en-US");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fadeIn">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-100">
                        {mode === "deposit" ? "💰 Deposit Cash" : "💸 Withdraw Cash"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-300 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="mb-4">
                    <p className="text-slate-400 text-sm mb-2">
                        Current Balance: <span className="text-emerald-400 font-semibold">${currentBalance.toLocaleString()}</span>
                    </p>
                </div>

                <div className="relative mb-4">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-emerald-500 font-bold">
                        $
                    </span>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0 (use . or , for decimals)"
                        className="w-full pl-10 pr-4 py-4 bg-slate-800 border-2 border-slate-700 focus:border-emerald-500 rounded-xl text-2xl font-bold text-slate-100 placeholder-slate-600 focus:outline-none transition-all"
                        autoFocus
                    />
                </div>

                {error && (
                    <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !amount}
                        className={`flex-1 py-3 font-semibold rounded-xl transition-all disabled:opacity-50 ${mode === "deposit"
                            ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white"
                            : "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white"
                            }`}
                    >
                        {isSubmitting ? "Processing..." : mode === "deposit" ? "Deposit" : "Withdraw"}
                    </button>
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out;
                }
            `}</style>
        </div>
    );
}
