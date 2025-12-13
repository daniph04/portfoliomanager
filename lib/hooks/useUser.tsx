"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { showLocalNotification, generateActivityNotification, shouldShowNotification } from '@/lib/notifications';

// Helper to send push notification to other group members
const sendPushToGroup = async (
    groupId: string,
    senderId: string,
    title: string,
    body: string,
    type: 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAW' | 'JOIN',
    symbol?: string
) => {
    try {
        await fetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupId, senderId, title, body, type, symbol }),
        });
    } catch (error) {
        console.error('Failed to send push notification:', error);
    }
};

// Types
export interface UserProfile {
    id: string;
    name: string;
    email: string;
    cashBalance: number;
    totalRealizedPnl: number;
    netDeposits: number;  // FINTECH: Track total deposits minus withdrawals
    createdAt: string;
}

export interface UserHolding {
    id: string;
    userId: string;
    symbol: string;
    name: string;
    assetClass: 'STOCK' | 'ETF' | 'CRYPTO' | 'OTHER';
    quantity: number;
    avgBuyPrice: number;
    currentPrice: number;
    cryptoId?: string;
    createdAt: string;
}

export interface Group {
    id: string;
    name: string;
    type?: 'private' | 'shared';
    createdBy: string;
    createdAt: string;
}

export interface ActivityItem {
    id: string;
    groupId: string;
    userId: string;
    type: 'BUY' | 'SELL' | 'UPDATE' | 'NOTE' | 'DEPOSIT' | 'WITHDRAW' | 'JOIN' | 'GROUP_CREATED' | 'SEASON_STARTED' | 'SEASON_ENDED';
    symbol?: string;
    title: string;
    description?: string;
    amountChangeUsd?: number;
    createdAt: string;
}

interface UserContextType {
    // State
    currentUser: UserProfile | null;
    authUser: User | null;
    users: UserProfile[];
    holdings: UserHolding[];
    groups: Group[];
    activity: ActivityItem[];
    currentGroup: Group | null;
    isLoading: boolean;
    isAuthenticated: boolean;

    // Auth actions
    signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
    signIn: (email: string, password: string) => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;

    // User actions
    updateUser: (data: Partial<UserProfile>) => Promise<void>;

    // Cash actions
    depositCash: (amount: number) => Promise<void>;
    withdrawCash: (amount: number) => Promise<void>;

    // Holdings actions
    addHolding: (holding: Omit<UserHolding, 'id' | 'userId' | 'createdAt'>) => Promise<UserHolding | null>;
    updateHolding: (id: string, data: Partial<UserHolding>) => Promise<void>;
    deleteHolding: (id: string) => Promise<void>;
    getUserHoldings: (userId?: string) => UserHolding[];

    // Group actions
    createGroup: (name: string, password: string, isPrivate?: boolean) => Promise<Group | null>;
    joinGroup: (name: string, password: string) => Promise<{ success: boolean; error?: string; group?: Group }>;
    leaveGroup: (groupId: string) => Promise<void>;
    setCurrentGroup: (groupId: string) => void;
    getUserGroups: () => Group[];
    getGroupMembers: (groupId: string) => UserProfile[];

    // Activity
    addActivity: (groupId: string, type: ActivityItem['type'], title: string, description?: string, symbol?: string, amount?: number) => Promise<void>;
    getGroupActivity: (groupId: string) => ActivityItem[];

