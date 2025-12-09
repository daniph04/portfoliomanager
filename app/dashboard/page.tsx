"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePersistentGroupData } from "@/lib/useGroupData";
import TopNav from "@/components/TopNav";
import Sidebar from "@/components/Sidebar";
import OverviewTab from "@/components/OverviewTab";
import LeaderboardTab from "@/components/LeaderboardTab";
import MembersTab from "@/components/MembersTab";
import ActivityTab from "@/components/ActivityTab";

type TabType = "overview" | "leaderboard" | "members" | "activity";

export default function DashboardPage() {
    const router = useRouter();
    const [currentTab, setCurrentTab] = useState<TabType>("overview");
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [memberSearchQuery, setMemberSearchQuery] = useState("");
    const { group, session, helpers, isLoading } = usePersistentGroupData();

    // Current user's profile ID from session
    const currentProfileId = session?.profileId || null;

    // Access guard - redirect if no session
    useEffect(() => {
        if (!isLoading && (!session?.groupId || !session?.profileId)) {
            if (!session?.groupId) {
                router.push("/");
            } else {
                router.push("/select-profile");
            }
        }
    }, [isLoading, session, router]);

    // Auto-select current profile in sidebar, or first member
    useEffect(() => {
        if (!isLoading && group.members.length > 0 && !selectedMemberId) {
            // Default to current user's profile
            if (currentProfileId && group.members.some(m => m.id === currentProfileId)) {
                setSelectedMemberId(currentProfileId);
            } else {
                setSelectedMemberId(group.members[0].id);
            }
        }
    }, [isLoading, group.members, selectedMemberId, currentProfileId]);

    // Get current user's name for display
    const currentProfile = group.members.find(m => m.id === currentProfileId);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (!session?.groupId) {
        return null; // Will redirect
    }

    return (
        <div className="min-h-screen bg-slate-950 pb-20">
            {/* Background gradients */}
            <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/10 via-transparent to-transparent" />

            {/* Main layout */}
            <div className="relative z-10 flex flex-col min-h-screen">
                <TopNav
                    currentTab={currentTab}
                    onTabChange={setCurrentTab}
                    groupName={group.name}
                    currentProfileName={currentProfile?.name}
                />

                {/* Main content - full width on mobile */}
                <main className="flex-1 overflow-y-auto p-4">
                    {currentTab === "overview" && (
                        <OverviewTab group={group} helpers={helpers} />
                    )}
                    {currentTab === "leaderboard" && (
                        <LeaderboardTab group={group} />
                    )}
                    {currentTab === "members" && (
                        <MembersTab
                            group={group}
                            selectedMemberId={selectedMemberId}
                            currentProfileId={currentProfileId}
                            onSelectMember={setSelectedMemberId}
                            helpers={helpers}
                        />
                    )}
                    {currentTab === "activity" && (
                        <ActivityTab group={group} />
                    )}
                </main>
            </div>
        </div>
    );
}
