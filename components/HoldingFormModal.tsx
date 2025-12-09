"use client";

import { useState, useEffect, FormEvent } from "react";
import { HoldingFormValues, AssetClass } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import SymbolSearch from "./SymbolSearch";

interface HoldingFormModalProps {
    open: boolean;
    mode: "create" | "edit";
    initialValues?: HoldingFormValues;
    availableCash?: number; // Available cash for validation (only for create mode)
    onClose: () => void;
    onSubmit: (values: HoldingFormValues) => void;
}



export default function HoldingFormModal({ open, mode, initialValues, availableCash, onClose, onSubmit }: HoldingFormModalProps) {
    const [formData, setFormData] = useState<HoldingFormValues>({
        symbol: "",
        name: "",
        assetClass: "STOCK",
        quantity: 0,
        avgBuyPrice: 0,
        currentPrice: 0,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [symbolSelected, setSymbolSelected] = useState(false);
    const [priceLoading, setPriceLoading] = useState(false);


    // Reset form when modal opens/closes or initialValues change
    useEffect(() => {
        if (open) {
            if (mode === "edit" && initialValues) {
                setFormData(initialValues);
                setSymbolSelected(true);
            } else {
                setFormData({
                    symbol: "",
                    name: "",
                    assetClass: "STOCK",
                    quantity: 0,
                    avgBuyPrice: 0,
                    currentPrice: 0,
                });
                setSymbolSelected(false);
            }
            setErrors({});
        }
    }, [open, mode, initialValues]);

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.symbol.trim()) {
            newErrors.symbol = "Symbol is required";
        }
        if (!formData.name.trim()) {
            newErrors.name = "Name is required";
        }
        if (formData.quantity <= 0) {
            newErrors.quantity = "Quantity must be greater than 0";
        }
        if (formData.avgBuyPrice <= 0) {
            newErrors.avgBuyPrice = "Average buy price must be greater than 0";
        }
        // Current price can be 0 if API failed, we'll use avg price as fallback
        if (formData.currentPrice <= 0 && formData.avgBuyPrice > 0) {
            // Auto-fill with avg price if no current price
            setFormData(prev => ({ ...prev, currentPrice: prev.avgBuyPrice }));
        }

        // Validate sufficient funds for new purchases
        if (mode === "create" && availableCash !== undefined) {
            const totalCost = formData.quantity * formData.avgBuyPrice;
            if (totalCost > availableCash) {
                newErrors.quantity = `Fondos insuficientes. Disponible: ${formatCurrency(availableCash)}`;
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (validate()) {
            const finalData = {
                ...formData,
                symbol: formData.symbol.toUpperCase().trim(),
                name: formData.name.trim(),
                // Use avgBuyPrice as fallback if currentPrice is 0
                currentPrice: formData.currentPrice > 0 ? formData.currentPrice : formData.avgBuyPrice,
            };
            onSubmit(finalData);
            onClose();
        }
    };

    const handleChange = (field: keyof HoldingFormValues, value: string | number) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    // Parse number that may use comma or period as decimal separator
    const parseLocaleNumber = (value: string): number => {
        if (!value) return 0;
        // Replace comma with period for parsing
        const normalized = value.replace(",", ".");
        const parsed = parseFloat(normalized);
        return isNaN(parsed) ? 0 : parsed;
    };

    // Handle symbol selection from search
    const handleSymbolSelect = (result: { symbol: string; name: string; assetClass: AssetClass; currentPrice: number }) => {
        setFormData(prev => ({
            ...prev,
            symbol: result.symbol,
            name: result.name,
            assetClass: result.assetClass,
            currentPrice: result.currentPrice,
        }));
        setSymbolSelected(true);
        setErrors({});
    };

    if (!open) return null;

    const isEditMode = mode === "edit";
    const showLivePrice = formData.currentPrice > 0 && symbolSelected;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        {mode === "create" ? (
                            <>
                                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Add New Holding
                            </>
                        ) : (
                            <>
                                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit Holding
                            </>
                        )}
                    </h2>
                    {mode === "create" && availableCash !== undefined && (
                        <div className="mt-2 text-sm text-slate-400">
                            Disponible: <span className="text-emerald-400 font-medium">{formatCurrency(availableCash)}</span>
                        </div>
                    )}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Symbol Search (only for create mode) */}
                    {!isEditMode ? (
                        <SymbolSearch
                            onSelect={handleSymbolSelect}
                            initialSymbol={formData.symbol}
                        />
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="symbol" className="block text-sm font-medium text-slate-300 mb-1">
                                    Symbol
                                </label>
                                <input
                                    id="symbol"
                                    type="text"
                                    value={formData.symbol}
                                    disabled
                                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 font-mono opacity-60"
                                />
                            </div>
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
                                    Name
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleChange("name", e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
                                />
                            </div>
                        </div>
                    )}

                    {/* Selected Symbol Info */}
                    {symbolSelected && formData.symbol && (
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-100 text-lg">{formData.symbol}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${formData.assetClass === "ETF"
                                            ? "bg-blue-500/20 text-blue-400"
                                            : formData.assetClass === "CRYPTO"
                                                ? "bg-orange-500/20 text-orange-400"
                                                : "bg-emerald-500/20 text-emerald-400"
                                            }`}>
                                            {formData.assetClass === "ETF" ? "ETF" : formData.assetClass === "CRYPTO" ? "Crypto" : "Stock"}
                                        </span>
                                    </div>
                                    <div className="text-sm text-slate-400">{formData.name}</div>
                                </div>
                                {showLivePrice && (
                                    <div className="text-right">
                                        <div className="text-xs text-slate-500">Live Price</div>
                                        <div className="text-xl font-bold text-emerald-400">
                                            {formatCurrency(formData.currentPrice)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Asset class is now auto-detected - just show a badge in the symbol info */}

                    {/* Quantity */}
                    <div>
                        <label htmlFor="quantity" className="block text-sm font-medium text-slate-300 mb-1">
                            Quantity *
                        </label>
                        <input
                            id="quantity"
                            type="text"
                            inputMode="decimal"
                            value={formData.quantity || ""}
                            onChange={(e) => handleChange("quantity", parseLocaleNumber(e.target.value))}
                            placeholder="10 (usa . o , para decimales)"
                            className={`w-full px-3 py-2.5 bg-slate-800 border ${errors.quantity ? "border-red-500" : "border-slate-700"
                                } rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                        />
                        {errors.quantity && <p className="text-red-400 text-xs mt-1">{errors.quantity}</p>}
                    </div>

                    {/* Average Buy Price */}
                    <div>
                        <label htmlFor="avgBuyPrice" className="block text-sm font-medium text-slate-300 mb-1">
                            Tu precio promedio de compra *
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                            <input
                                id="avgBuyPrice"
                                type="text"
                                inputMode="decimal"
                                value={formData.avgBuyPrice || ""}
                                onChange={(e) => handleChange("avgBuyPrice", parseLocaleNumber(e.target.value))}
                                placeholder="150.00 (usa . o ,)"
                                className={`w-full pl-8 pr-3 py-2.5 bg-slate-800 border ${errors.avgBuyPrice ? "border-red-500" : "border-slate-700"
                                    } rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
                            />
                        </div>
                        {errors.avgBuyPrice && <p className="text-red-400 text-xs mt-1">{errors.avgBuyPrice}</p>}
                        <p className="text-xs text-slate-500 mt-1">
                            El precio que pagaste por acción/unidad
                        </p>
                    </div>

                    {/* P/L Preview */}
                    {symbolSelected && formData.currentPrice > 0 && formData.avgBuyPrice > 0 && formData.quantity > 0 && (
                        <div className={`rounded-xl p-4 ${formData.currentPrice >= formData.avgBuyPrice
                            ? "bg-emerald-500/10 border border-emerald-500/20"
                            : "bg-red-500/10 border border-red-500/20"
                            }`}>
                            <div className="text-xs text-slate-400 mb-1">Unrealized P/L (preview)</div>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-xl font-bold ${formData.currentPrice >= formData.avgBuyPrice ? "text-emerald-400" : "text-red-400"
                                    }`}>
                                    {formData.currentPrice >= formData.avgBuyPrice ? "+" : ""}
                                    {formatCurrency((formData.currentPrice - formData.avgBuyPrice) * formData.quantity)}
                                </span>
                                <span className={`text-sm ${formData.currentPrice >= formData.avgBuyPrice ? "text-emerald-400" : "text-red-400"
                                    }`}>
                                    ({formData.currentPrice >= formData.avgBuyPrice ? "+" : ""}
                                    {(((formData.currentPrice - formData.avgBuyPrice) / formData.avgBuyPrice) * 100).toFixed(2)}%)
                                </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                                Position value: {formatCurrency(formData.currentPrice * formData.quantity)}
                            </div>
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!symbolSelected && !isEditMode}
                            className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:from-slate-700 disabled:to-slate-700 text-white font-medium rounded-lg transition-all disabled:cursor-not-allowed"
                        >
                            {mode === "create" ? "Add Holding" : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
