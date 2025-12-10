"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/hooks/useUser";
import TopNav from "@/components/TopNav";
import OverviewTab from "@/components/OverviewTab";
import LeaderboardTab from "@/components/LeaderboardTab";
import MembersTab from "@/components/MembersTab";
import ActivityTab from "@/components/ActivityTab";
import CashModal from "@/components/CashModal";
import { GroupState, Member, Holding, ActivityEvent } from "@/lib/types";
import { GroupDataHelpers } from "@/lib/useGroupData";

type TabType = "overview" | "leaderboard" | "members" | "activity";

export default function DashboardPage() {
    const router = useRouter();
    const [currentTab, setCurrentTab] = useState<TabType>("overview");
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [cashModalOpen, setCashModalOpen] = useState(false);
    const [cashModalMode, setCashModalMode] = useState<"deposit" | "withdraw">("deposit");

    const {
        currentUser,
        isAuthenticated,
        isLoading,
        currentGroup,
        users,
        holdings,
        activity,
        getUserHoldings,
        addHolding,
        updateHolding,
        deleteHolding,
        depositCash,
        withdrawCash,
        refreshData,
    } = useUser();

    // Redirect if not authenticated or no group
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/");
        } else if (!isLoading && isAuthenticated && !currentGroup) {
            router.push("/groups");
        }
    }, [isLoading, isAuthenticated, currentGroup, router]);

    // Auto-select current user
    useEffect(() => {
        if (!isLoading && users.length > 0 && !selectedMemberId) {
            if (currentUser && users.some(u => u.id === currentUser.id)) {
                setSelectedMemberId(currentUser.id);
            } else if (users.length > 0) {
                setSelectedMemberId(users[0].id);
            }
        }
    }, [isLoading, users, selectedMemberId, currentUser]);

    const handleOpenDeposit = () => {
        setCashModalMode("deposit");
        setCashModalOpen(true);
    };

    const handleOpenWithdraw = () => {
        setCashModalMode("withdraw");
        setCashModalOpen(true);
    };

    const handleCashConfirm = async (amount: number) => {
        if (cashModalMode === "deposit") {
            await depositCash(amount);
        } else {
            await withdrawCash(amount);
        }
    };

    // Adapt data to old GroupState format for compatibility with existing components
    const adaptedGroup: GroupState = {
        id: currentGroup?.id || "",
        name: currentGroup?.name || "",
        members: users.map(u => ({
            id: u.id,
            name: u.name,
            colorHue: Math.abs(u.name.charCodeAt(0) * 137) % 360,
            cashBalance: u.cashBalance,
            totalRealizedPnl: u.totalRealizedPnl,
            createdAt: u.createdAt,
        })),
        holdings: holdings.map(h => ({
            id: h.id,
            memberId: h.userId,
            symbol: h.symbol,
            name: h.name,
            assetClass: h.assetClass,
            quantity: h.quantity,
            avgBuyPrice: h.avgBuyPrice,
            currentPrice: h.currentPrice,
            cryptoId: h.cryptoId,
        })),
        activity: activity.map(a => ({
            id: a.id,
            timestamp: a.createdAt,
            memberId: a.userId,
            type: a.type,
            symbol: a.symbol,
            title: a.title,
            description: a.description,
            amountChangeUsd: a.amountChangeUsd,
        })),
        portfolioHistory: [],
    };

    // Adapt helpers to work with Supabase (cast to any to handle async differences)
    const adaptedHelpers: any = {
        updateHoldingPrices: async (priceMap: Record<string, number>) => {
            for (const h of holdings) {
                const newPrice = priceMap[h.symbol];
                if (newPrice !== undefined && newPrice !== h.currentPrice) {
                    await updateHolding(h.id, { currentPrice: newPrice });
                }
            }
        },
        addHolding: async (memberId: string, input: any) => {
            if (memberId !== currentUser?.id) return null;
            const result = await addHolding(input);
            return result ? {
                id: result.id,
                memberId: result.userId,
                symbol: result.symbol,
                name: result.name,
                assetClass: result.assetClass,
                quantity: result.quantity,
                avgBuyPrice: result.avgBuyPrice,
                currentPrice: result.currentPrice,
                cryptoId: result.cryptoId,
            } : null;
        },
        sellHolding: async (holdingId: string) => {
            await deleteHolding(holdingId);
        },
        recordPortfolioSnapshot: () => { },
        getPortfolioHistory: () => [],
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (!isAuthenticated || !currentGroup) {
        return null; // Will redirect
    }

    return (
        <div className="min-h-screen bg-slate-950 pb-20">
            {/* Background gradients */}
            <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/10 via-transparent to-transparent" />

            {/* Cash Balance Bar */}
            {currentUser && (
                <div className="fixed top-16 left-0 right-0 z-30 bg-slate-900/90 backdrop-blur border-b border-slate-800">
                    <div className="flex items-center justify-between px-4 py-2">
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-sm">Cash:</span>
                            <span className="text-emerald-400 font-bold">${currentUser.cashBalance.toLocaleString()}</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleOpenDeposit}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                + Deposit
                            </button>
                            <button
                                onClick={handleOpenWithdraw}
                                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg transition-colors"
                            >
                                − Withdraw
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main layout */}
            <div className="relative z-10 flex flex-col min-h-screen">
                <TopNav
                    currentTab={currentTab}
                    onTabChange={setCurrentTab}
                    groupName={currentGroup.name}
                    currentProfileName={currentUser?.name}
                />

                {/* Main content - add top padding for cash bar */}
                <main className="flex-1 overflow-y-auto p-4 pt-16">
                    {currentTab === "overview" && (
                        <OverviewTab group={adaptedGroup} helpers={adaptedHelpers as GroupDataHelpers} />
                    )}
                    {currentTab === "leaderboard" && (
                        <LeaderboardTab group={adaptedGroup} />
                    )}
                    {currentTab === "members" && (
                        <MembersTab
                            group={adaptedGroup}
                            selectedMemberId={selectedMemberId}
                            currentProfileId={currentUser?.id || null}
                            onSelectMember={setSelectedMemberId}
                            helpers={adaptedHelpers as GroupDataHelpers}
                        />
                    )}
                    {currentTab === "activity" && (
                        <ActivityTab group={adaptedGroup} />
                    )}
                </main>
            </div>

            {/* Cash Modal */}
            <CashModal
                isOpen={cashModalOpen}
                mode={cashModalMode}
                currentBalance={currentUser?.cashBalance || 0}
                onClose={() => setCashModalOpen(false)}
                onConfirm={handleCashConfirm}
            />
        </div>
    );
}