    // Refresh
    refreshData: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Singleton Supabase client
let supabaseInstance: SupabaseClient | null = null;
function getSupabase() {
    if (!supabaseInstance) {
        supabaseInstance = createClient();
    }
    return supabaseInstance;
}

export function UserProvider({ children }: { children: ReactNode }) {
    const [authUser, setAuthUser] = useState<User | null>(null);
    const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [holdings, setHoldings] = useState<UserHolding[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const supabase = getSupabase();

    // Convert DB format to app format
    const toAppProfile = (p: any): UserProfile => ({
        id: p.id,
        name: p.name,
        email: p.email,
        cashBalance: Number(p.cash_balance) || 0,
        totalRealizedPnl: Number(p.total_realized_pnl) || 0,
        netDeposits: Number(p.net_deposits) || 0,  // FINTECH: Map from DB
        createdAt: p.created_at,
    });

    const toAppHolding = (h: any): UserHolding => ({
        id: h.id,
        userId: h.user_id,
        symbol: h.symbol,
        name: h.name,
        assetClass: h.asset_class,
        quantity: Number(h.quantity),
        avgBuyPrice: Number(h.avg_buy_price),
        currentPrice: Number(h.current_price),
        cryptoId: h.crypto_id,
        createdAt: h.created_at,
    });

    const toAppGroup = (g: any): Group => ({
        id: g.id,
        name: g.name,
        createdBy: g.created_by,
        createdAt: g.created_at,
    });

    const toAppActivity = (a: any): ActivityItem => ({
        id: a.id,
        groupId: a.group_id,
        userId: a.user_id,
        type: a.type,
        symbol: a.symbol,
        title: a.title,
        description: a.description,
        amountChangeUsd: a.amount_change_usd ? Number(a.amount_change_usd) : undefined,
        createdAt: a.created_at,
    });

    // Refresh all data
    const refreshData = useCallback(async () => {
        if (!authUser) return;

        try {
            // Get current user profile
            const { data: profileData } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (profileData) {
                setCurrentUser(toAppProfile(profileData));
            }

            // Get user's groups
            const { data: memberData } = await supabase
                .from('group_members')
                .select('group_id')
                .eq('user_id', authUser.id);

            if (memberData && memberData.length > 0) {
                const groupIds = memberData.map(m => m.group_id);

                // Get groups
                const { data: groupsData } = await supabase
                    .from('groups')
                    .select('*')
                    .in('id', groupIds);

                if (groupsData) {
                    setGroups(groupsData.map(toAppGroup));

                    // Auto-select first group if none selected
                    if (!currentGroupId && groupsData.length > 0) {
                        setCurrentGroupId(groupsData[0].id);
                    }
                }

                // Get all members of user's groups
                const { data: allMembersData } = await supabase
                    .from('group_members')
                    .select('user_id')
                    .in('group_id', groupIds);

                if (allMembersData) {
                    const userIds = [...new Set(allMembersData.map(m => m.user_id))];

                    // Get profiles
                    const { data: profilesData } = await supabase
                        .from('user_profiles')
                        .select('*')
                        .in('id', userIds);

                    if (profilesData) {
                        setUsers(profilesData.map(toAppProfile));
                    }

                    // Get holdings
                    const { data: holdingsData } = await supabase
                        .from('user_holdings')
                        .select('*')
                        .in('user_id', userIds);

                    if (holdingsData) {
                        setHoldings(holdingsData.map(toAppHolding));
                    }
                }

                // Get activity for current group
                if (currentGroupId) {
                    const { data: activityData } = await supabase
                        .from('activity')
                        .select('*')
                        .eq('group_id', currentGroupId)
                        .order('created_at', { ascending: false })
                        .limit(50);

                    if (activityData) {
                        setActivity(activityData.map(toAppActivity));
                    }
                }
            }
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    }, [authUser, currentGroupId, supabase]);

    // Initialize auth
    useEffect(() => {
        let isMounted = true;

        const init = async () => {
            try {
                // Use getSession() instead of getUser() for faster local session check
                const { data: { session } } = await supabase.auth.getSession();
                if (isMounted && session?.user) {
                    setAuthUser(session.user);
                }
            } catch (error) {
                console.error('Auth init error:', error);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        init();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (isMounted) {
                    setAuthUser(session?.user ?? null);
                    if (!session?.user) {
                        // Clear all data on logout
                        setCurrentUser(null);
                        setUsers([]);
                        setHoldings([]);
                        setGroups([]);
                        setActivity([]);
                        setCurrentGroupId(null);
                    }
                }
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [supabase]);

    // Refresh data when auth user changes
    useEffect(() => {
        if (authUser) {
            refreshData();
        }
    }, [authUser, refreshData]);

    // Sign up
    const signUp = async (email: string, password: string, name: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name } },
        });
        return { error: error?.message || null };
    };

    // Sign in
    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message || null };
    };

