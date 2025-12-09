"use client";

import { useState, useEffect, useCallback, createContext, useContext, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile, UserHolding } from '@/lib/supabase/types';

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    holdings: UserHolding[];
    isLoading: boolean;
    signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
    signIn: (email: string, password: string) => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    refreshHoldings: () => Promise<void>;
    updateProfile: (data: Partial<UserProfile>) => Promise<void>;
    addHolding: (holding: Omit<UserHolding, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<UserHolding | null>;
    updateHolding: (id: string, data: Partial<UserHolding>) => Promise<void>;
    deleteHolding: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Singleton client
let supabaseClientInstance: SupabaseClient | null = null;
function getSupabaseClient() {
    if (!supabaseClientInstance) {
        supabaseClientInstance = createClient();
    }
    return supabaseClientInstance;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [holdings, setHoldings] = useState<UserHolding[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const supabase = useMemo(() => getSupabaseClient(), []);

    // Fetch user profile
    const refreshProfile = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (data) {
            setProfile(data as UserProfile);
        }
    }, [supabase]);

    // Fetch user holdings
    const refreshHoldings = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('user_holdings')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (data) {
            setHoldings(data as UserHolding[]);
        }
    }, [supabase]);

    // Initialize auth state
    useEffect(() => {
        let isMounted = true;

        const initAuth = async () => {
            try {
                console.log('Initializing auth...');
                const { data: { user }, error } = await supabase.auth.getUser();

                if (!isMounted) return;

                if (error) {
                    console.error('Auth init error:', error);
                }

                setUser(user);

                if (user) {
                    // Fetch profile and holdings
                    const [profileResult, holdingsResult] = await Promise.all([
                        supabase.from('user_profiles').select('*').eq('id', user.id).single(),
                        supabase.from('user_holdings').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
                    ]);

                    if (isMounted) {
                        if (profileResult.data) {
                            setProfile(profileResult.data as UserProfile);
                        }
                        if (holdingsResult.data) {
                            setHoldings(holdingsResult.data as UserHolding[]);
                        }
                    }
                }
            } catch (err) {
                console.error('Auth initialization error:', err);
            } finally {
                if (isMounted) {
                    console.log('Auth initialized');
                    setIsLoading(false);
                }
            }
        };

        initAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth state changed:', event);
                if (!isMounted) return;

                setUser(session?.user ?? null);

                if (session?.user) {
                    const [profileResult, holdingsResult] = await Promise.all([
                        supabase.from('user_profiles').select('*').eq('id', session.user.id).single(),
                        supabase.from('user_holdings').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false })
                    ]);

                    if (isMounted) {
                        if (profileResult.data) {
                            setProfile(profileResult.data as UserProfile);
                        }
                        if (holdingsResult.data) {
                            setHoldings(holdingsResult.data as UserHolding[]);
                        }
                    }
                } else {
                    setProfile(null);
                    setHoldings([]);
                }
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []); // Empty deps - only run once

    // Sign up
    const signUp = async (email: string, password: string, name: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name },
            },
        });

        return { error: error?.message || null };
    };

    // Sign in
    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        return { error: error?.message || null };
    };

    // Sign out
    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setHoldings([]);
    };

    // Update profile
    const updateProfile = async (data: Partial<UserProfile>) => {
        if (!user) {
            console.error('updateProfile: No user logged in');
            throw new Error('Not authenticated');
        }

        console.log('Updating profile:', data);
        const { error } = await supabase
            .from('user_profiles')
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq('id', user.id);

        if (error) {
            console.error('updateProfile error:', error);
            throw error;
        }

        await refreshProfile();
    };

    // Add holding
    const addHolding = async (holding: Omit<UserHolding, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
        if (!user) {
            console.error('addHolding: No user logged in');
            throw new Error('Not authenticated');
        }

        console.log('Adding holding:', holding);
        const { data, error } = await supabase
            .from('user_holdings')
            .insert({
                ...holding,
                user_id: user.id,
            })
            .select()
            .single();

        if (error) {
            console.error('addHolding error:', error);
            throw error;
        }

        if (data) {
            await refreshHoldings();
            return data as UserHolding;
        }

        return null;
    };

    // Update holding
    const updateHolding = async (id: string, data: Partial<UserHolding>) => {
        await supabase
            .from('user_holdings')
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq('id', id);

        await refreshHoldings();
    };

    // Delete holding
    const deleteHolding = async (id: string) => {
        await supabase
            .from('user_holdings')
            .delete()
            .eq('id', id);

        await refreshHoldings();
    };

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            holdings,
            isLoading,
            signUp,
            signIn,
            signOut,
            refreshProfile,
            refreshHoldings,
            updateProfile,
            addHolding,
            updateHolding,
            deleteHolding,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
