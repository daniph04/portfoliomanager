"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/hooks/useUser";

export default function GroupsPage() {
    const router = useRouter();
    const { currentUser, isLoading, getUserGroups, createGroup, joinGroup, setCurrentGroup } = useUser();

    const [mode, setMode] = useState<"join" | "create">("join");
    const [groupName, setGroupName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    const userGroups = currentUser ? getUserGroups() : [];

    // Redirect if not logged in
    useEffect(() => {
        if (!isLoading && !currentUser) {
            router.push("/");
        }
    }, [isLoading, currentUser, router]);

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
        }
    };

    const handleSelectExistingGroup = (groupId: string) => {
        setCurrentGroup(groupId);
        router.push("/dashboard");
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
                    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 mb-6">
                        <h2 className="text-lg font-semibold text-slate-100 mb-4">Your Groups</h2>
                        <div className="space-y-2">
                            {userGroups.map((group) => (
                                <button
                                    key={group.id}
                                    onClick={() => handleSelectExistingGroup(group.id)}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                                >
                                    <span className="font-medium text-slate-100">{group.name}</span>
                                    <span className="text-emerald-400">→</span>
                                </button>
                            ))}
                        </div>
                    </div>
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
                                placeholder={mode === "create" ? "My Investing Group" : "Enter group name..."}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={mode === "create" ? "Choose a password" : "Enter password..."}
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
                            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl transition-all"
                        >
                            {mode === "create" ? "Create Group" : "Join Group"}
                        </button>
                    </form>
                </div>

                {/* Logout */}
                <div className="text-center mt-6">
                    <button
                        onClick={() => router.push("/")}
                        className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
                    >
                        Switch Account
                    </button>
                </div>
            </div>
        </div>
    );
}
