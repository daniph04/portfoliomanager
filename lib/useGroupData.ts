"use client";

import { useState, useEffect, useCallback } from "react";
import {
    GroupState,
    Member,
    Holding,
    ActivityEvent,
    NewHoldingInput,
    SellHoldingOptions,
    CreateProfileInput,
    AppState,
    UserSession,
    PortfolioSnapshot,
    Season
} from "./types";
import { generateId, generateRandomHue } from "./utils";
import { computeInvestorMetrics } from "./portfolioMath";

const STORAGE_KEY = "portfolio_league_app_v3";
const SESSION_KEY = "portfolio_league_session";

// Create empty group with given name
function createEmptyGroup(name: string): GroupState {
    return {
        id: generateId(),
        name: name.trim(),
        members: [],
        holdings: [],
        activity: [],
        portfolioHistory: [],
        seasons: [],           // NEW: Empty seasons array
        leaderId: undefined,   // NEW: Will be set when first member creates profile
        currentSeasonId: undefined,
    };
}

// Initial empty state
const initialAppState: AppState = {
    groups: [],
    currentSession: null,
};

export interface GroupDataHelpers {
    // Group operations
    createGroup: (name: string, password: string) => GroupState;
    findGroup: (name: string, password: string) => GroupState | null;
    getGroup: (groupId: string) => GroupState | null;

    // Session operations
    setSession: (groupId: string, profileId: string | null) => void;
    clearSession: () => void;

    // Member/Profile operations
    createProfile: (groupId: string, input: CreateProfileInput) => Member;
    addMember: (name: string) => Member;
    updateMember: (memberId: string, partial: Partial<Member>) => void;
    removeMember: (memberId: string) => void;

    // Cash operations
    depositCash: (memberId: string, amount: number, note?: string) => void;
    withdrawCash: (memberId: string, amount: number, note?: string) => void;

    // Holding operations
    addHolding: (memberId: string, input: NewHoldingInput) => Holding | null;
    updateHolding: (holdingId: string, partial: Partial<Holding>) => void;
    sellHolding: (holdingId: string, options?: SellHoldingOptions) => void;

    // Activity operations
    addNoteActivity: (params: { memberId?: string | null; title: string; description?: string }) => void;
    clearAllActivity: () => void;

    // Price operations
    updateHoldingPrices: (priceMap: Record<string, number>) => void;

    // Portfolio history
    getPortfolioHistory: (memberId: string) => PortfolioSnapshot[];
    recordPortfolioSnapshot: (memberId: string) => void;
    recordAllMembersSnapshot: () => void;

    // Season operations (NEW)
    getCurrentSeason: () => Season | null;
    startSeason: () => Season | null;
    endSeason: () => void;
    isGroupLeader: (userId: string) => boolean;
}

