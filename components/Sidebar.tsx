"use client";

import { useState } from "react";
import { Member, GroupState } from "@/lib/types";
import { getMemberHoldings, getTotalPortfolioValue, getTotalPnlPercent, getMemberColor, formatCurrency, formatPercent } from "@/lib/utils";

interface SidebarProps {
    group: GroupState;
    members: Member[];
    selectedMemberId: string | null;
    currentProfileId: string | null; // Current logged-in user
    onSelectMember: (memberId: string) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onAddMember: (name: string) => Member;
}

export default function Sidebar({
    group,
    members,
    selectedMemberId,
    currentProfileId,
    onSelectMember,
    searchQuery,
    onSearchChange,
    onAddMember,
}: SidebarProps) {
    const [isAddingMember, setIsAddingMember] = useState(false);
    const [newMemberName, setNewMemberName] = useState("");
    const [error, setError] = useState("");

    const handleAddMember = () => {
        const trimmedName = newMemberName.trim();
        if (!trimmedName) {
            setError("Name is required");
            return;
        }
        if (group.members.some(m => m.name.toLowerCase() === trimmedName.toLowerCase())) {
            setError("An investor with this name already exists");
            return;
        }

        const newMember = onAddMember(trimmedName);
        setNewMemberName("");
        setIsAddingMember(false);
        setError("");
        onSelectMember(newMember.id);
    };

    const handleCancel = () => {
        setNewMemberName("");
        setIsAddingMember(false);
        setError("");
    };

    return (
        <aside className="w-72 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800 flex flex-col overflow-hidden">
            {/* Search */}
            <div className="p-4 border-b border-slate-800">
                <div className="space-y-2">
                    <label htmlFor="member-search" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Search Investors
                    </label>
                    <input
                        id="member-search"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Filter by name..."
                        className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                </div>
            </div>

            {/* Member List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Investors ({group.members.length})
                </div>

                {members.length === 0 && !isAddingMember && (
                    <div className="text-center py-8">
                        <div className="text-slate-500 text-sm mb-2">
                            No investors yet
                        </div>
                        <div className="text-slate-600 text-xs">
                            Click &quot;Add Investor&quot; below to get started
                        </div>
                    </div>
                )}

                {members.map((member) => {
                    const isSelected = member.id === selectedMemberId;
                    const memberHoldings = getMemberHoldings(group.holdings, member.id);
                    const portfolioValue = getTotalPortfolioValue(memberHoldings);
                    const pnlPercent = getTotalPnlPercent(memberHoldings);
                    const memberColor = getMemberColor(member.colorHue);

                    return (
                        <button
                            key={member.id}
                            onClick={() => onSelectMember(member.id)}
                            className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 ${isSelected
                                ? "bg-emerald-600/20 border border-emerald-500/50 text-white"
                                : "text-slate-300 hover:bg-slate-800/50 hover:text-white border border-transparent"
                                }`}
                        >
                            {/* Avatar */}
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-white"
                                style={{ backgroundColor: memberColor }}
                            >
                                {member.name.charAt(0).toUpperCase()}
                            </div>

                            {/* Name and Stats */}
                            <div className="flex-1 text-left min-w-0">
                                <div className="font-medium truncate">{member.name}</div>
                                {memberHoldings.length > 0 ? (
                                    <>
                                        <div className="text-xs text-slate-400 mt-0.5">
                                            {formatCurrency(portfolioValue, 0)}
                                        </div>
                                        <div className={`text-xs font-medium mt-0.5 ${pnlPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {formatPercent(pnlPercent)}
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-xs text-slate-500 mt-0.5">
                                        No holdings
                                    </div>
                                )}
                            </div>

                            {/* Selection indicator */}
                            {isSelected && (
                                <div className="text-emerald-400 flex-shrink-0">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Add Member Section */}
            <div className="p-4 border-t border-slate-800">
                {isAddingMember ? (
                    <div className="space-y-3">
                        <input
                            type="text"
                            value={newMemberName}
                            onChange={(e) => {
                                setNewMemberName(e.target.value);
                                setError("");
                            }}
                            placeholder="Investor name"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleAddMember();
                                if (e.key === "Escape") handleCancel();
                            }}
                        />
                        {error && (
                            <div className="text-red-400 text-xs">{error}</div>
                        )}
                        <div className="flex gap-2">
                            <button
                                onClick={handleAddMember}
                                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                Add
                            </button>
                            <button
                                onClick={handleCancel}
                                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsAddingMember(true)}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Investor
                    </button>
                )}
            </div>
        </aside>
    );
}
