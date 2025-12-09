"use client";

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './useAuth';
import { Group, GroupMember, Activity, UserProfile, UserHolding } from '@/lib/supabase/types';

interface GroupContextType {
    groups: Group[];
    currentGroup: Group | null;
    groupMembers: (UserProfile & { holdings: UserHolding[] })[];
    activity: Activity[];
    isLoading: boolean;
    setCurrentGroup: (groupId: string) => Promise<void>;
    createGroup: (name: string, password: string) => Promise<Group | null>;
    joinGroup: (name: string, password: string) => Promise<{ error: string | null; group: Group | null }>;
    leaveGroup: (groupId: string) => Promise<void>;
    refreshGroups: () => Promise<void>;
    refreshGroupData: () => Promise<void>;
    addActivity: (type: Activity['type'], title: string, description?: string, symbol?: string, amount?: number) => Promise<void>;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export function GroupProvider({ children }: { children: React.ReactNode }) {
    const { user, profile } = useAuth();
    const [groups, setGroups] = useState<Group[]>([]);
    const [currentGroup, setCurrentGroupState] = useState<Group | null>(null);
    const [groupMembers, setGroupMembers] = useState<(UserProfile & { holdings: UserHolding[] })[]>([]);
    const [activity, setActivity] = useState<Activity[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const supabase = createClient();

    // Fetch user's groups
    const refreshGroups = useCallback(async () => {
        if (!user) {
            setGroups([]);
            return;
        }

        const { data: memberData } = await supabase
            .from('group_members')
            .select('group_id')
            .eq('user_id', user.id);

        if (memberData && memberData.length > 0) {
            const groupIds = memberData.map(m => m.group_id);
            const { data: groupsData } = await supabase
                .from('groups')
                .select('*')
                .in('id', groupIds);

            if (groupsData) {
                setGroups(groupsData as Group[]);
            }
        } else {
            setGroups([]);
        }
    }, [user, supabase]);

    // Fetch group members and their holdings
    const refreshGroupData = useCallback(async () => {
        if (!currentGroup) {
            setGroupMembers([]);
            setActivity([]);
            return;
        }

        // Get group members
        const { data: memberData } = await supabase
            .from('group_members')
            .select('user_id')
            .eq('group_id', currentGroup.id);

        if (memberData && memberData.length > 0) {
            const userIds = memberData.map(m => m.user_id);

            // Get profiles
            const { data: profilesData } = await supabase
                .from('user_profiles')
                .select('*')
                .in('id', userIds);

            // Get holdings for all members
            const { data: holdingsData } = await supabase
                .from('user_holdings')
                .select('*')
                .in('user_id', userIds);

            if (profilesData) {
                const membersWithHoldings = profilesData.map(profile => ({
                    ...profile,
                    holdings: (holdingsData || []).filter(h => h.user_id === profile.id),
                })) as (UserProfile & { holdings: UserHolding[] })[];

                setGroupMembers(membersWithHoldings);
            }
        }

        // Get activity
        const { data: activityData } = await supabase
            .from('activity')
            .select('*')
            .eq('group_id', currentGroup.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (activityData) {
            setActivity(activityData as Activity[]);
        }
    }, [currentGroup, supabase]);

    // Initialize
    useEffect(() => {
        const init = async () => {
            await refreshGroups();
            setIsLoading(false);
        };

        if (user) {
            init();
        } else {
            setIsLoading(false);
        }
    }, [user, refreshGroups]);

    // Auto-select last group
    useEffect(() => {
        if (groups.length > 0 && !currentGroup && profile?.last_group_id) {
            const lastGroup = groups.find(g => g.id === profile.last_group_id);
            if (lastGroup) {
                setCurrentGroupState(lastGroup);
            }
        } else if (groups.length > 0 && !currentGroup) {
            setCurrentGroupState(groups[0]);
        }
    }, [groups, currentGroup, profile]);

    // Refresh data when group changes
    useEffect(() => {
        if (currentGroup) {
            refreshGroupData();
        }
    }, [currentGroup, refreshGroupData]);

    // Set current group and save to profile
    const setCurrentGroup = async (groupId: string) => {
        const group = groups.find(g => g.id === groupId);
        if (group) {
            setCurrentGroupState(group);

            // Save as last group
            if (user) {
                await supabase
                    .from('user_profiles')
                    .update({ last_group_id: groupId })
                    .eq('id', user.id);
            }
        }
    };

    // Create new group
    const createGroup = async (name: string, password: string): Promise<Group | null> => {
        if (!user) return null;

        // Simple hash (in production use bcrypt on server)
        const passwordHash = btoa(password);

        const { data, error } = await supabase
            .from('groups')
            .insert({
                name,
                password_hash: passwordHash,
                created_by: user.id,
            })
            .select()
            .single();

        if (error || !data) return null;

        // Join the group
        await supabase
            .from('group_members')
            .insert({
                group_id: data.id,
                user_id: user.id,
            });

        // Add join activity
        await supabase
            .from('activity')
            .insert({
                group_id: data.id,
                user_id: user.id,
                type: 'JOIN',
                title: `${profile?.name || 'Someone'} created the group`,
            });

        await refreshGroups();
        setCurrentGroupState(data as Group);

        return data as Group;
    };

    // Join existing group
    const joinGroup = async (name: string, password: string): Promise<{ error: string | null; group: Group | null }> => {
        if (!user) return { error: 'Not authenticated', group: null };

        // Find group by name
        const { data: groupData } = await supabase
            .from('groups')
            .select('*')
            .ilike('name', name)
            .single();

        if (!groupData) {
            return { error: 'Group not found', group: null };
        }

        // Check password
        if (atob(groupData.password_hash) !== password) {
            return { error: 'Wrong password', group: null };
        }

        // Check if already member
        const { data: existingMember } = await supabase
            .from('group_members')
            .select('*')
            .eq('group_id', groupData.id)
            .eq('user_id', user.id)
            .single();

        if (existingMember) {
            setCurrentGroupState(groupData as Group);
            return { error: null, group: groupData as Group };
        }

        // Join
        await supabase
            .from('group_members')
            .insert({
                group_id: groupData.id,
                user_id: user.id,
            });

        // Add join activity
        await supabase
            .from('activity')
            .insert({
                group_id: groupData.id,
                user_id: user.id,
                type: 'JOIN',
                title: `${profile?.name || 'Someone'} joined the group`,
            });

        await refreshGroups();
        setCurrentGroupState(groupData as Group);

        return { error: null, group: groupData as Group };
    };

    // Leave group
    const leaveGroup = async (groupId: string) => {
        if (!user) return;

        await supabase
            .from('group_members')
            .delete()
            .eq('group_id', groupId)
            .eq('user_id', user.id);

        await refreshGroups();

        if (currentGroup?.id === groupId) {
            setCurrentGroupState(groups.length > 1 ? groups.find(g => g.id !== groupId) || null : null);
        }
    };

    // Add activity
    const addActivity = async (
        type: Activity['type'],
        title: string,
        description?: string,
        symbol?: string,
        amount?: number
    ) => {
        if (!currentGroup || !user) return;

        await supabase
            .from('activity')
            .insert({
                group_id: currentGroup.id,
                user_id: user.id,
                type,
                title,
                description,
                symbol,
                amount_change_usd: amount,
            });

        await refreshGroupData();
    };

    return (
        <GroupContext.Provider value={{
            groups,
            currentGroup,
            groupMembers,
            activity,
            isLoading,
            setCurrentGroup,
            createGroup,
            joinGroup,
            leaveGroup,
            refreshGroups,
            refreshGroupData,
            addActivity,
        }}>
            {children}
        </GroupContext.Provider>
    );
}

export function useGroups() {
    const context = useContext(GroupContext);
    if (context === undefined) {
        throw new Error('useGroups must be used within a GroupProvider');
    }
    return context;
}
