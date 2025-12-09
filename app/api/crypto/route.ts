// API Route for searching crypto symbols and getting prices using CoinGecko
// CoinGecko is FREE - no API key needed!
// 
// Usage: 
// GET /api/crypto?q=bitcoin - Search for crypto
// GET /api/crypto?id=bitcoin - Get price for specific crypto

import { NextRequest, NextResponse } from "next/server";

interface CoinGeckoSearchCoin {
    id: string;
    name: string;
    symbol: string;
    thumb: string;
}

interface CoinGeckoSearchResult {
    coins: CoinGeckoSearchCoin[];
}

interface CoinGeckoPriceResult {
    [id: string]: { usd: number };
}

export interface CryptoSearchResult {
    id: string;
    symbol: string;
    name: string;
    thumb?: string;
}

const COINGECKO_API = "https://api.coingecko.com/api/v3";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get("q");
        const id = searchParams.get("id");

        // Search mode
        if (query) {
            if (query.trim().length === 0) {
                return NextResponse.json({ results: [] });
            }

            const url = `${COINGECKO_API}/search?query=${encodeURIComponent(query)}`;

            const response = await fetch(url, {
                headers: { "Accept": "application/json" },
                next: { revalidate: 300 }, // Cache for 5 minutes
            });

            if (!response.ok) {
                console.error("CoinGecko search error:", response.status);
                return NextResponse.json(
                    { error: "Failed to search crypto" },
                    { status: response.status }
                );
            }

            const data: CoinGeckoSearchResult = await response.json();

            const results: CryptoSearchResult[] = (data.coins || [])
                .slice(0, 12)
                .map((coin) => ({
                    id: coin.id,
                    symbol: coin.symbol.toUpperCase(),
                    name: coin.name,
                    thumb: coin.thumb,
                }));

            return NextResponse.json({ results, query });
        }

        // Price mode
        if (id) {
            const url = `${COINGECKO_API}/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd`;

            const response = await fetch(url, {
                headers: { "Accept": "application/json" },
                next: { revalidate: 60 }, // Cache price for 1 minute
            });

            if (!response.ok) {
                console.error("CoinGecko price error:", response.status);
                return NextResponse.json(
                    { error: "Failed to get crypto price" },
                    { status: response.status }
                );
            }

            const data: CoinGeckoPriceResult = await response.json();

            if (data[id] && data[id].usd) {
                return NextResponse.json({
                    price: data[id].usd,
                    id
                });
            }

            return NextResponse.json({ error: "Price not found" }, { status: 404 });
        }

        return NextResponse.json(
            { error: "Missing 'q' for search or 'id' for price" },
            { status: 400 }
        );

    } catch (error) {
        console.error("Crypto API error:", error);
        return NextResponse.json(
            { error: "Failed to access CoinGecko API" },
            { status: 500 }
        );
    }
}