export function usePersistentGroupData(): {
    group: GroupState;
    appState: AppState;
    session: UserSession | null;
    helpers: GroupDataHelpers;
    isLoading: boolean;
} {
    const [appState, setAppState] = useState<AppState>(initialAppState);
    const [session, setSession] = useState<UserSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Get current group from session
    const group: GroupState = session?.groupId
        ? appState.groups.find(g => g.id === session.groupId) || createEmptyGroup("Unknown")
        : createEmptyGroup("No Group");

    // Load from localStorage on mount
    useEffect(() => {
        if (typeof window === "undefined") return;

        try {
            // Load app state
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Migrate old data if needed
                if (parsed.members && !parsed.groups) {
                    // Old format - migrate to new
                    const migratedGroup: GroupState = {
                        id: parsed.id || generateId(),
                        name: "Migrated Group", // Default name for migrated group
                        members: parsed.members.map((m: Member) => ({
                            ...m,
                            cashBalance: m.cashBalance ?? 0,
                            totalRealizedPnl: m.totalRealizedPnl ?? 0,
                            createdAt: m.createdAt ?? new Date().toISOString(),
                        })),
                        holdings: parsed.holdings || [],
                        activity: [], // Clear old activity as requested
                        portfolioHistory: [],
                        seasons: [],
                        leaderId: undefined,
                        currentSeasonId: undefined,
                    };
                    setAppState({ groups: [migratedGroup], currentSession: null });
                } else {
                    // Check if nanosecta group exists, if not create it
                    const hasNanosecta = parsed.groups?.some((g: GroupState) =>
                        g.name.toLowerCase() === "nanosecta"
                    );

                    if (!hasNanosecta && parsed.groups) {
                        // Add nanosecta group to existing groups
                        const nanosectaGroup: GroupState = {
                            id: generateId(),
                            name: "nanosecta",
                            members: [],
                            holdings: [],
                            activity: [],
                            portfolioHistory: [],
                            seasons: [],
                            leaderId: undefined,
                            currentSeasonId: undefined,
                        };
                        localStorage.setItem(`group_password_${nanosectaGroup.id}`, btoa("Pibes2004@"));
                        parsed.groups.push(nanosectaGroup);
                    }

                    // MIGRATION: Fix members with missing or zero initialCapital
                    if (parsed.groups) {
                        parsed.groups = parsed.groups.map((g: GroupState) => ({
                            ...g,
                            members: g.members.map((m: Member) => {
                                // If initialCapital is missing or 0, compute it
                                if (!m.initialCapital || m.initialCapital === 0) {
                                    // Compute from cashBalance + cost basis of holdings
                                    const memberHoldings = g.holdings.filter((h: Holding) => h.memberId === m.id);
                                    const costBasis = memberHoldings.reduce((sum: number, h: Holding) =>
                                        sum + (h.quantity * h.avgBuyPrice), 0);
                                    const computedInitialCapital = m.cashBalance + costBasis;

                                    console.log(`Migrating ${m.name}: computed initialCapital = $${computedInitialCapital}`);

                                    return {
                                        ...m,
                                        initialCapital: computedInitialCapital > 0 ? computedInitialCapital : m.cashBalance
                                    };
                                }
                                return m;
                            })
                        }));
                    }

                    setAppState(parsed);
                }
            } else {
                // No stored data - create nanosecta group as default
                const nanosectaGroup: GroupState = {
                    id: generateId(),
                    name: "nanosecta",
                    members: [],
                    holdings: [],
                    activity: [],
                    portfolioHistory: [],
                    seasons: [],
                    leaderId: undefined,
                    currentSeasonId: undefined,
                };
                localStorage.setItem(`group_password_${nanosectaGroup.id}`, btoa("Pibes2004@"));
                setAppState({ groups: [nanosectaGroup], currentSession: null });
            }

            // Load session
            const storedSession = localStorage.getItem(SESSION_KEY);
            if (storedSession) {
                setSession(JSON.parse(storedSession));
            }
        } catch (error) {
            console.error("Failed to load data from localStorage:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Save to localStorage whenever state changes
    useEffect(() => {
        if (isLoading || typeof window === "undefined") return;

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
        } catch (error) {
            console.error("Failed to save app data:", error);
        }
    }, [appState, isLoading]);

    // Save session separately
    useEffect(() => {
        if (typeof window === "undefined") return;

        try {
            if (session) {
                localStorage.setItem(SESSION_KEY, JSON.stringify(session));
            } else {
                localStorage.removeItem(SESSION_KEY);
            }
        } catch (error) {
            console.error("Failed to save session:", error);
        }
    }, [session]);

    // Helper to update a specific group
    const updateGroup = useCallback((groupId: string, updater: (group: GroupState) => GroupState) => {
        setAppState(prev => ({
            ...prev,
            groups: prev.groups.map(g =>
                g.id === groupId ? updater(g) : g
            ),
        }));
    }, []);

    // Create a new group
    const createGroup = useCallback((name: string, password: string): GroupState => {
        const newGroup = createEmptyGroup(name);
        // Store password hash (simple for now, just base64)
        const passwordKey = `group_password_${newGroup.id}`;
        if (typeof window !== "undefined") {
            localStorage.setItem(passwordKey, btoa(password));
        }

        setAppState(prev => ({
            ...prev,
            groups: [...prev.groups, newGroup],
        }));

        return newGroup;
    }, []);

    // Find group by name and password
    const findGroup = useCallback((name: string, password: string): GroupState | null => {
        const group = appState.groups.find(g =>
            g.name.toLowerCase() === name.toLowerCase()
        );

        if (!group) return null;

        // Check password
        const passwordKey = `group_password_${group.id}`;
        const storedPassword = typeof window !== "undefined"
            ? localStorage.getItem(passwordKey)
            : null;

        if (storedPassword && atob(storedPassword) === password) {
            return group;
        }

        return null;
    }, [appState.groups]);

    // Get group by ID
    const getGroup = useCallback((groupId: string): GroupState | null => {
        return appState.groups.find(g => g.id === groupId) || null;
    }, [appState.groups]);

    // Set session
    const setSessionData = useCallback((groupId: string, profileId: string | null) => {
        setSession({ groupId, profileId });
    }, []);

    // Clear session (logout)
    const clearSession = useCallback(() => {
        setSession(null);
        if (typeof window !== "undefined") {
            localStorage.removeItem(SESSION_KEY);
            localStorage.removeItem("portfolio_league_access");
        }
    }, []);

    // Create profile with initial cash and holdings
    const createProfile = useCallback((groupId: string, input: CreateProfileInput): Member => {
        const newMember: Member = {
            id: generateId(),
            name: input.name.trim(),
            colorHue: generateRandomHue(),
            cashBalance: input.initialCash,
            initialCapital: input.initialCash, // Set initial capital
            totalRealizedPnl: 0,
            createdAt: new Date().toISOString(),
        };

        const now = new Date().toISOString();
        const newHoldings: Holding[] = input.initialHoldings.map(h => ({
            id: generateId(),
            memberId: newMember.id,
            symbol: h.symbol.toUpperCase(),
            name: h.name,
            assetClass: h.assetClass,
            quantity: h.quantity,
            avgBuyPrice: h.avgBuyPrice,
            currentPrice: h.currentPrice,
            cryptoId: h.cryptoId,
        }));

        // Cash stays as entered - it's available cash, separate from holdings value
        // Total portfolio = Cash + Holdings (no deduction)

        const activities: ActivityEvent[] = [
            {
                id: generateId(),
                timestamp: now,
                memberId: newMember.id,
                type: "NOTE",
                title: `${newMember.name} joined the group`,
                description: `Created profile with $${input.initialCash.toLocaleString()} initial cash.`,
            },
        ];

        // Add BUY activities for initial holdings
        newHoldings.forEach(h => {
            activities.push({
                id: generateId(),
                timestamp: now,
                memberId: newMember.id,
                type: "BUY",
                symbol: h.symbol,
                title: `Bought ${h.symbol}`,
                description: `Bought ${h.quantity} at $${h.avgBuyPrice.toFixed(2)}.`,
            });
        });

        updateGroup(groupId, prev => {
            const updatedGroup = {
                ...prev,
                members: [...prev.members, newMember],
                holdings: [...prev.holdings, ...newHoldings],
                activity: [...activities, ...prev.activity],
            };

            // Create initial snapshot for the new member
            // IMPORTANT: Use initialCapital as baseline for 0% starting point
            // This ensures the chart shows gains/losses relative to the starting capital
            const holdingsValue = newHoldings.reduce((sum, h) => sum + (h.quantity * h.currentPrice), 0);
            const totalValue = input.initialCash + holdingsValue;
            const costBasis = newHoldings.reduce((sum, h) => sum + (h.quantity * h.avgBuyPrice), 0);

            // First snapshot: represents the INITIAL state at starting capital
            // This creates the zero baseline for percentage calculations
            const baselineSnapshot: PortfolioSnapshot = {
                timestamp: now,
                memberId: newMember.id,
                totalValue: input.initialCash, // Start at initial capital
                costBasis: input.initialCash,  // Cost basis = initial capital (0% gain)
            };

            // If user added holdings with current prices different from avg prices,
            // create a second snapshot showing the current state
            const snapshots = [baselineSnapshot];

            if (newHoldings.length > 0) {
                // Add a snapshot 1 second later showing current positions
                const currentSnapshot: PortfolioSnapshot = {
                    timestamp: new Date(new Date(now).getTime() + 1000).toISOString(),
                    memberId: newMember.id,
                    totalValue,
                    costBasis: input.initialCash, // Keep initial capital as cost basis for % calculation
                };
                snapshots.push(currentSnapshot);
            }

            return {
                ...updatedGroup,
                portfolioHistory: [...(prev.portfolioHistory || []), ...snapshots],
            };
        });

        return newMember;
    }, [updateGroup]);

    // Simple add member (legacy support)
    const addMember = useCallback((name: string): Member => {
        if (!session?.groupId) {
            throw new Error("No group selected");
        }

        const newMember: Member = {
            id: generateId(),
            name: name.trim(),
            colorHue: generateRandomHue(),
            cashBalance: 0,
            initialCapital: 0, // Default for empty
            totalRealizedPnl: 0,
            createdAt: new Date().toISOString(),
        };

        updateGroup(session.groupId, prev => ({
            ...prev,
            members: [...prev.members, newMember],
            activity: [{
                id: generateId(),
                timestamp: new Date().toISOString(),
                memberId: newMember.id,
                type: "NOTE",
                title: "New investor added",
                description: `Created investor profile "${newMember.name}".`,
            }, ...prev.activity],
        }));

        return newMember;
    }, [session, updateGroup]);

    // Update member
    const updateMember = useCallback((memberId: string, partial: Partial<Member>) => {
        if (!session?.groupId) return;

        updateGroup(session.groupId, prev => ({
            ...prev,
            members: prev.members.map(m =>
                m.id === memberId ? { ...m, ...partial } : m
            ),
        }));
    }, [session, updateGroup]);

    // Remove member
    const removeMember = useCallback((memberId: string) => {
        if (!session?.groupId) return;

        updateGroup(session.groupId, prev => {
            const member = prev.members.find(m => m.id === memberId);
            return {
                ...prev,
                members: prev.members.filter(m => m.id !== memberId),
                holdings: prev.holdings.filter(h => h.memberId !== memberId),
                activity: [{
                    id: generateId(),
                    timestamp: new Date().toISOString(),
                    memberId: null,
                    type: "NOTE",
                    title: "Investor removed",
                    description: `Removed "${member?.name || 'Unknown'}" and all their holdings.`,
                }, ...prev.activity],
            };
        });
    }, [session, updateGroup]);

    // Deposit cash
    const depositCash = useCallback((memberId: string, amount: number, note?: string) => {
        if (!session?.groupId) return;

        updateGroup(session.groupId, prev => ({
            ...prev,
            members: prev.members.map(m =>
                m.id === memberId
                    ? { ...m, cashBalance: m.cashBalance + amount }
                    : m
            ),
            activity: [{
                id: generateId(),
                timestamp: new Date().toISOString(),
                memberId,
                type: "DEPOSIT",
                title: `Deposited $${amount.toLocaleString()}`,
                description: note || "Added cash to portfolio.",
                amountChangeUsd: amount,
            }, ...prev.activity],
        }));
    }, [session, updateGroup]);

    // Withdraw cash
    const withdrawCash = useCallback((memberId: string, amount: number, note?: string) => {
        if (!session?.groupId) return;

        updateGroup(session.groupId, prev => ({
            ...prev,
            members: prev.members.map(m =>
                m.id === memberId
                    ? { ...m, cashBalance: Math.max(0, m.cashBalance - amount) }
                    : m
            ),
            activity: [{
                id: generateId(),
                timestamp: new Date().toISOString(),
                memberId,
                type: "WITHDRAW",
                title: `Withdrew $${amount.toLocaleString()}`,
                description: note || "Removed cash from portfolio.",
                amountChangeUsd: -amount,
            }, ...prev.activity],
        }));
    }, [session, updateGroup]);

    // Add holding (deducts from cash) - returns null if insufficient funds
    const addHolding = useCallback((memberId: string, input: NewHoldingInput): Holding | null => {
        if (!session?.groupId) return null;

        // Find member and check available funds
        const group = appState.groups.find(g => g.id === session.groupId);
        const member = group?.members.find(m => m.id === memberId);

        if (!member) return null;

        const totalCost = input.quantity * input.avgBuyPrice;

        // Validate sufficient funds
        if (totalCost > member.cashBalance) {
            console.warn(`Insufficient funds: Need $${totalCost.toFixed(2)}, have $${member.cashBalance.toFixed(2)}`);
            return null;
        }

        const newHolding: Holding = {
            id: generateId(),
            memberId,
            symbol: input.symbol.toUpperCase().trim(),
            name: input.name.trim(),
            assetClass: input.assetClass,
            quantity: input.quantity,
            avgBuyPrice: input.avgBuyPrice,
            currentPrice: input.currentPrice ?? input.avgBuyPrice,
            cryptoId: input.cryptoId,
        };

        updateGroup(session.groupId, prev => ({
            ...prev,
            // Deduct cash from member
            members: prev.members.map(m =>
                m.id === memberId
                    ? { ...m, cashBalance: Math.max(0, m.cashBalance - totalCost) }
                    : m
            ),
            holdings: [...prev.holdings, newHolding],
            activity: [{
                id: generateId(),
                timestamp: new Date().toISOString(),
                memberId,
                type: "BUY",
                symbol: newHolding.symbol,
                title: `Bought ${newHolding.symbol}`,
                description: `Bought ${input.quantity} at $${input.avgBuyPrice.toFixed(2)} (total: $${totalCost.toLocaleString()}).`,
                amountChangeUsd: -totalCost,
            }, ...prev.activity],
        }));

        return newHolding;
    }, [session, updateGroup, appState.groups]);

    // Update holding
    const updateHolding = useCallback((holdingId: string, partial: Partial<Holding>) => {
        if (!session?.groupId) return;

        updateGroup(session.groupId, prev => {
            const existing = prev.holdings.find(h => h.id === holdingId);
            if (!existing) return prev;

            return {
                ...prev,
                holdings: prev.holdings.map(h =>
                    h.id === holdingId ? { ...h, ...partial } : h
                ),
                activity: [{
                    id: generateId(),
                    timestamp: new Date().toISOString(),
                    memberId: existing.memberId,
                    type: "UPDATE",
                    symbol: existing.symbol,
                    title: `Updated ${existing.symbol}`,
                    description: "Modified holding details.",
                }, ...prev.activity],
            };
        });
    }, [session, updateGroup]);

    // Sell holding (adds cash + realized P/L)
    const sellHolding = useCallback((holdingId: string, options?: SellHoldingOptions) => {
        if (!session?.groupId) return;

        updateGroup(session.groupId, prev => {
            const holding = prev.holdings.find(h => h.id === holdingId);
            if (!holding) return prev;

            const sellPrice = options?.sellPrice ?? holding.currentPrice;
            const totalValue = holding.quantity * sellPrice;
            const costBasis = holding.quantity * holding.avgBuyPrice;
            const realizedPnl = totalValue - costBasis;

            return {
                ...prev,
                // Add cash + update realized P/L for member
                members: prev.members.map(m =>
                    m.id === holding.memberId
                        ? {
                            ...m,
                            cashBalance: m.cashBalance + totalValue,
                            totalRealizedPnl: m.totalRealizedPnl + realizedPnl,
                        }
                        : m
                ),
                holdings: prev.holdings.filter(h => h.id !== holdingId),
                activity: [{
                    id: generateId(),
                    timestamp: new Date().toISOString(),
                    memberId: holding.memberId,
                    type: "SELL",
                    symbol: holding.symbol,
                    title: `Sold ${holding.symbol}`,
                    description: `Sold ${holding.quantity} at $${sellPrice.toFixed(2)}. Received $${totalValue.toLocaleString()}. P/L: ${realizedPnl >= 0 ? '+' : ''}$${realizedPnl.toFixed(2)}.${options?.note ? ` Note: ${options.note}` : ''}`,
                    amountChangeUsd: realizedPnl,
                }, ...prev.activity],
            };
        });
    }, [session, updateGroup]);

    // Add note activity
    const addNoteActivity = useCallback((params: { memberId?: string | null; title: string; description?: string }) => {
        if (!session?.groupId) return;

        updateGroup(session.groupId, prev => ({
            ...prev,
            activity: [{
                id: generateId(),
                timestamp: new Date().toISOString(),
                memberId: params.memberId ?? null,
                type: "NOTE",
                title: params.title,
                description: params.description,
            }, ...prev.activity],
        }));
    }, [session, updateGroup]);

    // Clear all activity
    const clearAllActivity = useCallback(() => {
        if (!session?.groupId) return;

        updateGroup(session.groupId, prev => ({
            ...prev,
            activity: [],
        }));
    }, [session, updateGroup]);

    // Update holding prices
    const updateHoldingPrices = useCallback((priceMap: Record<string, number>) => {
        if (!session?.groupId) return;

        const now = new Date().toISOString();

        updateGroup(session.groupId, prev => {
            const updatedHoldings = prev.holdings.map(holding => {
                const newPrice = priceMap[holding.symbol];
                if (newPrice !== undefined && newPrice !== holding.currentPrice) {
                    return { ...holding, currentPrice: newPrice, lastPriceUpdate: now };
                }
                return holding;
            });

            return { ...prev, holdings: updatedHoldings };
        });
    }, [session, updateGroup]);

    // Get portfolio history for a member
    const getPortfolioHistory = useCallback((memberId: string): PortfolioSnapshot[] => {
        if (!session?.groupId) return [];
        const currentGroup = appState.groups.find(g => g.id === session.groupId);
        if (!currentGroup) return [];
        return (currentGroup.portfolioHistory || []).filter(s => s.memberId === memberId);
    }, [session, appState.groups]);

    // Record a portfolio snapshot for a member
    const recordPortfolioSnapshot = useCallback((memberId: string) => {
        if (!session?.groupId) return;

        const currentGroup = appState.groups.find(g => g.id === session.groupId);
        if (!currentGroup) return;

        const member = currentGroup.members.find(m => m.id === memberId);
        if (!member) return;

        const memberHoldings = currentGroup.holdings.filter(h => h.memberId === memberId);
        const holdingsValue = memberHoldings.reduce((sum, h) => sum + (h.quantity * h.currentPrice), 0);
        const totalValue = member.cashBalance + holdingsValue;
        const costBasis = memberHoldings.reduce((sum, h) => sum + (h.quantity * h.avgBuyPrice), 0);

        const now = new Date().toISOString();

        updateGroup(session.groupId, prev => {
            const history = prev.portfolioHistory || [];
            const memberHistory = history.filter(s => s.memberId === memberId);
            const lastSnapshot = memberHistory[memberHistory.length - 1];

            let newHistory = [...history];

            const newSnapshot: PortfolioSnapshot = {
                timestamp: now,
                memberId,
                totalValue,
                costBasis,
            };

            // CHECK: Is there already a snapshot for TODAY?
            // If so, update it instead of appending new one.
            const isSameDay = (d1: Date, d2: Date) =>
                d1.getFullYear() === d2.getFullYear() &&
                d1.getMonth() === d2.getMonth() &&
                d1.getDate() === d2.getDate();

            if (lastSnapshot && isSameDay(new Date(lastSnapshot.timestamp), new Date(now))) {
                // Update the last snapshot entry in the main array
                newHistory = newHistory.map(s =>
                    (s.memberId === memberId && s.timestamp === lastSnapshot.timestamp)
                        ? newSnapshot
                        : s
                );
            } else {
                // Append new
                newHistory.push(newSnapshot);
            }

            return {
                ...prev,
                portfolioHistory: newHistory,
            };
        });
    }, [session, appState.groups, updateGroup]);

    // Record snapshots for ALL members in the group (for group chart)
    const recordAllMembersSnapshot = useCallback(() => {
        if (!session?.groupId) return;

        const currentGroup = appState.groups.find(g => g.id === session.groupId);
        if (!currentGroup || currentGroup.members.length === 0) return;

        const now = new Date().toISOString();
        const newSnapshots: PortfolioSnapshot[] = [];

        // Check if we should skip (less than 30 seconds since last group snapshot)
        const history = currentGroup.portfolioHistory || [];
        const lastGroupSnapshot = history.length > 0 ? history[history.length - 1] : null;

        if (lastGroupSnapshot) {
            const lastTime = new Date(lastGroupSnapshot.timestamp).getTime();
            const nowTime = new Date(now).getTime();
            // Skip if less than 30 seconds since last snapshot
            if (nowTime - lastTime < 30 * 1000) return;
        }

        const isSameDay = (d1: Date, d2: Date) =>
            d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();

        updateGroup(session.groupId, prev => {
            const history = prev.portfolioHistory || [];
            let newHistory = [...history];

            // If last snapshot was today, replace it (remove old entries for today)
            // Actually, for group snapshot, we add multiple entries (one per member).
            // So we need to remove ALL entries for today if we are updating "today".

            // Simplified logic: Check if the VERY LAST entry in history is from today.
            // If so, we assume the entire "batch" of snapshots from today should be replaced?
            // BETTER: Filter out any snapshots from today for these members, then append new ones.
            // But modifying history blindly is risky. 

            // Let's stick to the Plan: "If there is already a snapshot for the same day, update that snapshot".
            // Since we store individual member snapshots, we can just iterate.

            const newSnapshotsForUpdate: PortfolioSnapshot[] = [];

            currentGroup.members.forEach(member => {
                const memberHoldings = currentGroup.holdings.filter(h => h.memberId === member.id);
                const holdingsValue = memberHoldings.reduce((sum, h) => sum + (h.quantity * h.currentPrice), 0);
                const totalValue = member.cashBalance + holdingsValue;
                const costBasis = memberHoldings.reduce((sum, h) => sum + (h.quantity * h.avgBuyPrice), 0);

                // Find existing snapshot for this member from today
                const existingIndex = newHistory.findIndex(s =>
                    s.memberId === member.id &&
                    isSameDay(new Date(s.timestamp), new Date(now))
                );

                const snapshot = {
                    timestamp: now,
                    memberId: member.id,
                    totalValue,
                    costBasis,
                };

                if (existingIndex >= 0) {
                    newHistory[existingIndex] = snapshot;
                } else {
                    newHistory.push(snapshot);
                }
            });

            return {
                ...prev,
                portfolioHistory: newHistory,
            };
        });
    }, [session, appState.groups, updateGroup]);

    // ===== SEASON FUNCTIONS =====

    // Get the current active season
    const getCurrentSeason = useCallback((): Season | null => {
        if (!session?.groupId) return null;
        const currentGroup = appState.groups.find(g => g.id === session.groupId);
        if (!currentGroup?.currentSeasonId || !currentGroup.seasons) return null;
        return currentGroup.seasons.find(s => s.id === currentGroup.currentSeasonId) || null;
    }, [session, appState.groups]);

    // Check if user is the group leader
    const isGroupLeader = useCallback((userId: string): boolean => {
        if (!session?.groupId) return false;
        const currentGroup = appState.groups.find(g => g.id === session.groupId);
        // If no leader is set, the first member is considered leader
        if (!currentGroup?.leaderId && currentGroup?.members.length) {
            return currentGroup.members[0].id === userId;
        }
        return currentGroup?.leaderId === userId;
    }, [session, appState.groups]);

    // Start a new season (only leader can do this)
    const startSeason = useCallback((): Season | null => {
        if (!session?.groupId || !session.profileId) return null;

        const currentGroup = appState.groups.find(g => g.id === session.groupId);
        if (!currentGroup) return null;

        // Check if caller is the leader
        if (!isGroupLeader(session.profileId)) {
            console.warn("Only the group leader can start a new season");
            return null;
        }

        // Check if there's already an active season
        if (currentGroup.currentSeasonId) {
            console.warn("There's already an active season. End it first.");
            return null;
        }

        const now = new Date().toISOString();
        const seasonNumber = (currentGroup.seasons?.length || 0) + 1;

        // Calculate current value for each member
        const memberSnapshots: Record<string, number> = {};
        currentGroup.members.forEach(member => {
            const metrics = computeInvestorMetrics(member, currentGroup.holdings);
            memberSnapshots[member.id] = metrics.portfolioValue;
        });

        const newSeason: Season = {
            id: `season_${seasonNumber}`,
            name: `Season ${seasonNumber}`,
            startTime: now,
            leaderId: session.profileId,
            memberSnapshots,
        };

        const profileIdForLeader = session.profileId ?? undefined;

        updateGroup(session.groupId, prev => ({
            ...prev,
            seasons: [...(prev.seasons || []), newSeason],
            currentSeasonId: newSeason.id,
            leaderId: prev.leaderId || profileIdForLeader, // Set leader if not set
            activity: [{
                id: generateId(),
                timestamp: now,
                memberId: session.profileId,
                type: "SEASON_STARTED" as const,
                title: `${newSeason.name} started`,
                description: `New season started with ${currentGroup.members.length} investors competing.`,
            }, ...prev.activity],
        }));

        return newSeason;
    }, [session, appState.groups, isGroupLeader, updateGroup]);

    // End the current season
    const endSeason = useCallback((): void => {
        if (!session?.groupId || !session.profileId) return;

        const currentGroup = appState.groups.find(g => g.id === session.groupId);
        if (!currentGroup?.currentSeasonId) {
            console.warn("No active season to end");
            return;
        }

        // Check if caller is the leader
        if (!isGroupLeader(session.profileId)) {
            console.warn("Only the group leader can end a season");
            return;
        }

        const now = new Date().toISOString();

        updateGroup(session.groupId, prev => ({
            ...prev,
            currentSeasonId: undefined,
            seasons: prev.seasons.map(s =>
                s.id === prev.currentSeasonId
                    ? { ...s, endTime: now }
                    : s
            ),
            activity: [{
                id: generateId(),
                timestamp: now,
                memberId: session.profileId,
                type: "SEASON_ENDED" as const,
                title: `Season ended`,
                description: `The current season has been concluded.`,
            }, ...prev.activity],
        }));
    }, [session, appState.groups, isGroupLeader, updateGroup]);

    const helpers: GroupDataHelpers = {
        createGroup,
        findGroup,
        getGroup,
        setSession: setSessionData,
        clearSession,
        createProfile,
        addMember,
        updateMember,
        removeMember,
        depositCash,
        withdrawCash,
        addHolding,
        updateHolding,
        sellHolding,
        addNoteActivity,
        clearAllActivity,
        updateHoldingPrices,
        getPortfolioHistory,
        recordPortfolioSnapshot,
        recordAllMembersSnapshot,
        // Season functions
        getCurrentSeason,
        startSeason,
        endSeason,
        isGroupLeader,
    };

    return { group, appState, session, helpers, isLoading };
}
