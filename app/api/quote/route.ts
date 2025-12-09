// API Route for fetching live stock/ETF quotes from Finnhub
// 
// To use this, you need a free Finnhub API key:
// 1. Register at https://finnhub.io
// 2. Get your API key
// 3. Add to .env.local: FINNHUB_API_KEY=your_key_here
//
// Note: Finnhub's free tier supports stocks and ETFs, not crypto.
// Crypto prices must be entered manually or use a different API.

import { NextRequest, NextResponse } from "next/server";

interface QuoteRequestBody {
    symbols: string[];
}

interface FinnhubQuoteResponse {
    c: number;  // Current price
    d: number;  // Change
    dp: number; // Percent change
    h: number;  // High of the day
    l: number;  // Low of the day
    o: number;  // Open price
    pc: number; // Previous close
    t: number;  // Timestamp
}

export async function POST(request: NextRequest) {
    try {
        const body: QuoteRequestBody = await request.json();
        const { symbols } = body;

        if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
            return NextResponse.json(
                { error: "Missing or invalid 'symbols' array in request body" },
                { status: 400 }
            );
        }

        const apiKey = process.env.FINNHUB_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: "FINNHUB_API_KEY not configured. Add it to .env.local" },
                { status: 500 }
            );
        }

        // Fetch quotes for all symbols
        const results: Record<string, number | null> = {};
        const errors: string[] = [];

        // Use Promise.all for parallel requests (Finnhub allows 60 req/min on free tier)
        const fetchPromises = symbols.map(async (symbol) => {
            try {
                const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol.toUpperCase())}&token=${apiKey}`;
                const response = await fetch(url, {
                    headers: { "Accept": "application/json" },
                    next: { revalidate: 60 }, // Cache for 60 seconds
                });

                if (!response.ok) {
                    errors.push(`${symbol}: HTTP ${response.status}`);
                    results[symbol] = null;
                    return;
                }

                const data: FinnhubQuoteResponse = await response.json();

                // Finnhub returns 0 for 'c' (current price) if symbol not found
                if (data.c && data.c > 0) {
                    results[symbol] = data.c;
                } else {
                    errors.push(`${symbol}: No price data`);
                    results[symbol] = null;
                }
            } catch (err) {
                errors.push(`${symbol}: ${err instanceof Error ? err.message : "Unknown error"}`);
                results[symbol] = null;
            }
        });

        await Promise.all(fetchPromises);

        return NextResponse.json({
            prices: results,
            errors: errors.length > 0 ? errors : undefined,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error("Quote API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch quotes" },
            { status: 500 }
        );
    }
}

// GET method for simple health check
export async function GET() {
    const hasApiKey = !!process.env.FINNHUB_API_KEY;
    return NextResponse.json({
        status: "ok",
        apiKeyConfigured: hasApiKey,
        message: hasApiKey
            ? "API key configured. POST with { symbols: ['AAPL', 'MSFT'] } to get quotes."
            : "FINNHUB_API_KEY not configured. Add it to .env.local",
    });
}
