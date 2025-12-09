"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// Types
export interface UserProfile {
    id: string;
    name: string;
    cashBalance: number;
    totalRealizedPnl: number;
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
    password: string;
    createdBy: string;
    memberIds: string[];
    createdAt: string;
}

export interface AppData {
    currentUserId: string | null;
    users: UserProfile[];
    holdings: UserHolding[];
    groups: Group[];
    activity: ActivityItem[];
}

export interface ActivityItem {
    id: string;
    groupId: string;
    userId: string;
    type: 'BUY' | 'SELL' | 'UPDATE' | 'NOTE' | 'DEPOSIT' | 'WITHDRAW' | 'JOIN';
    symbol?: string;
    title: string;
    description?: string;
    amountChangeUsd?: number;
    createdAt: string;
}

const STORAGE_KEY = 'portfolio_league_v4';

const defaultAppData: AppData = {
    currentUserId: null,
    users: [],
    holdings: [],
    groups: [],
    activity: [],
};

interface UserContextType {
    // State
    currentUser: UserProfile | null;
    users: UserProfile[];
    holdings: UserHolding[];
    groups: Group[];
    activity: ActivityItem[];
    currentGroup: Group | null;
    isLoading: boolean;

    // User actions
    login: (name: string) => UserProfile;
    logout: () => void;
    updateUser: (data: Partial<UserProfile>) => void;

    // Holdings actions
    addHolding: (holding: Omit<UserHolding, 'id' | 'userId' | 'createdAt'>) => UserHolding;
    updateHolding: (id: string, data: Partial<UserHolding>) => void;
    deleteHolding: (id: string) => void;
    getUserHoldings: (userId?: string) => UserHolding[];

    // Group actions
    createGroup: (name: string, password: string) => Group;
    joinGroup: (name: string, password: string) => { success: boolean; error?: string; group?: Group };
    leaveGroup: (groupId: string) => void;
    setCurrentGroup: (groupId: string) => void;
    getUserGroups: () => Group[];
    getGroupMembers: (groupId: string) => UserProfile[];

