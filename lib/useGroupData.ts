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

    const MAX_SNAPSHOTS_PER_ENTITY = 200;

    const computeMemberTotals = useCallback((state: GroupState, memberId: string) => {
        const member = state.members.find(m => m.id === memberId);
        if (!member) {
            return { totalValue: 0, costBasis: 0 };
        }
        const memberHoldings = state.holdings.filter(h => h.memberId === memberId);
        const holdingsValue = memberHoldings.reduce((sum, h) => sum + (h.quantity * h.currentPrice), 0);
        const holdingsCost = memberHoldings.reduce((sum, h) => sum + (h.quantity * h.avgBuyPrice), 0);
        return {
            totalValue: member.cashBalance + holdingsValue,
            costBasis: member.cashBalance + holdingsCost,
        };
    }, []);

    const computeGroupTotals = useCallback((state: GroupState) => {
        return state.members.reduce((acc, member) => {
            const totals = computeMemberTotals(state, member.id);
            return {
                totalValue: acc.totalValue + totals.totalValue,
                costBasis: acc.costBasis + totals.costBasis,
            };
        }, { totalValue: 0, costBasis: 0 });
    }, [computeMemberTotals]);

    const trimSnapshots = useCallback((snapshots: GroupState["portfolioHistory"]) => {
        const grouped = new Map<string, typeof snapshots>();

        snapshots.forEach(s => {
            const key = s.entityId || s.memberId;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(s);
        });

        const trimmed: typeof snapshots = [];
        grouped.forEach(list => {
            const ordered = list.sort((a, b) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            const keep = ordered.slice(-MAX_SNAPSHOTS_PER_ENTITY);
            trimmed.push(...keep);
        });

        return trimmed;
    }, []);

    const appendSnapshotsToGroup = useCallback((
        state: GroupState,
        memberIds: string[],
        timestampIso: string
    ): GroupState["portfolioHistory"] => {
        let history = [...(state.portfolioHistory || [])];

        memberIds.forEach(memberId => {
            const totals = computeMemberTotals(state, memberId);
            history.push({
                id: generateId(),
                timestamp: timestampIso,
                memberId,
                totalValue: totals.totalValue,
                costBasis: totals.costBasis,
                scope: "user",
                entityId: memberId,
            });
        });

        // Group snapshot
        const groupTotals = computeGroupTotals(state);
        history.push({
            id: generateId(),
            timestamp: timestampIso,
            memberId: "group",
            totalValue: groupTotals.totalValue,
            costBasis: groupTotals.costBasis,
            scope: "group",
            entityId: state.id,
        });

        return trimSnapshots(history);
    }, [computeGroupTotals, computeMemberTotals, trimSnapshots]);

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

                    // MIGRATION: Fix members with missing or zero initialCapital AND netDeposits
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
                                        initialCapital: computedInitialCapital > 0 ? computedInitialCapital : m.cashBalance,
                                        initialValue: computedInitialCapital > 0 ? computedInitialCapital : m.cashBalance,
                                        netDeposits: m.netDeposits !== undefined ? m.netDeposits : m.cashBalance, // Initialize netDeposits
                                    };
                                }
                                // If netDeposits is undefined, initialize it to current cashBalance (legacy data)
                                if (m.netDeposits === undefined) {
                                    return {
                                        ...m,
                                        netDeposits: m.cashBalance, // Best guess: they deposited their current cash
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
        const now = new Date().toISOString();
        const newGroup: GroupState = {
            ...createEmptyGroup(name),
            activity: [{
                id: generateId(),
                timestamp: now,
                memberId: null,
                type: "GROUP_CREATED",
                title: `${name} created`,
                description: "Group initialized",
            }],
        };
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
        const initialHoldingsCost = input.initialHoldings.reduce((sum, h) => sum + (h.quantity * h.avgBuyPrice), 0);
        const initialValue = input.initialCash + initialHoldingsCost;
        const newMember: Member = {
            id: generateId(),
            name: input.name.trim(),
            colorHue: generateRandomHue(),
            cashBalance: input.initialCash,
            initialCapital: initialValue, // Set initial capital to true starting value
            initialValue,
            totalRealizedPnl: 0,
            netDeposits: input.initialCash, // Track initial cash as first deposit
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
            let updatedGroup: GroupState = {
                ...prev,
                members: [...prev.members, newMember],
                holdings: [...prev.holdings, ...newHoldings],
                activity: [...activities, ...prev.activity],
            };

            if (updatedGroup.currentSeasonId && updatedGroup.seasons.length > 0) {
                const idx = updatedGroup.seasons.findIndex(s => s.id === updatedGroup.currentSeasonId);
                if (idx >= 0) {
                    const season = updatedGroup.seasons[idx];
                    const totals = computeMemberTotals(updatedGroup, newMember.id);
                    const updatedSeason: Season = {
                        ...season,
                        memberSnapshots: {
                            ...season.memberSnapshots,
                            [newMember.id]: totals.totalValue,
                        },
                    };
                    const seasonsCopy = [...updatedGroup.seasons];
                    seasonsCopy[idx] = updatedSeason;
                    updatedGroup = { ...updatedGroup, seasons: seasonsCopy };
                }
            }

            const portfolioHistory = appendSnapshotsToGroup(updatedGroup, [newMember.id], now);
            return { ...updatedGroup, portfolioHistory };
        });

        return newMember;
    }, [updateGroup, appendSnapshotsToGroup, computeMemberTotals]);

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
            initialValue: 0,
            totalRealizedPnl: 0,
            netDeposits: 0, // No deposits yet
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

    // Deposit cash (increases both cashBalance AND netDeposits)
    const depositCash = useCallback((memberId: string, amount: number, note?: string) => {
        if (!session?.groupId) return;

        const now = new Date().toISOString();

        updateGroup(session.groupId, prev => {
            const updatedGroup: GroupState = {
                ...prev,
                members: prev.members.map(m =>
                    m.id === memberId
                        ? {
                            ...m,
                            cashBalance: m.cashBalance + amount,
                            netDeposits: (m.netDeposits || 0) + amount // Track net contribution
                        }
                        : m
                ),
                activity: [{
                    id: generateId(),
                    timestamp: now,
                    memberId,
                    type: "DEPOSIT",
                    title: `Deposited $${amount.toLocaleString()}`,
                    description: note || "Added cash to portfolio.",
                    amountChangeUsd: amount,
                }, ...prev.activity],
            };
            const portfolioHistory = appendSnapshotsToGroup(updatedGroup, [memberId], now);
            return { ...updatedGroup, portfolioHistory };
        });
    }, [session, updateGroup, appendSnapshotsToGroup]);

    // Withdraw cash
    const withdrawCash = useCallback((memberId: string, amount: number, note?: string) => {
        if (!session?.groupId) return;

        const now = new Date().toISOString();

        updateGroup(session.groupId, prev => {
            const updatedGroup: GroupState = {
                ...prev,
                members: prev.members.map(m =>
                    m.id === memberId
                        ? { ...m, cashBalance: Math.max(0, m.cashBalance - amount) }
                        : m
                ),
                activity: [{
                    id: generateId(),
                    timestamp: now,
                    memberId,
                    type: "WITHDRAW",
                    title: `Withdrew $${amount.toLocaleString()}`,
                    description: note || "Removed cash from portfolio.",
                    amountChangeUsd: -amount,
                }, ...prev.activity],
            };
            const portfolioHistory = appendSnapshotsToGroup(updatedGroup, [memberId], now);
            return { ...updatedGroup, portfolioHistory };
        });
    }, [session, updateGroup, appendSnapshotsToGroup]);

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

        const now = new Date().toISOString();

        updateGroup(session.groupId, prev => {
            const updatedGroup: GroupState = {
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
                    timestamp: now,
                    memberId,
                    type: "BUY",
                    symbol: newHolding.symbol,
                    title: `Bought ${newHolding.symbol}`,
                    description: `Bought ${input.quantity} at $${input.avgBuyPrice.toFixed(2)} (total: $${totalCost.toLocaleString()}).`,
                    amountChangeUsd: -totalCost,
                }, ...prev.activity],
            };

            const portfolioHistory = appendSnapshotsToGroup(updatedGroup, [memberId], now);
            return { ...updatedGroup, portfolioHistory };
        });

        return newHolding;
    }, [session, updateGroup, appState.groups, appendSnapshotsToGroup]);

    // Update holding
    const updateHolding = useCallback((holdingId: string, partial: Partial<Holding>) => {
        if (!session?.groupId) return;

        const now = new Date().toISOString();

        updateGroup(session.groupId, prev => {
            const existing = prev.holdings.find(h => h.id === holdingId);
            if (!existing) return prev;

            const updatedGroup: GroupState = {
                ...prev,
                holdings: prev.holdings.map(h =>
                    h.id === holdingId ? { ...h, ...partial } : h
                ),
                activity: [{
                    id: generateId(),
                    timestamp: now,
                    memberId: existing.memberId,
                    type: "UPDATE",
                    symbol: existing.symbol,
                    title: `Updated ${existing.symbol}`,
                    description: "Modified holding details.",
                }, ...prev.activity],
            };

            const portfolioHistory = appendSnapshotsToGroup(updatedGroup, [existing.memberId], now);
            return { ...updatedGroup, portfolioHistory };
        });
    }, [session, updateGroup, appendSnapshotsToGroup]);

    // Sell holding (adds cash + realized P/L)
    const sellHolding = useCallback((holdingId: string, options?: SellHoldingOptions) => {
        if (!session?.groupId) return;

        const now = new Date().toISOString();

        updateGroup(session.groupId, prev => {
            const holding = prev.holdings.find(h => h.id === holdingId);
            if (!holding) return prev;

            const sellPrice = options?.sellPrice ?? holding.currentPrice;
            const totalValue = holding.quantity * sellPrice;
            const costBasis = holding.quantity * holding.avgBuyPrice;
            const realizedPnl = totalValue - costBasis;

            const updatedGroup: GroupState = {
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
            const portfolioHistory = appendSnapshotsToGroup(updatedGroup, [holding.memberId], now);
            return { ...updatedGroup, portfolioHistory };
        });
    }, [session, updateGroup, appendSnapshotsToGroup]);

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
        const touchedMembers = new Set<string>();

        updateGroup(session.groupId, prev => {
            const updatedHoldings = prev.holdings.map(holding => {
                const newPrice = priceMap[holding.symbol];
                if (newPrice !== undefined && newPrice !== holding.currentPrice) {
                    touchedMembers.add(holding.memberId);
                    return { ...holding, currentPrice: newPrice, lastPriceUpdate: now };
                }
                return holding;
            });

            const updatedGroup: GroupState = { ...prev, holdings: updatedHoldings };
            const portfolioHistory = touchedMembers.size > 0
                ? appendSnapshotsToGroup(updatedGroup, Array.from(touchedMembers), now)
                : updatedGroup.portfolioHistory;
            return { ...updatedGroup, portfolioHistory };
        });
    }, [session, updateGroup, appendSnapshotsToGroup]);

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

        const now = new Date().toISOString();
        updateGroup(session.groupId, prev => {
            const portfolioHistory = appendSnapshotsToGroup(prev, [memberId], now);
            return { ...prev, portfolioHistory };
        });
    }, [session, updateGroup, appendSnapshotsToGroup]);

    // Record snapshots for ALL members in the group (for group chart)
    const recordAllMembersSnapshot = useCallback(() => {
        if (!session?.groupId) return;

        const now = new Date().toISOString();
        updateGroup(session.groupId, prev => {
            const memberIds = prev.members.map(m => m.id);
            const portfolioHistory = appendSnapshotsToGroup(prev, memberIds, now);
            return { ...prev, portfolioHistory };
        });
    }, [session, updateGroup, appendSnapshotsToGroup]);

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
            const totals = computeMemberTotals(currentGroup, member.id);
            memberSnapshots[member.id] = totals.totalValue;
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

        updateGroup(session.groupId, prev => {
            const portfolioHistory = appendSnapshotsToGroup(prev, prev.members.map(m => m.id), now);
            return { ...prev, portfolioHistory };
        });

        return newSeason;
    }, [session, appState.groups, isGroupLeader, updateGroup, computeMemberTotals, appendSnapshotsToGroup]);

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
