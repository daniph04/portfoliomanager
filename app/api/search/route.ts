// API Route for searching stock/ETF symbols using Finnhub
// 
// Usage: GET /api/search?q=AAPL
// Returns matching symbols with company names

import { NextRequest, NextResponse } from "next/server";

interface FinnhubSearchResult {
    count: number;
    result: {
        description: string;      // Company name
        displaySymbol: string;    // Display symbol
        symbol: string;           // Ticker symbol
        type: string;             // Security type
    }[];
}

export interface SymbolSearchResult {
    symbol: string;
    name: string;
    type: string;
    displaySymbol: string;
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get("q");

        if (!query || query.trim().length === 0) {
            return NextResponse.json({ results: [] });
        }

        const apiKey = process.env.FINNHUB_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: "FINNHUB_API_KEY not configured. Add it to .env.local" },
                { status: 500 }
            );
        }

        // Call Finnhub symbol search API
        const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${apiKey}`;

        const response = await fetch(url, {
            headers: { "Accept": "application/json" },
            next: { revalidate: 300 }, // Cache for 5 minutes
        });

        if (!response.ok) {
            console.error("Finnhub search error:", response.status);
            return NextResponse.json(
                { error: "Failed to search symbols" },
                { status: response.status }
            );
        }

        const data: FinnhubSearchResult = await response.json();

        // Transform and filter results
        // Focus on US stocks/ETFs for simplicity
        const results: SymbolSearchResult[] = data.result
            .filter(item => {
                // Filter for common security types
                const validTypes = ["Common Stock", "ETP", "ETF", "ADR", "REIT"];
                return validTypes.some(t => item.type?.includes(t)) || item.type === "";
            })
            .slice(0, 15) // Limit results
            .map(item => ({
                symbol: item.symbol,
                name: item.description,
                type: item.type || "Stock",
                displaySymbol: item.displaySymbol,
            }));

        return NextResponse.json({
            results,
            query,
        });

    } catch (error) {
        console.error("Symbol search error:", error);
        return NextResponse.json(
            { error: "Failed to search symbols" },
            { status: 500 }
        );
    }
}
