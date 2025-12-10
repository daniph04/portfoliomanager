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

                    {/* Menu */}
                    <div className="fixed top-14 right-4 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                        <div className="py-2">
                            {/* User Info */}
                            {currentUser && (
                                <div className="px-4 py-3 border-b border-slate-700">
                                    <p className="text-sm font-medium text-slate-100">{currentUser.name}</p>
                                    <p className="text-xs text-emerald-400">
                                        Cash: ${currentUser.cashBalance.toLocaleString()}
                                    </p>
                                </div>
                            )}

                            {/* Groups */}
                            <div className="px-4 py-2 text-xs text-slate-500 uppercase tracking-wider">
                                Your Groups
                            </div>
                            {groups.map((group) => (
                                <button
                                    key={group.id}
                                    onClick={() => handleSwitchGroup(group.id)}
                                    className={`w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-slate-800 transition-colors ${group.id === currentGroup?.id
                                        ? 'bg-emerald-500/10 text-emerald-400'
                                        : 'text-slate-300'
                                        }`}
                                >
                                    <span className="font-medium">{group.name}</span>
                                    {group.id === currentGroup?.id && (
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </button>
                            ))}

                            {/* Divider */}
                            <div className="my-2 border-t border-slate-700" />

                            {/* Join new group */}
                            <button
                                onClick={handleJoinNewGroup}
                                className="w-full px-4 py-2.5 text-left text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Join / Create Group
                            </button>

                            {/* Divider */}
                            <div className="my-2 border-t border-slate-700" />

                            {/* Logout */}
                            <button
                                onClick={handleLogout}
                                className="w-full px-4 py-2.5 text-left text-red-400 hover:bg-slate-800 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Logout
                            </button>
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
