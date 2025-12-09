"use client";

import { useState } from "react";
import { usePersistentGroupData } from "@/lib/useGroupData";
import { useRouter } from "next/navigation";

interface TopNavProps {
    currentTab: "overview" | "leaderboard" | "members" | "activity";
    onTabChange: (tab: "overview" | "leaderboard" | "members" | "activity") => void;
    groupName?: string;
    currentProfileName?: string;
}

const tabs = [
    { id: "overview" as const, label: "Overview", icon: "📊" },
    { id: "leaderboard" as const, label: "Leaderboard", icon: "🏆" },
    { id: "members" as const, label: "Investors", icon: "👥" },
    { id: "activity" as const, label: "Activity", icon: "📈" },
];

export default function TopNav({ currentTab, onTabChange, groupName, currentProfileName }: TopNavProps) {
    const router = useRouter();
    const { appState, session, helpers } = usePersistentGroupData();
    const [showGroupDropdown, setShowGroupDropdown] = useState(false);

    // Get all groups the user has access to (they've authenticated to)
    const availableGroups = appState.groups;
    const currentGroupId = session?.groupId;

    const handleLogout = () => {
        helpers.clearSession();
        router.push("/");
    };

    const handleSwitchProfile = () => {
        const currentSession = JSON.parse(localStorage.getItem("portfolio_league_session") || "{}");
        if (currentSession.groupId) {
            helpers.setSession(currentSession.groupId, null);
            router.push("/select-profile");
        }
    };

    const handleSwitchGroup = (groupId: string) => {
        helpers.setSession(groupId, null); // Clear profile, they'll need to select
        setShowGroupDropdown(false);
        router.push("/select-profile");
    };

    const handleJoinNewGroup = () => {
        helpers.clearSession();
        setShowGroupDropdown(false);
        router.push("/");
    };

    return (
        <nav className="bg-slate-900/50 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-40">
            <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                    {/* Left: App Name + Group Switcher */}
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                        </div>
                        <div className="relative">
                            {/* Group name with dropdown trigger */}
                            <button
                                onClick={() => setShowGroupDropdown(!showGroupDropdown)}
                                className="flex items-center gap-2 group"
                            >
                                <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                                    {groupName || "Portfolio League"}
                                </h1>
                                {availableGroups.length > 1 && (
                                    <svg
                                        className={`w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-all ${showGroupDropdown ? 'rotate-180' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                )}
                            </button>

                            {/* Profile switch */}
                            {currentProfileName && (
                                <button
                                    onClick={handleSwitchProfile}
                                    className="text-xs text-slate-500 hover:text-emerald-400 transition-colors block"
                                >
                                    Logged in as <span className="text-slate-300">{currentProfileName}</span> · switch
                                </button>
                            )}

                            {/* Group Dropdown */}
                            {showGroupDropdown && (
                                <>
                                    {/* Backdrop */}
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setShowGroupDropdown(false)}
                                    />

                                    {/* Dropdown Menu */}
                                    <div className="absolute top-full left-0 mt-2 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                                        <div className="py-2">
                                            <div className="px-4 py-2 text-xs text-slate-500 uppercase tracking-wider">
                                                Your Groups
                                            </div>
                                            {availableGroups.map((group) => (
                                                <button
                                                    key={group.id}
                                                    onClick={() => handleSwitchGroup(group.id)}
                                                    className={`w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-slate-800 transition-colors ${group.id === currentGroupId
                                                            ? 'bg-emerald-500/10 text-emerald-400'
                                                            : 'text-slate-300'
                                                        }`}
                                                >
                                                    <span className="font-medium">{group.name}</span>
                                                    {group.id === currentGroupId && (
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
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Center: Tabs */}
                    <div className="flex items-center space-x-1 bg-slate-800/50 rounded-lg p-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${currentTab === tab.id
                                    ? "bg-emerald-600 text-white shadow-lg"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                                    }`}
                            >
                                <span className="text-base">{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Right: Logout */}
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