    // Sign out
    const signOut = async () => {
        await supabase.auth.signOut();
    };

    // Update user
    const updateUser = async (updates: Partial<UserProfile>) => {
        if (!authUser) return;

        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.cashBalance !== undefined) dbUpdates.cash_balance = updates.cashBalance;
        if (updates.totalRealizedPnl !== undefined) dbUpdates.total_realized_pnl = updates.totalRealizedPnl;
        if (updates.netDeposits !== undefined) dbUpdates.net_deposits = updates.netDeposits;

        await supabase
            .from('user_profiles')
            .update({ ...dbUpdates, updated_at: new Date().toISOString() })
            .eq('id', authUser.id);

        await refreshData();
    };

    // Deposit cash - FINTECH FIX: Also update netDeposits
    const depositCash = async (amount: number) => {
        if (!authUser || !currentUser) return;
        const newBalance = currentUser.cashBalance + amount;
        const newNetDeposits = (currentUser.netDeposits || 0) + amount;
        await updateUser({ cashBalance: newBalance, netDeposits: newNetDeposits });

        // Show local notification (only to self)
        if (shouldShowNotification('DEPOSIT')) {
            const notification = generateActivityNotification('DEPOSIT', currentUser.name, undefined, amount);
            showLocalNotification(notification);
        }

        // Add activity event
        if (currentGroupId) {
            await addActivity(
                currentGroupId,
                'DEPOSIT',
                `Deposited $${amount.toLocaleString()}`,
                'Added cash to portfolio',
                undefined,
                amount
            );
        }
    };

    // Withdraw cash - FINTECH FIX: Also update netDeposits
    const withdrawCash = async (amount: number) => {
        if (!authUser || !currentUser) return;
        if (amount > currentUser.cashBalance) {
            throw new Error('Insufficient funds');
        }
        const newBalance = currentUser.cashBalance - amount;
        const newNetDeposits = (currentUser.netDeposits || 0) - amount;
        await updateUser({ cashBalance: newBalance, netDeposits: newNetDeposits });

        // Show local notification (only to self)
        if (shouldShowNotification('WITHDRAW')) {
            const notification = generateActivityNotification('WITHDRAW', currentUser.name, undefined, amount);
            showLocalNotification(notification);
        }

        // Add activity event
        if (currentGroupId) {
            await addActivity(
                currentGroupId,
                'WITHDRAW',
                `Withdrew $${amount.toLocaleString()}`,
                'Removed cash from portfolio',
                undefined,
                -amount
            );
        }
    };

    // Add holding
    const addHolding = async (holding: Omit<UserHolding, 'id' | 'userId' | 'createdAt'>): Promise<UserHolding | null> => {
        if (!authUser) return null;

        const { data, error } = await supabase
            .from('user_holdings')
            .insert({
                user_id: authUser.id,
                symbol: holding.symbol,
                name: holding.name,
                asset_class: holding.assetClass,
                quantity: holding.quantity,
                avg_buy_price: holding.avgBuyPrice,
                current_price: holding.currentPrice,
                crypto_id: holding.cryptoId,
            })
            .select()
            .single();

        if (error) {
            console.error('Error adding holding:', error);
            return null;
        }

        // Show local notification
        if (shouldShowNotification('BUY') && data) {
            const totalCost = holding.quantity * holding.avgBuyPrice;
            const notification = generateActivityNotification('BUY', currentUser?.name || 'You', holding.symbol, totalCost);
            showLocalNotification(notification);
        }

        // Send push to other group members
        if (currentGroupId && currentUser && data) {
            const totalCost = holding.quantity * holding.avgBuyPrice;
            const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalCost);
            sendPushToGroup(
                currentGroupId,
                authUser.id,
                `${currentUser.name} bought ${holding.symbol}`,
                `Invested ${formattedAmount} in ${holding.name}`,
                'BUY',
                holding.symbol
            );
        }

        // Add activity event
        if (currentGroupId && data) {
            const totalCost = holding.quantity * holding.avgBuyPrice;
            await addActivity(
                currentGroupId,
                'BUY',
                `Bought ${holding.symbol}`,
                `Bought ${holding.quantity} at $${holding.avgBuyPrice.toFixed(2)} (total: $${totalCost.toLocaleString()})`,
                holding.symbol,
                -totalCost
            );
        }

        await refreshData();
        return data ? toAppHolding(data) : null;
    };

    // Update holding
    const updateHolding = async (id: string, updates: Partial<UserHolding>) => {
        const dbUpdates: any = { updated_at: new Date().toISOString() };
        if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
        if (updates.avgBuyPrice !== undefined) dbUpdates.avg_buy_price = updates.avgBuyPrice;
        if (updates.currentPrice !== undefined) dbUpdates.current_price = updates.currentPrice;

        await supabase
            .from('user_holdings')
            .update(dbUpdates)
            .eq('id', id);

        await refreshData();
    };

    // Delete holding (sell) - FIXED: Now adds cash from sale
    const deleteHolding = async (id: string) => {
        if (!authUser || !currentUser) return;

        // Find the holding to get details for sale
        const holdingToSell = holdings.find(h => h.id === id);
        if (!holdingToSell) return;

        // Calculate sale proceeds and P/L
        const saleValue = holdingToSell.quantity * holdingToSell.currentPrice;
        const costBasis = holdingToSell.quantity * holdingToSell.avgBuyPrice;
        const realizedPL = saleValue - costBasis;

        // 1. Delete the holding
        await supabase.from('user_holdings').delete().eq('id', id);

        // 2. Update user's cash and realized P/L
        const newCashBalance = currentUser.cashBalance + saleValue;
        const newRealizedPnl = currentUser.totalRealizedPnl + realizedPL;

        await supabase.from('user_profiles')
            .update({
                cash_balance: newCashBalance,
                total_realized_pnl: newRealizedPnl
            })
            .eq('id', authUser.id);

        // Show local notification
        if (shouldShowNotification('SELL')) {
            const notification = generateActivityNotification('SELL', currentUser.name || 'You', holdingToSell.symbol, saleValue);
            showLocalNotification(notification);
        }

        // Send push to other group members
        if (currentGroupId) {
            const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(saleValue);
            sendPushToGroup(
                currentGroupId,
                authUser.id,
                `${currentUser.name} sold ${holdingToSell.symbol}`,
                `Closed position worth ${formattedAmount}`,
                'SELL',
                holdingToSell.symbol
            );
        }

        // Add activity event
        if (currentGroupId) {
            await addActivity(
                currentGroupId,
                'SELL',
                `Sold ${holdingToSell.symbol}`,
                `Sold ${holdingToSell.quantity} at $${holdingToSell.currentPrice.toFixed(2)}. Received $${saleValue.toLocaleString()}. P/L: ${realizedPL >= 0 ? '+' : ''}$${realizedPL.toFixed(2)}`,
                holdingToSell.symbol,
                realizedPL
            );
        }

        await refreshData();
    };

    // Get user holdings
    const getUserHoldings = useCallback((userId?: string) => {
        const targetId = userId || authUser?.id;
        return holdings.filter(h => h.userId === targetId);
    }, [holdings, authUser]);

    // Create group
    const createGroup = async (name: string, password: string, isPrivate: boolean = false): Promise<Group | null> => {
        if (!authUser) return null;

        const { data, error } = await supabase
            .from('groups')
            .insert({
                name: name.trim(),
                password_hash: btoa(password),
                created_by: authUser.id,
                type: isPrivate ? 'private' : 'shared',  // Set type based on isPrivate flag
            })
            .select()
            .single();

        if (error || !data) return null;

        // Join the group
        await supabase.from('group_members').insert({
            group_id: data.id,
            user_id: authUser.id,
        });

        // Add activity
        await supabase.from('activity').insert({
            group_id: data.id,
            user_id: authUser.id,
            type: 'JOIN',
            title: `${currentUser?.name || 'Someone'} created the group`,
        });

        await refreshData();
        setCurrentGroupId(data.id);
        return toAppGroup(data);
    };

    // Join group
    const joinGroup = async (name: string, password: string): Promise<{ success: boolean; error?: string; group?: Group }> => {
        if (!authUser) return { success: false, error: 'Not authenticated' };

        // Find group
        const { data: groupData } = await supabase
            .from('groups')
            .select('*')
            .ilike('name', name.trim())
            .single();

        if (!groupData) return { success: false, error: 'Group not found' };
        if (atob(groupData.password_hash) !== password) return { success: false, error: 'Wrong password' };

        // Check if already member
        const { data: existing } = await supabase
            .from('group_members')
            .select('*')
            .eq('group_id', groupData.id)
            .eq('user_id', authUser.id)
            .single();

        if (!existing) {
            // Join
            await supabase.from('group_members').insert({
                group_id: groupData.id,
                user_id: authUser.id,
            });

            // Add activity
            await supabase.from('activity').insert({
                group_id: groupData.id,
                user_id: authUser.id,
                type: 'JOIN',
                title: `${currentUser?.name || 'Someone'} joined the group`,
            });
        }

        await refreshData();
        setCurrentGroupId(groupData.id);
        return { success: true, group: toAppGroup(groupData) };
    };

    // Leave group
    const leaveGroup = async (groupId: string) => {
        if (!authUser) return;

        await supabase
            .from('group_members')
            .delete()
            .eq('group_id', groupId)
            .eq('user_id', authUser.id);

        await refreshData();
        if (currentGroupId === groupId) {
            setCurrentGroupId(groups.length > 1 ? groups.find(g => g.id !== groupId)?.id || null : null);
        }
    };

    // Set current group
    const setCurrentGroup = (groupId: string) => {
        setCurrentGroupId(groupId);
    };

    // Get user's groups
    const getUserGroups = useCallback(() => groups, [groups]);

    // Get group members
    const getGroupMembers = useCallback((groupId: string) => {
        // For now return all users since they're filtered by group membership in refreshData
        return users;
    }, [users]);

    // Add activity
    const addActivity = async (
        groupId: string,
        type: ActivityItem['type'],
        title: string,
        description?: string,
        symbol?: string,
        amount?: number
    ) => {
        if (!authUser) return;

        await supabase.from('activity').insert({
            group_id: groupId,
            user_id: authUser.id,
            type,
            title,
            description,
            symbol,
            amount_change_usd: amount,
        });

        await refreshData();
    };

    // Get group activity
    const getGroupActivity = useCallback((groupId: string) => {
        return activity.filter(a => a.groupId === groupId);
    }, [activity]);

    const currentGroup = currentGroupId ? groups.find(g => g.id === currentGroupId) || null : null;

    return (
        <UserContext.Provider value={{
            currentUser,
            authUser,
            users,
            holdings,
            groups,
            activity,
            currentGroup,
            isLoading,
            isAuthenticated: !!authUser,
            signUp,
            signIn,
            signOut,
            updateUser,
            depositCash,
            withdrawCash,
            addHolding,
            updateHolding,
            deleteHolding,
            getUserHoldings,
            createGroup,
            joinGroup,
            leaveGroup,
            setCurrentGroup,
            getUserGroups,
            getGroupMembers,
            addActivity,
            getGroupActivity,
            refreshData,
        }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
}
