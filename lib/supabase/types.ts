// Database types for Supabase

export interface UserProfile {
    id: string;                  // UUID from auth.users
    email: string;
    name: string;
    avatar_url?: string;
    cash_balance: number;
    total_realized_pnl: number;
    has_completed_setup: boolean;
    last_group_id?: string;      // Last visited group for quick access
    created_at: string;
    updated_at: string;
}

export interface UserHolding {
    id: string;
    user_id: string;             // FK → user_profiles
    symbol: string;
    name: string;
    asset_class: 'STOCK' | 'ETF' | 'CRYPTO' | 'OTHER';
    quantity: number;
    avg_buy_price: number;
    current_price: number;
    crypto_id?: string;          // For CoinGecko
    last_price_update?: string;
    created_at: string;
    updated_at: string;
}

export interface Group {
    id: string;
    name: string;
    password_hash: string;
    created_by: string;          // FK → user_profiles
    created_at: string;
}

export interface GroupMember {
    group_id: string;            // FK → groups
    user_id: string;             // FK → user_profiles
    joined_at: string;
}

export interface Activity {
    id: string;
    group_id: string;            // FK → groups
    user_id?: string;            // FK → user_profiles (null for system events)
    type: 'BUY' | 'SELL' | 'UPDATE' | 'NOTE' | 'DEPOSIT' | 'WITHDRAW' | 'JOIN';
    symbol?: string;
    title: string;
    description?: string;
    amount_change_usd?: number;
    created_at: string;
}

// Extended types with relations
export interface GroupWithMembers extends Group {
    members: UserProfile[];
}

export interface UserProfileWithHoldings extends UserProfile {
    holdings: UserHolding[];
}
