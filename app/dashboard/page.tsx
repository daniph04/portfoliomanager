"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/hooks/useUser";
import TopNav from "@/components/TopNav";
import OverviewTab from "@/components/OverviewTab";
import LeaderboardTab from "@/components/LeaderboardTab";
import MembersTab from "@/components/MembersTab";
import MyPortfolioTab from "@/components/MyPortfolioTab";
import ActivityTab from "@/components/ActivityTab";
import CashModal from "@/components/CashModal";
import { GroupState, Season, PortfolioSnapshot } from "@/lib/types";
import { GroupDataHelpers } from "@/lib/useGroupData";

type TabType = "portfolio" | "overview" | "investors" | "leaderboard" | "activity";

export default function DashboardPage() {
    const router = useRouter();
    const [currentTab, setCurrentTab] = useState<TabType>("portfolio");
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
        addHolding,
        updateHolding,
        deleteHolding,
        depositCash,
        withdrawCash,
        addActivity,
    } = useUser();

    // Client-side seasons state (persisted in localStorage since Supabase doesn't have seasons table yet)
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [currentSeasonId, setCurrentSeasonId] = useState<string | undefined>(undefined);
    const [portfolioHistory, setPortfolioHistory] = useState<PortfolioSnapshot[]>([]);

    // Load seasons and snapshots from localStorage
    useEffect(() => {
        if (!currentGroup?.id) return;
        const storageKey = `seasons_${currentGroup.id}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setSeasons(parsed.seasons || []);
                setCurrentSeasonId(parsed.currentSeasonId);
            } catch (e) {
                console.error("Failed to parse seasons from localStorage", e);
            }
        }

        // Load snapshots
        const snapshotsKey = `snapshots_${currentGroup.id}`;
        const storedSnapshots = localStorage.getItem(snapshotsKey);
        if (storedSnapshots) {
            try {
                const parsed: PortfolioSnapshot[] = JSON.parse(storedSnapshots);
                const normalized = parsed.map(s => ({
                    ...s,
                    timestamp: typeof s.timestamp === "string" ? new Date(s.timestamp).getTime() : s.timestamp,
                    totalCurrentValue: s.totalCurrentValue ?? s.totalValue,
                }));
                setPortfolioHistory(normalized);
            } catch (e) {
                console.error("Failed to parse snapshots from localStorage", e);
            }
        }
    }, [currentGroup?.id]);

    // Save seasons to localStorage whenever they change
    useEffect(() => {
        if (!currentGroup?.id) return;
        const storageKey = `seasons_${currentGroup.id}`;
        localStorage.setItem(storageKey, JSON.stringify({ seasons, currentSeasonId }));
    }, [seasons, currentSeasonId, currentGroup?.id]);

    // Save snapshots to localStorage
    useEffect(() => {
        if (!currentGroup?.id) return;
        const snapshotsKey = `snapshots_${currentGroup.id}`;
        localStorage.setItem(snapshotsKey, JSON.stringify(portfolioHistory));
    }, [portfolioHistory, currentGroup?.id]);

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

    // Helper to capture portfolio snapshots for performance charts
    const computeMemberSnapshot = useCallback((userId: string) => {
        const user = users.find(u => u.id === userId);
        if (!user) return null;

        const userHoldings = holdings.filter(h => h.userId === user.id);
        const holdingsValue = userHoldings.reduce((sum, h) => sum + (h.quantity * h.currentPrice), 0);
        const holdingsCost = userHoldings.reduce((sum, h) => sum + (h.quantity * h.avgBuyPrice), 0);

        return {
            totalValue: holdingsValue + user.cashBalance,
            costBasis: holdingsCost + user.cashBalance,
        };
    }, [holdings, users]);

    // Helper to capture portfolio snapshots for performance charts
    const captureSnapshots = useCallback(() => {
        if (!currentGroup || users.length === 0) return;

        const timestamp = Date.now();
        const newSnapshots: PortfolioSnapshot[] = [];

        // Capture snapshot for each user
        users.forEach(user => {
            const snapshot = computeMemberSnapshot(user.id);
            if (!snapshot) return;

            newSnapshots.push({
                id: `${user.id}_${timestamp}`,
                timestamp,
                memberId: user.id,
                totalValue: snapshot.totalValue,
                totalCurrentValue: snapshot.totalValue,
                costBasis: snapshot.costBasis,
                scope: "user",
                entityId: user.id,
            });
        });

        // Capture group-level snapshot
        const groupTotals = newSnapshots.reduce((acc, s) => {
            return {
                totalValue: acc.totalValue + s.totalValue,
                costBasis: acc.costBasis + s.costBasis,
            };
        }, { totalValue: 0, costBasis: 0 });

        newSnapshots.push({
            id: `group_${currentGroup.id}_${timestamp}`,
            timestamp,
            memberId: currentGroup.id,
            totalValue: groupTotals.totalValue,
            totalCurrentValue: groupTotals.totalValue,
            costBasis: groupTotals.costBasis,
            scope: "group",
            entityId: currentGroup.id,
        });

        // Add to history, keeping only last 1000 snapshots to avoid bloat
        setPortfolioHistory(prev => {
            const combined = [...prev, ...newSnapshots];
            return combined.slice(-1000);
        });
    }, [computeMemberSnapshot, currentGroup, users]);

    // Capture snapshots when holdings or users change (throttle to avoid too many)
    useEffect(() => {
        if (!isLoading && currentGroup && users.length > 0) {
            // Delay to batch multiple rapid changes
            const timeoutId = setTimeout(() => {
                captureSnapshots();
            }, 1000);
            return () => clearTimeout(timeoutId);
        }
    }, [captureSnapshots, currentGroup, holdings, isLoading, users.length]);

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
        captureSnapshots();
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
        portfolioHistory: portfolioHistory,
        seasons: seasons,
        leaderId: currentGroup?.createdBy,
        currentSeasonId: currentSeasonId,
    };

    // Season handlers
    const handleStartSeason = async () => {
        if (!currentGroup || !currentUser) return;

        const seasonNumber = seasons.length + 1;
        const newSeason: Season = {
            id: `season_${seasonNumber}`,
            name: `Season ${seasonNumber}`,
            startTime: new Date().toISOString(),
            leaderId: currentUser.id,
            memberSnapshots: {},
        };

        // Capture each member's current portfolio value as their season baseline
        users.forEach(user => {
            const snapshot = computeMemberSnapshot(user.id);
            newSeason.memberSnapshots[user.id] = snapshot?.totalValue ?? 0;
        });

        setSeasons(prev => [...prev, newSeason]);
        setCurrentSeasonId(newSeason.id);
        captureSnapshots();

        // Add activity event for season start
        if (addActivity && currentGroup) {
            await addActivity(
                currentGroup.id,
                "SEASON_STARTED",
                `Started ${newSeason.name}`,
                `${currentUser.name || "Someone"} started a new season`
            );
        }
    };

    const handleEndSeason = async () => {
        if (!currentSeasonId || !currentGroup || !currentUser) return;

        const endingSeason = seasons.find(s => s.id === currentSeasonId);

        // Log activity event for season end
        if (addActivity && currentGroup) {
            await addActivity(
                currentGroup.id,
                "SEASON_ENDED",
                `Ended ${endingSeason?.name || 'season'}`,
                `${currentUser.name || "Someone"} ended the season`
            );
        }

        // Clear current season
        setCurrentSeasonId(undefined);
        captureSnapshots();
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
            captureSnapshots();
        },
        addHolding: async (memberId: string, input: any) => {
            if (memberId !== currentUser?.id) return null;
            const result = await addHolding(input);
            const normalized = result ? {
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

            captureSnapshots();
            return normalized;
        },
        updateHolding: async (holdingId: string, partial: any) => {
            await updateHolding(holdingId, {
                quantity: partial.quantity,
                avgBuyPrice: partial.avgBuyPrice,
                currentPrice: partial.currentPrice,
            });
            captureSnapshots();
        },
        sellHolding: async (holdingId: string) => {
            await deleteHolding(holdingId);
            captureSnapshots();
        },
        recordPortfolioSnapshot: () => captureSnapshots(),
        recordAllMembersSnapshot: () => captureSnapshots(),
        getPortfolioHistory: () => portfolioHistory,
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



            {/* Main layout */}
            <div className="relative z-10 flex flex-col min-h-screen">
                <TopNav
                    currentTab={currentTab}
                    onTabChange={setCurrentTab}
                    groupName={currentGroup.name}
                    currentProfileName={currentUser?.name}
                />

                {/* Main content */}
                <main className="flex-1 overflow-y-auto p-4">
                    {currentTab === "portfolio" && (
                        <MyPortfolioTab
                            group={adaptedGroup}
                            currentProfileId={currentUser?.id || ""}
                            cashBalance={currentUser?.cashBalance || 0}
                            onDeposit={handleOpenDeposit}
                            onWithdraw={handleOpenWithdraw}
                            helpers={adaptedHelpers as GroupDataHelpers}
                        />
                    )}
                    {currentTab === "overview" && (
                        <OverviewTab group={adaptedGroup} helpers={adaptedHelpers as GroupDataHelpers} />
                    )}
                    {currentTab === "investors" && (
                        <MembersTab
                            group={adaptedGroup}
                            selectedMemberId={selectedMemberId}
                            currentProfileId={currentUser?.id || null}
                            cashBalance={currentUser?.cashBalance || 0}
                            onSelectMember={setSelectedMemberId}
                            onDeposit={handleOpenDeposit}
                            onWithdraw={handleOpenWithdraw}
                            helpers={adaptedHelpers as GroupDataHelpers}
                            readOnly={true}
                        />
                    )}
                    {currentTab === "leaderboard" && (
                        <LeaderboardTab
                            group={adaptedGroup}
                            isLeader={currentUser?.id === adaptedGroup.leaderId}
                            onStartSeason={handleStartSeason}
                            onEndSeason={handleEndSeason}
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