    // Activity
    addActivity: (groupId: string, type: ActivityItem['type'], title: string, description?: string, symbol?: string, amount?: number) => void;
    getGroupActivity: (groupId: string) => ActivityItem[];
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const [data, setData] = useState<AppData>(defaultAppData);
    const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                setData(parsed);
                // Auto-select last group if user is logged in
                if (parsed.currentUserId) {
                    const userGroups = parsed.groups.filter((g: Group) =>
                        g.memberIds.includes(parsed.currentUserId)
                    );
                    if (userGroups.length > 0) {
                        setCurrentGroupId(userGroups[0].id);
                    }
                }
            }
        } catch (e) {
            console.error('Failed to load data:', e);
        }
        setIsLoading(false);
    }, []);

    // Save to localStorage
    const save = useCallback((newData: AppData) => {
        setData(newData);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    }, []);

    // Current user
    const currentUser = data.currentUserId
        ? data.users.find(u => u.id === data.currentUserId) || null
        : null;

    // Current group
    const currentGroup = currentGroupId
        ? data.groups.find(g => g.id === currentGroupId) || null
        : null;

    // Login - create or find user by name
    const login = useCallback((name: string): UserProfile => {
        const trimmedName = name.trim();
        let user = data.users.find(u => u.name.toLowerCase() === trimmedName.toLowerCase());

        if (!user) {
            user = {
                id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: trimmedName,
                cashBalance: 0,
                totalRealizedPnl: 0,
                createdAt: new Date().toISOString(),
            };
            const newData = {
                ...data,
                users: [...data.users, user],
                currentUserId: user.id,
            };
            save(newData);
        } else {
            save({ ...data, currentUserId: user.id });
        }

        return user;
    }, [data, save]);

    // Logout
    const logout = useCallback(() => {
        save({ ...data, currentUserId: null });
        setCurrentGroupId(null);
    }, [data, save]);

    // Update user
    const updateUser = useCallback((updates: Partial<UserProfile>) => {
        if (!data.currentUserId) return;

        const newUsers = data.users.map(u =>
            u.id === data.currentUserId ? { ...u, ...updates } : u
        );
        save({ ...data, users: newUsers });
    }, [data, save]);

    // Add holding
    const addHolding = useCallback((holding: Omit<UserHolding, 'id' | 'userId' | 'createdAt'>): UserHolding => {
        if (!data.currentUserId) throw new Error('Not logged in');

        const newHolding: UserHolding = {
            ...holding,
            id: `holding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: data.currentUserId,
            createdAt: new Date().toISOString(),
        };

        save({ ...data, holdings: [...data.holdings, newHolding] });
        return newHolding;
    }, [data, save]);

    // Update holding
    const updateHolding = useCallback((id: string, updates: Partial<UserHolding>) => {
        const newHoldings = data.holdings.map(h =>
            h.id === id ? { ...h, ...updates } : h
        );
        save({ ...data, holdings: newHoldings });
    }, [data, save]);

    // Delete holding
    const deleteHolding = useCallback((id: string) => {
        save({ ...data, holdings: data.holdings.filter(h => h.id !== id) });
    }, [data, save]);

    // Get user holdings
    const getUserHoldings = useCallback((userId?: string) => {
        const targetId = userId || data.currentUserId;
        return data.holdings.filter(h => h.userId === targetId);
    }, [data]);

    // Create group
    const createGroup = useCallback((name: string, password: string): Group => {
        if (!data.currentUserId) throw new Error('Not logged in');

        const newGroup: Group = {
            id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: name.trim(),
            password,
            createdBy: data.currentUserId,
            memberIds: [data.currentUserId],
            createdAt: new Date().toISOString(),
        };

        save({ ...data, groups: [...data.groups, newGroup] });
        setCurrentGroupId(newGroup.id);
        return newGroup;
    }, [data, save]);

    // Join group
    const joinGroup = useCallback((name: string, password: string): { success: boolean; error?: string; group?: Group } => {
        if (!data.currentUserId) return { success: false, error: 'Not logged in' };

        const group = data.groups.find(g =>
            g.name.toLowerCase() === name.trim().toLowerCase()
        );

        if (!group) return { success: false, error: 'Group not found' };
        if (group.password !== password) return { success: false, error: 'Wrong password' };

        if (group.memberIds.includes(data.currentUserId)) {
            setCurrentGroupId(group.id);
            return { success: true, group };
        }

        const updatedGroup = {
            ...group,
            memberIds: [...group.memberIds, data.currentUserId],
        };

        const newGroups = data.groups.map(g =>
            g.id === group.id ? updatedGroup : g
        );

        save({ ...data, groups: newGroups });
        setCurrentGroupId(group.id);
        return { success: true, group: updatedGroup };
    }, [data, save]);

    // Leave group
    const leaveGroup = useCallback((groupId: string) => {
        if (!data.currentUserId) return;

        const newGroups = data.groups.map(g => {
            if (g.id === groupId) {
                return {
                    ...g,
                    memberIds: g.memberIds.filter(id => id !== data.currentUserId),
                };
            }
            return g;
        });

        save({ ...data, groups: newGroups });
        if (currentGroupId === groupId) {
            setCurrentGroupId(null);
        }
    }, [data, save, currentGroupId]);

    // Set current group
    const setCurrentGroup = useCallback((groupId: string) => {
        setCurrentGroupId(groupId);
    }, []);

    // Get user's groups
    const getUserGroups = useCallback(() => {
        if (!data.currentUserId) return [];
        return data.groups.filter(g => g.memberIds.includes(data.currentUserId!));
    }, [data]);

    // Get group members
    const getGroupMembers = useCallback((groupId: string) => {
        const group = data.groups.find(g => g.id === groupId);
        if (!group) return [];
        return data.users.filter(u => group.memberIds.includes(u.id));
    }, [data]);

    // Add activity
    const addActivity = useCallback((
        groupId: string,
        type: ActivityItem['type'],
        title: string,
        description?: string,
        symbol?: string,
        amount?: number
    ) => {
        if (!data.currentUserId) return;

        const newActivity: ActivityItem = {
            id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            groupId,
            userId: data.currentUserId,
            type,
            title,
            description,
            symbol,
            amountChangeUsd: amount,
            createdAt: new Date().toISOString(),
        };

        save({ ...data, activity: [newActivity, ...data.activity].slice(0, 100) });
    }, [data, save]);

    // Get group activity
    const getGroupActivity = useCallback((groupId: string) => {
        return data.activity
            .filter(a => a.groupId === groupId)
            .slice(0, 50);
    }, [data]);

    return (
        <UserContext.Provider value={{
            currentUser,
            users: data.users,
            holdings: data.holdings,
            groups: data.groups,
            activity: data.activity,
            currentGroup,
            isLoading,
            login,
            logout,
            updateUser,
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
