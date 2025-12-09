"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePersistentGroupData } from "@/lib/useGroupData";
import { Member, OnboardingHolding } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import OnboardingModal from "@/components/OnboardingModal";

export default function SelectProfilePage() {
    const router = useRouter();
    const { group, session, helpers, isLoading } = usePersistentGroupData();
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<Member | null>(null);

    // Redirect if no session
    useEffect(() => {
        if (!isLoading && !session?.groupId) {
            router.push("/");
        }
    }, [isLoading, session, router]);

    // If profile already selected, go to dashboard
    useEffect(() => {
        if (!isLoading && session?.profileId) {
            router.push("/dashboard");
        }
    }, [isLoading, session, router]);

    const handleSelectProfile = (member: Member) => {
        setSelectedProfile(member);
        helpers.setSession(session!.groupId, member.id);
        router.push("/dashboard");
    };

    const handleCreateProfile = (data: {
        name: string;
        initialCash: number;
        holdings: OnboardingHolding[]
    }) => {
        if (!session?.groupId) return;

        const newMember = helpers.createProfile(session.groupId, {
            name: data.name,
            initialCash: data.initialCash,
            initialHoldings: data.holdings,
        });

        helpers.setSession(session.groupId, newMember.id);
        setShowOnboarding(false);
        router.push("/dashboard");
    };

    const handleLogout = () => {
        helpers.clearSession();
        router.push("/");
    };

    if (isLoading || !session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 p-4">
            {/* Background */}
            <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent" />

            <div className="relative z-10 max-w-2xl mx-auto pt-20">
                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-slate-100 mb-2">
                        Welcome to <span className="text-emerald-400">{group.name}</span>
                    </h1>
                    <p className="text-slate-400">
                        Select your profile or create a new one
                    </p>
                </div>

                {/* Profile Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                    {group.members.map((member) => (
                        <button
                            key={member.id}
                            onClick={() => handleSelectProfile(member)}
                            className="group p-6 bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl hover:border-emerald-500/50 hover:bg-slate-800/80 transition-all"
                        >
                            {/* Avatar */}
                            <div
                                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold"
                                style={{
                                    backgroundColor: `hsl(${member.colorHue}, 70%, 25%)`,
                                    color: `hsl(${member.colorHue}, 70%, 70%)`
                                }}
                            >
                                {member.name.charAt(0).toUpperCase()}
                            </div>

                            {/* Name */}
                            <h3 className="text-lg font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors">
                                {member.name}
                            </h3>

                            {/* Stats */}
                            <div className="mt-2 space-y-1 text-sm">
                                <div className="text-slate-400">
                                    Cash: <span className="text-slate-300">{formatCurrency(member.cashBalance)}</span>
                                </div>
                                <div className={member.totalRealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                                    Realized P/L: {member.totalRealizedPnl >= 0 ? "+" : ""}{formatCurrency(member.totalRealizedPnl)}
                                </div>
                            </div>
                        </button>
                    ))}

                    {/* Create Profile Button */}
                    <button
                        onClick={() => setShowOnboarding(true)}
                        className="group p-6 bg-slate-900/50 backdrop-blur-xl border-2 border-dashed border-slate-700 rounded-2xl hover:border-emerald-500/50 hover:bg-slate-800/30 transition-all flex flex-col items-center justify-center min-h-[180px]"
                    >
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <span className="text-slate-400 group-hover:text-emerald-400 font-medium">
                            Create Profile
                        </span>
                    </button>
                </div>

                {/* Logout */}
                <div className="text-center">
                    <button
                        onClick={handleLogout}
                        className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                    >
                        ← Back to login
                    </button>
                </div>
            </div>

            {/* Onboarding Modal */}
            {
                showOnboarding && (
                    <OnboardingModal
                        onClose={() => setShowOnboarding(false)}
                        onComplete={handleCreateProfile}
                    />
                )
            }
        </div >
    );
}
