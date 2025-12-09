"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AssetClass } from "@/lib/types";

interface StockSearchResult {
    symbol: string;
    name: string;
    type: string;
    displaySymbol: string;
}

interface CryptoSearchResult {
    id: string;
    symbol: string;
    name: string;
    thumb?: string;
}

interface SymbolSearchProps {
    onSelect: (result: { symbol: string; name: string; assetClass: AssetClass; currentPrice: number; cryptoId?: string }) => void;
    disabled?: boolean;
    initialSymbol?: string;
}

type SearchMode = "stocks" | "crypto";

// Determine asset class from Finnhub type
function getAssetClass(type: string): AssetClass {
    const lowerType = type.toLowerCase();
    if (lowerType.includes("etf") || lowerType.includes("etp")) {
        return "ETF";
    }
    return "STOCK";
}

export default function SymbolSearch({ onSelect, disabled, initialSymbol }: SymbolSearchProps) {
    const [query, setQuery] = useState(initialSymbol || "");
    const [stockResults, setStockResults] = useState<StockSearchResult[]>([]);
    const [cryptoResults, setCryptoResults] = useState<CryptoSearchResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingPrice, setIsFetchingPrice] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedSymbol, setSelectedSymbol] = useState<string | null>(initialSymbol || null);
    const [searchMode, setSearchMode] = useState<SearchMode>("stocks");
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Debounced search
    const searchSymbols = useCallback(async (searchQuery: string, mode: SearchMode) => {
        if (searchQuery.trim().length < 1) {
            setStockResults([]);
            setCryptoResults([]);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            if (mode === "stocks") {
                const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
                const data = await response.json();

                if (data.error) {
                    setError(data.error);
                    setStockResults([]);
                } else {
                    setStockResults(data.results || []);
                }
                setCryptoResults([]);
            } else {
                const response = await fetch(`/api/crypto?q=${encodeURIComponent(searchQuery)}`);
                const data = await response.json();

                if (data.error) {
                    setError(data.error);
                    setCryptoResults([]);
                } else {
                    setCryptoResults(data.results || []);
                }
                setStockResults([]);
            }
        } catch (err) {
            setError("Failed to search");
            setStockResults([]);
            setCryptoResults([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Handle input change with debounce
    const handleInputChange = (value: string) => {
        setQuery(value.toUpperCase());
        setSelectedSymbol(null);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            searchSymbols(value, searchMode);
            setIsOpen(true);
        }, 300);
    };

    // Handle mode change
    const handleModeChange = (mode: SearchMode) => {
        setSearchMode(mode);
        if (query.trim().length > 0) {
            searchSymbols(query, mode);
        }
    };

    // Fetch live price for stock
    const fetchStockPrice = async (symbol: string): Promise<number | null> => {
        try {
            const response = await fetch("/api/quote", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ symbols: [symbol] }),
            });
            const data = await response.json();

            if (data.prices && data.prices[symbol]) {
                return data.prices[symbol];
            }
            return null;
        } catch {
            return null;
        }
    };

    // Fetch price for crypto
    const fetchCryptoPrice = async (id: string): Promise<number | null> => {
        try {
            const response = await fetch(`/api/crypto?id=${encodeURIComponent(id)}`);
            const data = await response.json();

            if (data.price) {
                return data.price;
            }
            return null;
        } catch {
            return null;
        }
    };

    // Handle stock selection
    const handleStockSelect = async (result: StockSearchResult) => {
        setQuery(result.symbol);
        setSelectedSymbol(result.symbol);
        setIsOpen(false);
        setStockResults([]);

        setIsFetchingPrice(true);
        const price = await fetchStockPrice(result.symbol);
        setIsFetchingPrice(false);

        onSelect({
            symbol: result.symbol,
            name: result.name,
            assetClass: getAssetClass(result.type),
            currentPrice: price || 0,
        });
    };

    // Handle crypto selection
    const handleCryptoSelect = async (result: CryptoSearchResult) => {
        setQuery(result.symbol);
        setSelectedSymbol(result.symbol);
        setIsOpen(false);
        setCryptoResults([]);

        setIsFetchingPrice(true);
        const price = await fetchCryptoPrice(result.id);
        setIsFetchingPrice(false);

        onSelect({
            symbol: result.symbol,
            name: result.name,
            assetClass: "CRYPTO",
            currentPrice: price || 0,
            cryptoId: result.id,
        });
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    const results = searchMode === "stocks" ? stockResults : cryptoResults;

    return (
        <div ref={containerRef} className="relative">
            <label className="block text-sm font-medium text-slate-300 mb-1">
                Search Asset *
            </label>

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-2">
                <button
                    type="button"
                    onClick={() => handleModeChange("stocks")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${searchMode === "stocks"
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                        }`}
                >
                    📈 Stocks & ETFs
                </button>
                <button
                    type="button"
                    onClick={() => handleModeChange("crypto")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${searchMode === "crypto"
                            ? "bg-orange-600 text-white"
                            : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                        }`}
                >
                    ₿ Crypto
                </button>
            </div>

            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => query.length > 0 && results.length > 0 && setIsOpen(true)}
                    placeholder={searchMode === "stocks" ? "Search AAPL, TSLA, VOO..." : "Search Bitcoin, Ethereum..."}
                    disabled={disabled}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono disabled:opacity-50"
                />
                {(isLoading || isFetchingPrice) && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
                {selectedSymbol && !isLoading && !isFetchingPrice && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && (results.length > 0 || error) && (
                <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
                    {error ? (
                        <div className="px-4 py-3 text-red-400 text-sm">{error}</div>
                    ) : searchMode === "stocks" ? (
                        stockResults.map((result) => (
                            <button
                                key={`${result.symbol}-${result.displaySymbol}`}
                                onClick={() => handleStockSelect(result)}
                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/50 transition-colors text-left border-b border-slate-700/50 last:border-b-0"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${result.type?.includes("ETF") || result.type?.includes("ETP")
                                            ? "bg-blue-500/20 text-blue-400"
                                            : "bg-emerald-500/20 text-emerald-400"
                                        }`}>
                                        {result.type?.includes("ETF") || result.type?.includes("ETP") ? "ETF" : "S"}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-slate-100">{result.symbol}</div>
                                        <div className="text-sm text-slate-400 truncate max-w-[250px]">
                                            {result.name}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500">
                                    {result.type?.includes("ETF") || result.type?.includes("ETP") ? "ETF" : "Stock"}
                                </div>
                            </button>
                        ))
                    ) : (
                        cryptoResults.map((result) => (
                            <button
                                key={result.id}
                                onClick={() => handleCryptoSelect(result)}
                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/50 transition-colors text-left border-b border-slate-700/50 last:border-b-0"
                            >
                                <div className="flex items-center gap-3">
                                    {result.thumb ? (
                                        <img
                                            src={result.thumb}
                                            alt={result.name}
                                            className="w-8 h-8 rounded-full"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold">
                                            ₿
                                        </div>
                                    )}
                                    <div>
                                        <div className="font-semibold text-slate-100">{result.symbol}</div>
                                        <div className="text-sm text-slate-400 truncate max-w-[250px]">
                                            {result.name}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-xs text-orange-400">
                                    Crypto
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}

            {/* No results message */}
            {isOpen && query.length > 0 && !isLoading && results.length === 0 && !error && (
                <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl px-4 py-3 text-slate-400 text-sm">
                    No {searchMode === "stocks" ? "stocks/ETFs" : "cryptocurrencies"} found for &quot;{query}&quot;
                </div>
            )}

            {isFetchingPrice && (
                <div className="mt-2 text-xs text-slate-400 flex items-center gap-2">
                    <div className="w-3 h-3 border border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    Fetching live price...
                </div>
            )}
        </div>
    );
}
