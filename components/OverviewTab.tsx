"use client";

import { useState, useEffect, useCallback } from "react";
import { GroupState, Holding } from "@/lib/types";
import { GroupDataHelpers } from "@/lib/useGroupData";
import { getTotalPortfolioValue, getTotalPnl, getTotalPnlPercent, getAssetClassBreakdown, formatCurrency, formatPercent, getHoldingPnl, getHoldingPnlPercent, getHoldingValue } from "@/lib/utils";
import DonutChart from "./DonutChart";
import PerformanceChart from "./PerformanceChart";

interface OverviewTabProps {
    group: GroupState;
    helpers: GroupDataHelpers;
}

// Asset class colors - Robinhood inspired
const ASSET_COLORS: Record<string, string> = {
    STOCK: "#00C805",    // Green (Robinhood's signature)
    CRYPTO: "#F7931A",   // Bitcoin orange
    ETF: "#5AC8FA",      // Light blue
    OTHER: "#8E8E93",    // Gray
    CASH: "#10B981",     // Emerald for cash
};

// Auto-refresh interval (10 seconds)
const AUTO_REFRESH_INTERVAL = 10 * 1000;

export default function OverviewTab({ group, helpers }: OverviewTabProps) {
    const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshError, setRefreshError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [nextRefreshIn, setNextRefreshIn] = useState<number>(0);

    // Calculate total group value from all holdings
    const totalHoldingsValue = getTotalPortfolioValue(group.holdings);
    const totalCash = group.members.reduce((sum, m) => sum + m.cashBalance, 0);
    const totalValue = totalHoldingsValue + totalCash;
    const totalPnl = getTotalPnl(group.holdings);
    const totalPnlPercent = getTotalPnlPercent(group.holdings);

    // Asset allocation breakdown (including cash)
    const assetBreakdown = getAssetClassBreakdown(group.holdings);

    // Add cash to breakdown if there is any
    const chartData = [
        ...Object.entries(assetBreakdown)
            .map(([name, value]) => ({
                name,
                value,
                color: ASSET_COLORS[name] || ASSET_COLORS.OTHER,
            })),
        ...(totalCash > 0 ? [{ name: "CASH", value: totalCash, color: ASSET_COLORS.CASH }] : [])
    ].sort((a, b) => b.value - a.value);

    // Get all unique holdings grouped by asset class
    const stockHoldings = group.holdings.filter(h => h.assetClass === "STOCK" || h.assetClass === "ETF");
    const cryptoHoldings = group.holdings.filter(h => h.assetClass === "CRYPTO");

    // Aggregate holdings by symbol
    const aggregateHoldings = (holdings: Holding[]) => {
        const aggregated: Record<string, {
            symbol: string;
            name: string;
            assetClass: string;
            totalQuantity: number;
            totalValue: number;
            totalCost: number;
            currentPrice: number;
            holders: string[];
        }> = {};

        holdings.forEach(h => {
            const member = group.members.find(m => m.id === h.memberId);
            if (!aggregated[h.symbol]) {
                aggregated[h.symbol] = {
                    symbol: h.symbol,
                    name: h.name,
                    assetClass: h.assetClass,
                    totalQuantity: 0,
                    totalValue: 0,
                    totalCost: 0,
                    currentPrice: h.currentPrice,
                    holders: [],
                };
            }
            aggregated[h.symbol].totalQuantity += h.quantity;
            aggregated[h.symbol].totalValue += h.quantity * h.currentPrice;
            aggregated[h.symbol].totalCost += h.quantity * h.avgBuyPrice;
            if (member && !aggregated[h.symbol].holders.includes(member.name)) {
                aggregated[h.symbol].holders.push(member.name);
            }
        });

        return Object.values(aggregated).sort((a, b) => b.totalValue - a.totalValue);
    };

    const aggregatedStocks = aggregateHoldings(stockHoldings);
    const aggregatedCrypto = aggregateHoldings(cryptoHoldings);

    // Get symbols that can be refreshed 
    const stockSymbols = [...new Set(
        group.holdings
            .filter(h => h.assetClass === "STOCK" || h.assetClass === "ETF")
            .map(h => h.symbol)
    )];

    // Get crypto IDs
    const cryptoSymbols = [...new Set(
        group.holdings
            .filter(h => h.assetClass === "CRYPTO")
            .map(h => h.symbol.toLowerCase())
    )];

    const handleRefreshPrices = useCallback(async (showLoading = true) => {
        if (stockSymbols.length === 0 && cryptoSymbols.length === 0) return;

        if (showLoading) setIsRefreshing(true);
        setRefreshError(null);

        const validPrices: Record<string, number> = {};

        try {
            // Refresh stock/ETF prices
            if (stockSymbols.length > 0) {
                const response = await fetch("/api/quote", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ symbols: stockSymbols }),
                });

                const data = await response.json();

                if (data.prices) {
                    for (const [symbol, price] of Object.entries(data.prices)) {
                        if (typeof price === "number" && price > 0) {
                            validPrices[symbol] = price;
                        }
                    }
                }
            }

            // Refresh crypto prices
            for (const symbol of cryptoSymbols) {
                try {
                    const cryptoIdMap: Record<string, string> = {
                        "btc": "bitcoin",
                        "eth": "ethereum",
                        "sol": "solana",
                        "xrp": "ripple",
                        "ada": "cardano",
                        "doge": "dogecoin",
                        "dot": "polkadot",
                        "link": "chainlink",
                        "matic": "matic-network",
                        "avax": "avalanche-2",
                    };

                    const cryptoId = cryptoIdMap[symbol] || symbol;
                    const response = await fetch(`/api/crypto?id=${cryptoId}`);
                    const data = await response.json();

                    if (data.price) {
                        validPrices[symbol.toUpperCase()] = data.price;
                    }
                } catch {
                    // Skip failed crypto lookups
                }
            }

            if (Object.keys(validPrices).length > 0) {
                helpers.updateHoldingPrices(validPrices);
            }

            setLastRefresh(new Date());
        } catch (error) {
            console.error("Failed to refresh prices:", error);
            setRefreshError(error instanceof Error ? error.message : "Failed to refresh prices");
        } finally {
            if (showLoading) setIsRefreshing(false);
        }
    }, [stockSymbols, cryptoSymbols, helpers]);

    // Auto-refresh timer
    useEffect(() => {
        if (stockSymbols.length === 0 && cryptoSymbols.length === 0) return;

        // Initial refresh on mount
        handleRefreshPrices(false);

        // Set up auto-refresh interval
        const intervalId = setInterval(() => {
            handleRefreshPrices(false);
        }, AUTO_REFRESH_INTERVAL);

        return () => clearInterval(intervalId);
    }, [stockSymbols.length, cryptoSymbols.length]); // Only re-setup when holdings change

    // Countdown timer for next refresh display
    useEffect(() => {
        if (!lastRefresh) return;

        const updateCountdown = () => {
            const elapsed = Date.now() - lastRefresh.getTime();
            const remaining = Math.max(0, AUTO_REFRESH_INTERVAL - elapsed);
            setNextRefreshIn(Math.ceil(remaining / 1000));
        };

        updateCountdown();
        const countdownId = setInterval(updateCountdown, 1000);

        return () => clearInterval(countdownId);
    }, [lastRefresh]);

    // Empty state
    if (group.members.length === 0) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-100">Group Overview</h2>
                    <p className="text-slate-400 mt-1">Track the overall performance of your investment group</p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-12 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                        <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-slate-200 mb-2">No investors yet</h3>
                    <p className="text-slate-400 max-w-md mx-auto">
                        Create your profile to start tracking portfolios.
                        Each investor can have their own holdings and performance metrics.
                    </p>
                </div>
            </div>
        );
    }

    if (group.holdings.length === 0 && totalCash === 0) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-100">Group Overview</h2>
                    <p className="text-slate-400 mt-1">Track the overall performance of your investment group</p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-12 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                        <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-slate-200 mb-2">No holdings yet</h3>
                    <p className="text-slate-400 max-w-md mx-auto">
                        Your investors don&apos;t have any holdings yet. Go to the Investors tab,
                        select an investor, and add their first position.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Refresh */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-100">Group Overview</h2>
                    <p className="text-slate-400 mt-1">{group.name} · {group.members.length} investor{group.members.length !== 1 ? "s" : ""}</p>
                </div>

                {(stockSymbols.length > 0 || cryptoSymbols.length > 0) && (
                    <button
                        onClick={() => handleRefreshPrices(true)}
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
                        {isRefreshing ? "Refreshing..." : "Refresh Prices"}
                    </button>
                )}
            </div>

            {refreshError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
                    {refreshError}
                </div>
            )}

            {/* Performance Chart - Robinhood Style */}
            <PerformanceChart currentValue={totalValue} hasHoldings={group.holdings.length > 0} />

            {/* Asset Allocation - Robinhood Style */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-slate-100 mb-6">Asset Allocation</h3>

                <div className="flex flex-col lg:flex-row items-center gap-8">
                    {/* Category List */}
                    <div className="flex-1 w-full space-y-2">
                        {chartData.map((item) => {
                            const percentage = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
                            const isHighlighted = highlightedCategory === item.name;

                            const displayName = item.name === "STOCK" ? "Stocks" :
                                item.name === "CRYPTO" ? "Cryptocurrencies" :
                                    item.name === "ETF" ? "ETFs" :
                                        item.name === "CASH" ? "Cash" : "Other";

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
                                            {displayName}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-slate-400 text-sm">
                                            {percentage.toFixed(1)}%
                                        </div>
                                        <div className="font-medium text-slate-200">
                                            {formatCurrency(item.value)}
                                        </div>
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
                            size={280}
                        />
                    </div>
                </div>
            </div>

            {/* Stocks Holdings Table */}
            {aggregatedStocks.length > 0 && (
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ASSET_COLORS.STOCK }} />
                        <h3 className="text-lg font-semibold text-slate-100">Stocks</h3>
                        <span className="text-slate-400 text-sm">({aggregatedStocks.length} positions)</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-800/50 border-b border-slate-700">
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Symbol</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Shares</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Price</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Cost</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Return</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Equity</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {aggregatedStocks.map((stock) => {
                                    const pnl = stock.totalValue - stock.totalCost;
                                    const pnlPercent = stock.totalCost > 0 ? (pnl / stock.totalCost) * 100 : 0;
                                    const avgCost = stock.totalQuantity > 0 ? stock.totalCost / stock.totalQuantity : 0;

                                    return (
                                        <tr key={stock.symbol} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-100">{stock.name}</div>
                                                <div className="text-xs text-slate-500">
                                                    {stock.holders.length > 0 && `Held by: ${stock.holders.join(", ")}`}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-300 font-medium">{stock.symbol}</td>
                                            <td className="px-6 py-4 text-right text-slate-300">
                                                {stock.totalQuantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-300">{formatCurrency(stock.currentPrice)}</td>
                                            <td className="px-6 py-4 text-right text-slate-300">{formatCurrency(avgCost)}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className={`font-medium ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                    {pnl >= 0 ? "▲" : "▼"} {formatCurrency(Math.abs(pnl))}
                                                </div>
                                                <div className={`text-sm ${pnlPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                    {pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-slate-100">
                                                {formatCurrency(stock.totalValue)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Crypto Holdings Table */}
            {aggregatedCrypto.length > 0 && (
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ASSET_COLORS.CRYPTO }} />
                        <h3 className="text-lg font-semibold text-slate-100">Cryptocurrencies</h3>
                        <span className="text-slate-400 text-sm">({aggregatedCrypto.length} positions)</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-800/50 border-b border-slate-700">
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Symbol</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Quantity</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Price</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Cost</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Return</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Equity</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {aggregatedCrypto.map((crypto) => {
                                    const pnl = crypto.totalValue - crypto.totalCost;
                                    const pnlPercent = crypto.totalCost > 0 ? (pnl / crypto.totalCost) * 100 : 0;
                                    const avgCost = crypto.totalQuantity > 0 ? crypto.totalCost / crypto.totalQuantity : 0;

                                    return (
                                        <tr key={crypto.symbol} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-100">{crypto.name}</div>
                                                <div className="text-xs text-slate-500">
                                                    {crypto.holders.length > 0 && `Held by: ${crypto.holders.join(", ")}`}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-300 font-medium">{crypto.symbol}</td>
                                            <td className="px-6 py-4 text-right text-slate-300">
                                                {crypto.totalQuantity.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-300">{formatCurrency(crypto.currentPrice)}</td>
                                            <td className="px-6 py-4 text-right text-slate-300">{formatCurrency(avgCost)}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className={`font-medium ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                    {pnl >= 0 ? "▲" : "▼"} {formatCurrency(Math.abs(pnl))}
                                                </div>
                                                <div className={`text-sm ${pnlPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                    {pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-slate-100">
                                                {formatCurrency(crypto.totalValue)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Holdings</div>
                    <div className="text-xl font-bold text-slate-200">
                        {formatCurrency(totalHoldingsValue)}
                    </div>
                </div>
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Cash</div>
                    <div className="text-xl font-bold text-emerald-400">
                        {formatCurrency(totalCash)}
                    </div>
                </div>
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Unrealized P/L</div>
                    <div className={`text-xl font-bold ${totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {formatCurrency(totalPnl)}
                    </div>
                </div>
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl p-4">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Positions</div>
                    <div className="text-xl font-bold text-slate-200">{group.holdings.length}</div>
                </div>
            </div>
        </div>
    );
}

