"use client";

import { GroupState } from "@/lib/types";
import { formatDateTime, formatCurrency } from "@/lib/utils";

interface ActivityTabProps {
    group: GroupState;
}

// Activity type icons as SVG components
const BuyIcon = () => (
    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
    </div>
);

const SellIcon = () => (
    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
    </div>
);

const UpdateIcon = () => (
    <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
        <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
    </div>
);

const NoteIcon = () => (
    <div className="w-10 h-10 rounded-full bg-slate-500/20 flex items-center justify-center">
        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    </div>
);

const JoinIcon = () => (
    <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
        <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
    </div>
);

const DepositIcon = () => (
    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
    </div>
);

const WithdrawIcon = () => (
    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
    </div>
);

const SeasonIcon = () => (
    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
        <svg className="w-5 h-5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8l2.09 4.26L19 13l-3.4 3.3L16.18 21 12 18.9 7.82 21 9 16.3 5 13l4.91-.74L12 8z" />
        </svg>
    </div>
);

const getEventIcon = (type: string) => {
    switch (type) {
        case "BUY": return <BuyIcon />;
        case "SELL": return <SellIcon />;
        case "UPDATE": return <UpdateIcon />;
        case "JOIN": return <JoinIcon />;
        case "DEPOSIT": return <DepositIcon />;
        case "WITHDRAW": return <WithdrawIcon />;
        case "SEASON_STARTED": return <SeasonIcon />;
        case "GROUP_CREATED": return <JoinIcon />;
        case "NOTE": return <NoteIcon />;
        default: return <NoteIcon />;
    }
};

export default function ActivityTab({ group }: ActivityTabProps) {
    // Sort activity by timestamp (newest first)
    const sortedActivity = [...group.activity].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Get member name by ID
    const getMemberName = (memberId: string | null) => {
        if (!memberId) return "All investors";
        const member = group.members.find((m) => m.id === memberId);
        return member?.name || "Unknown";
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header - Premium */}
            <div className="flex items-center gap-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="absolute inset-0 rounded-xl bg-violet-500 blur-xl opacity-30" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold gradient-text">Activity Feed</h2>
                    <p className="text-slate-400">Recent trades and updates</p>
                </div>
            </div>

            {/* Activity List */}
            <div className="space-y-3">
                {sortedActivity.length === 0 ? (
                    <div className="card-premium rounded-2xl p-12 text-center">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                            <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">No activity yet</h3>
                        <p className="text-slate-400 max-w-md mx-auto">
                            Trades and portfolio changes will appear here.
                        </p>
                    </div>
                ) : (
                    sortedActivity.map((event, index) => (
                        <div
                            key={event.id}
                            className={`card-premium rounded-xl p-4 opacity-0 animate-fade-in`}
                            style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
                        >
                            <div className="flex items-start space-x-4">
                                {/* Icon */}
                                <div className="flex-shrink-0">
                                    {getEventIcon(event.type)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            {/* Title */}
                                            <div className="font-semibold text-slate-100">
                                                {event.title}
                                            </div>
                                            {/* Description */}
                                            {event.description && (
                                                <div className="text-sm text-slate-400 mt-1">
                                                    {event.description}
                                                </div>
                                            )}
                                            {/* Member + Symbol badge */}
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-300">
                                                    {getMemberName(event.memberId)}
                                                </span>
                                                {event.symbol && (
                                                    <span className="text-xs px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-400 font-mono">
                                                        {event.symbol}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right side: Timestamp + P/L */}
                                        <div className="text-right flex-shrink-0">
                                            <div className="text-xs text-slate-500 whitespace-nowrap">
                                                {formatDateTime(event.timestamp)}
                                            </div>
                                            {/* Show P/L for SELL events */}
                                            {event.amountChangeUsd !== undefined && (
                                                <div className={`text-sm font-semibold mt-1 ${event.amountChangeUsd >= 0 ? "text-emerald-400" : "text-red-400"
                                                    }`}>
                                                    {event.amountChangeUsd >= 0 ? "+" : ""}
                                                    {formatCurrency(event.amountChangeUsd)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Activity count footer */}
            {sortedActivity.length > 0 && (
                <div className="text-center text-xs text-slate-500">
                    {sortedActivity.length} event{sortedActivity.length !== 1 ? "s" : ""} total
                </div>
            )}
        </div>
    );
}
