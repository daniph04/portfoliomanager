"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/hooks/useUser";

export default function GroupsPage() {
    const router = useRouter();
    const { currentUser, isAuthenticated, isLoading, getUserGroups, createGroup, joinGroup, setCurrentGroup, signOut, groups } = useUser();

    const [mode, setMode] = useState<"join" | "create">("join");
    const [groupName, setGroupName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const userGroups = getUserGroups();

    // Redirect if not authenticated
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/");
        }
    }, [isLoading, isAuthenticated, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!groupName.trim()) {
            setError("Please enter a group name");
            return;
        }
        if (!password.trim()) {
            setError("Please enter a password");
            return;
        }

        setIsSubmitting(true);

        try {
            if (mode === "create") {
                const group = await createGroup(groupName.trim(), password);
                if (group) {
                    setCurrentGroup(group.id);
                    router.push("/dashboard");
                } else {
                    setError("Failed to create group");
                }
            } else {
                const result = await joinGroup(groupName.trim(), password);
                if (result.success && result.group) {
                    setCurrentGroup(result.group.id);
                    router.push("/dashboard");
                } else {
                    setError(result.error || "Failed to join group");
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSelectExistingGroup = (groupId: string) => {
        setCurrentGroup(groupId);
        router.push("/dashboard");
    };

    const handleLogout = async () => {
        await signOut();
        router.push("/");
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            {/* Background */}
            <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent" />

            <div className="relative z-10 w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-100">
                        Hey {currentUser?.name}! 👋
                    </h1>
                    <p className="text-slate-400 mt-2">Join or create a group to get started</p>
                </div>

                {/* Existing Groups */}
                {userGroups.length > 0 && (
                    <>
                        {/* Empty State Hero - Only show if user has just the private group */}
                        {userGroups.length === 1 && userGroups[0].type === 'private' && (
                            <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-emerald-500/20 rounded-3xl p-12 mb-6 text-center relative overflow-hidden">
                                {/* Background decoration */}
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-blue-500/5 to-purple-500/5 pointer-events-none" />

                                <div className="relative">
                                    <div className="text-6xl mb-6">🎯</div>
                                    <h2 className="text-2xl font-bold text-white mb-3">
                                        Play Portfolio League with Friends
                                    </h2>
                                    <p className="text-slate-400 mb-8 max-w-md mx-auto px-4">
                                        Right now you&apos;re in your own league. Create a new league for your group chat or join one with an invite code.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 mb-6">
                            <h2 className="text-lg font-semibold text-slate-100 mb-4">Your Leagues</h2>
                            <div className="space-y-2">
                                {userGroups.map((group) => (
                                    <button
                                        key={group.id}
                                        onClick={() => handleSelectExistingGroup(group.id)}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-slate-100">{group.name}</span>
                                            {group.type === 'private' && (
                                                <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded">
                                                    Private
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-emerald-400">→</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Join/Create Card */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
                    {/* Tabs */}
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => { setMode("join"); setError(null); }}
                            className={`flex-1 py-2 rounded-lg font-medium transition-all ${mode === "join"
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-800 text-slate-400 hover:text-slate-200"
                                }`}
                        >
                            Join Group
                        </button>
                        <button
                            onClick={() => { setMode("create"); setError(null); }}
                            className={`flex-1 py-2 rounded-lg font-medium transition-all ${mode === "create"
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-800 text-slate-400 hover:text-slate-200"
                                }`}
                        >
                            Create Group
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Group Name
                            </label>
                            <input
                                type="text"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                placeholder={mode === "create" ? "My Investment Group" : "Group name..."}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Group Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={mode === "create" ? "Choose a password" : "Password..."}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all"
                        >
                            {isSubmitting ? "Loading..." : mode === "create" ? "Create Group" : "Join Group"}
                        </button>
                    </form>
                </div>

                {/* Logout */}
                <div className="text-center mt-6">
                    <button
                        onClick={handleLogout}
                        className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
