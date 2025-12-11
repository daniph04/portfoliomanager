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
    { id: "overview" as const, label: "Group Portfolio", icon: "📊" },
    { id: "investors" as const, label: "Investors", icon: "👥" },
    { id: "leaderboard" as const, label: "Ranking", icon: "🏆" },
    { id: "activity" as const, label: "Activity", icon: "📈" },
];

export default function TopNav({ currentTab, onTabChange, groupName, currentProfileName }: TopNavProps) {
    const router = useRouter();
    const { groups, currentGroup, setCurrentGroup, signOut, currentUser } = useUser();
    const [showMenu, setShowMenu] = useState(false);

    const handleLogout = async () => {
        await signOut();
        router.push("/");
    };

    const handleSwitchGroup = (groupId: string) => {
        setCurrentGroup(groupId);
        setShowMenu(false);
    };

    const handleJoinNewGroup = () => {
        setShowMenu(false);
        router.push("/groups");
    };

    return (
        <>
            {/* Top Header - Premium Glass Effect */}
            <nav className="glass sticky top-0 z-40 border-b border-white/5">
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                        {/* Left: Group Name with enhanced styling */}
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                            {/* Animated logo */}
                            <div className="relative">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-cyan-500 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                </div>
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 blur-lg opacity-30 animate-pulse" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-lg font-bold gradient-text truncate">
                                    {groupName || "Portfolio League"}
                                </h1>
                                {currentProfileName && (
                                    <span className="text-xs text-slate-400 truncate block font-medium">
                                        {currentProfileName}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Right: Notification Bell + Menu button */}
                        <div className="flex items-center gap-2">
                            <NotificationBell />
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200 flex-shrink-0"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Dropdown Menu */}
            {showMenu && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40 bg-black/50"
                        onClick={() => setShowMenu(false)}
                    />

                    {/* Bottom Sheet Menu - Mobile Friendly */}
                    <div
                        className="fixed inset-x-0 bottom-0 z-50 transform transition-transform duration-300 ease-out"
                        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                    >
                        <div className="bg-slate-900 border-t border-white/10 rounded-t-3xl shadow-2xl max-h-[70vh] overflow-y-auto">
                            {/* Handle */}
                            <div className="flex justify-center pt-3 pb-2">
                                <div className="w-10 h-1 rounded-full bg-slate-600" />
                            </div>

                            <div className="px-4 pb-4">
                                {/* User Info */}
                                {currentUser && (
                                    <div className="bg-white/5 rounded-xl p-4 mb-4">
                                        <p className="text-lg font-semibold text-white">{currentUser.name}</p>
                                        <p className="text-sm text-emerald-400">
                                            Cash: ${currentUser.cashBalance.toLocaleString()}
                                        </p>
                                    </div>
                                )}

                                {/* Groups */}
                                <div className="mb-4">
                                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 px-1">
                                        Your Groups
                                    </div>
                                    <div className="space-y-1">
                                        {groups.map((group) => (
                                            <button
                                                key={group.id}
                                                onClick={() => handleSwitchGroup(group.id)}
                                                className={`w-full px-4 py-3 text-left flex items-center justify-between rounded-xl transition-colors ${group.id === currentGroup?.id
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                                                    }`}
                                            >
                                                <span className="font-medium">{group.name}</span>
                                                {group.id === currentGroup?.id && (
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="space-y-2">
                                    <button
                                        onClick={handleJoinNewGroup}
                                        className="w-full px-4 py-3.5 text-left text-slate-300 bg-white/5 hover:bg-white/10 rounded-xl transition-colors flex items-center gap-3"
                                    >
                                        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Join or Create Group
                                    </button>

                                    <button
                                        onClick={handleLogout}
                                        className="w-full px-4 py-3.5 text-left text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-colors flex items-center gap-3"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Bottom Tab Bar - Premium Glass */}
            <div className="fixed bottom-0 left-0 right-0 glass border-t border-white/5 z-40 safe-area-bottom">
                <div className="flex items-center justify-around py-2 px-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`relative flex flex-col items-center justify-center py-2 px-2 rounded-xl transition-all duration-300 min-w-0 flex-1 ${currentTab === tab.id
                                ? "text-emerald-400"
                                : "text-slate-500 hover:text-slate-400"
                                }`}
                        >
                            {/* Active indicator line */}
                            {currentTab === tab.id && (
                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500" />
                            )}

                            {/* Icon with glow when active */}
                            <div className={`text-xl mb-0.5 transition-transform duration-300 ${currentTab === tab.id ? 'scale-110' : ''}`}>
                                {tab.icon}
                            </div>

                            <span className={`text-[10px] font-semibold truncate transition-all ${currentTab === tab.id
                                ? 'text-emerald-400'
                                : 'text-slate-500'
                                }`}>
                                {tab.label}
                            </span>

                            {/* Background glow effect */}
                            {currentTab === tab.id && (
                                <div className="absolute inset-0 rounded-xl bg-emerald-500/10 -z-10" />
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
}
