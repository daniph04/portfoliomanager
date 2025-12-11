"use client";

import { useState } from "react";
import { useUser } from "@/lib/hooks/useUser";
import { useRouter } from "next/navigation";
import NotificationBell from "./NotificationBell";

interface TopNavProps {
    currentTab: "portfolio" | "overview" | "investors" | "leaderboard" | "activity";
    onTabChange: (tab: "portfolio" | "overview" | "investors" | "leaderboard" | "activity") => void;
    groupName?: string;
    currentProfileName?: string;
}

const tabs = [
    { id: "portfolio" as const, label: "My Portfolio", icon: "👤" },
    { id: "overview" as const, label: "Group", icon: "📊" },
    { id: "investors" as const, label: "Investors", icon: "👥" },
    { id: "leaderboard" as const, label: "Ranking", icon: "🏆" },
    { id: "activity" as const, label: "Activity", icon: "⚡" },
];

export default function TopNav({ currentTab, onTabChange, groupName, currentProfileName }: TopNavProps) {
    const router = useRouter();
    const { groups, currentGroup, setCurrentGroup, signOut, currentUser } = useUser();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [switchGroupSheetOpen, setSwitchGroupSheetOpen] = useState(false);

    const handleLogout = async () => {
        await signOut();
        router.push("/");
    };

    const handleSwitchGroup = (groupId: string) => {
        setCurrentGroup(groupId);
        setSwitchGroupSheetOpen(false);
    };

    return (
        <>
            {/* Top Navigation Bar */}
            <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5 bg-slate-900/80 safe-area-top">
                <div className="px-4 h-16 flex items-center justify-between">
                    {/* Brand / Group Name */}
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <span className="text-white font-bold text-lg">P</span>
                        </div>
                        <div className="text-left">
                            <h1 className="text-sm font-bold text-slate-100">
                                {groupName || "Portfolio League"}
                            </h1>
                            {currentProfileName && (
                                <p className="text-[11px] text-emerald-400 font-medium tracking-wide uppercase">
                                    {currentProfileName}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                        <NotificationBell />
                        <div className="w-px h-6 bg-slate-800 mx-2" />
                        <button
                            onClick={() => setShowProfileMenu(true)}
                            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-400 hover:text-white transition-all active:scale-95"
                        >
                            {currentUser?.name?.charAt(0) || "U"}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Spacer for fixed header */}
            <div className="h-20" />


            {/* Profile Menu */}
            {showProfileMenu && (
                <>
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowProfileMenu(false)} />
                    <div className="fixed inset-x-0 bottom-0 z-50 bg-slate-900 rounded-t-2xl border-t border-slate-800 p-6 animate-slide-up safe-area-bottom">
                        <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-6" />

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                                {currentUser?.name?.charAt(0) || "U"}
                            </div>
                            <div>
                                <h3 className="text-white font-bold">{currentUser?.name || "User"}</h3>
                                <p className="text-slate-400 text-sm">{currentProfileName || "No profile"}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <button
                                onClick={() => { setShowProfileMenu(false); setSwitchGroupSheetOpen(true); }}
                                className="w-full p-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl text-slate-300 text-left font-medium transition-colors flex items-center gap-3">
                                <span className="text-lg">🔄</span>
                                Switch Group
                            </button>
                            <button
                                onClick={() => { setShowProfileMenu(false); router.push("/groups"); }}
                                className="w-full p-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl text-slate-300 text-left font-medium transition-colors flex items-center gap-3"
                            >
                                <span className="text-lg">➕</span>
                                Create New Group
                            </button>
                            <button
                                onClick={handleLogout}
                                className="w-full p-4 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-red-400 text-left font-medium transition-colors flex items-center gap-3"
                            >
                                <span className="text-lg">🚪</span>
                                Log Out
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Switch Group Sheet */}
            {switchGroupSheetOpen && (
                <>
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setSwitchGroupSheetOpen(false)} />
                    <div className="fixed inset-x-0 bottom-0 z-50 bg-slate-900 rounded-t-2xl border-t border-slate-800 p-6 animate-slide-up safe-area-bottom">
                        <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-6" />

                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Switch Group</h3>
                        <div className="space-y-2">
                            {groups.map((group) => (
                                <button
                                    key={group.id}
                                    onClick={() => handleSwitchGroup(group.id)}
                                    className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${group.id === currentGroup?.id
                                        ? "bg-emerald-500/10 border border-emerald-500/50 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                                        : "bg-slate-800/50 border border-transparent text-slate-400 hover:bg-slate-800"
                                        }`}
                                >
                                    <span className="font-semibold">{group.name}</span>
                                    {group.id === currentGroup?.id && (
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Bottom Tab Bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-xl border-t border-white/5 safe-area-bottom pb-1">
                <div className="flex justify-around items-center h-[3.25rem]">
                    {tabs.map((tab) => {
                        const isActive = currentTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-full ${isActive ? "text-emerald-400" : "text-slate-500 hover:text-slate-400"
                                    }`}
                            >
                                <span className={`text-xl transition-transform duration-200 ${isActive ? "scale-110 -translate-y-0.5" : ""}`}>
                                    {tab.icon}
                                </span>
                                <span className={`text-[9px] font-semibold transition-opacity duration-200 ${isActive ? "opacity-100" : "opacity-0 scale-0"}`}>
                                    {tab.label}
                                </span>
                                {isActive && (
                                    <div className="absolute top-0 w-8 h-0.5 bg-emerald-400 rounded-b-full shadow-[0_2px_8px_rgba(16,185,129,0.5)]" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </nav>
            {/* Spacer for bottom nav */}
            <div className="h-[4.5rem]" />
        </>
    );
}
