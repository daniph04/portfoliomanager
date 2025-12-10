"use client";

import { useState } from "react";
import { useUser } from "@/lib/hooks/useUser";
import { useRouter } from "next/navigation";

interface TopNavProps {
    currentTab: "overview" | "leaderboard" | "members" | "activity";
    onTabChange: (tab: "overview" | "leaderboard" | "members" | "activity") => void;
    groupName?: string;
    currentProfileName?: string;
}

const tabs = [
    { id: "members" as const, label: "My Portfolio", icon: "👤" },
    { id: "overview" as const, label: "Group", icon: "📊" },
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
            {/* Top Header */}
            <nav className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-40">
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                        {/* Left: Group Name */}
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent truncate">
                                    {groupName || "Portfolio League"}
                                </h1>
                                {currentProfileName && (
                                    <span className="text-xs text-slate-500 truncate block">
                                        {currentProfileName}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Right: Menu button */}
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
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

            {/* Bottom Tab Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 z-40 safe-area-bottom">
                <div className="flex items-center justify-around py-2 px-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all min-w-0 flex-1 ${currentTab === tab.id
                                ? "text-emerald-400"
                                : "text-slate-500"
                                }`}
                        >
                            <span className="text-xl mb-0.5">{tab.icon}</span>
                            <span className={`text-xs font-medium truncate ${currentTab === tab.id ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {tab.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
}
