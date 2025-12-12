"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/hooks/useUser";

type Step = "value" | "holdings" | "group";

export default function SetupPage() {
    const router = useRouter();
    const {
        currentUser,
        isAuthenticated,
        isLoading,
        updateUser,
        addHolding,
        createGroup,
        joinGroup,
        setCurrentGroup,
    } = useUser();

    const [step, setStep] = useState<Step>("value");
    const [portfolioValue, setPortfolioValue] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Group form
    const [groupMode, setGroupMode] = useState<"join" | "create">("create");
    const [groupName, setGroupName] = useState("");
    const [groupPassword, setGroupPassword] = useState("");
    const [groupError, setGroupError] = useState("");

    // Redirect if not authenticated
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/");
        }
    }, [isLoading, isAuthenticated, router]);

    const handleValueSubmit = async () => {
        const value = parseFloat(portfolioValue.replace(/[^0-9.]/g, ""));
        if (isNaN(value) || value < 0) return;

        setIsSubmitting(true);
        try {
            // FINTECH FIX: Initialize netDeposits = initial cash
            await updateUser({
                cashBalance: value,
                netDeposits: value  // Track initial deposit
            });
            setStep("group");
        } catch (error) {
            console.error("Error updating user:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGroupSubmit = async () => {
        if (!groupName.trim() || !groupPassword.trim()) {
            setGroupError("Please fill in all fields");
            return;
        }

        setIsSubmitting(true);
        setGroupError("");

        try {
            if (groupMode === "create") {
                const group = await createGroup(groupName.trim(), groupPassword);
                if (group) {
                    setCurrentGroup(group.id);
                    // Mark setup as complete
                    await updateUser({});
                    router.push("/dashboard");
                } else {
                    setGroupError("Failed to create group");
                }
            } else {
                const result = await joinGroup(groupName.trim(), groupPassword);
                if (result.success && result.group) {
                    setCurrentGroup(result.group.id);
                    router.push("/dashboard");
                } else {
                    setGroupError(result.error || "Failed to join group");
                }
            }
        } catch (error) {
            setGroupError("An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (value: string) => {
        const num = value.replace(/[^0-9.]/g, "");
        if (!num) return "";
        const parsed = parseFloat(num);
        if (isNaN(parsed)) return "";
        return parsed.toLocaleString("en-US");
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            {/* Background */}
            <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent" />

            <div className="relative z-10 w-full max-w-lg">
                {/* Progress indicator */}
                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full transition-all ${step === "value" ? "bg-emerald-500 scale-125" : "bg-emerald-500"}`} />
                        <div className={`w-8 h-0.5 ${step !== "value" ? "bg-emerald-500" : "bg-slate-700"}`} />
                        <div className={`w-3 h-3 rounded-full transition-all ${step === "group" ? "bg-emerald-500 scale-125" : step === "value" ? "bg-slate-700" : "bg-emerald-500"}`} />
                    </div>
                </div>

                {/* Step 1: Portfolio Value */}
                {step === "value" && (
                    <div className="text-center animate-fadeIn">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl mb-6 shadow-lg shadow-emerald-500/30">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>

                        <h1 className="text-3xl font-bold text-slate-100 mb-3">
                            Welcome, {currentUser?.name}! 👋
                        </h1>
                        <p className="text-slate-400 mb-2 text-lg">
                            How much are all your investments worth today?
                        </p>
                        <p className="text-slate-500 text-sm mb-8">
                            Include both cash and existing investments (stocks, ETFs and crypto)
                        </p>

                        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
                            <div className="relative mb-6">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl text-emerald-500 font-bold">
                                    $
                                </span>
                                <input
                                    type="text"
                                    value={formatCurrency(portfolioValue)}
                                    onChange={(e) => setPortfolioValue(e.target.value)}
                                    placeholder="0"
                                    className="w-full pl-12 pr-4 py-5 bg-slate-800 border-2 border-slate-700 focus:border-emerald-500 rounded-2xl text-4xl font-bold text-slate-100 placeholder-slate-600 focus:outline-none transition-all text-center"
                                    autoFocus
                                />
                            </div>

                            <p className="text-slate-500 text-sm mb-6">
                                We&apos;ll treat this as your starting balance inside Portfolio League so you can recreate your positions here over time.
                            </p>

                            <button
                                onClick={handleValueSubmit}
                                disabled={!portfolioValue || isSubmitting}
                                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                            >
                                {isSubmitting ? "Saving..." : "Continue →"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Join/Create Group */}
                {step === "group" && (
                    <div className="text-center animate-fadeIn">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl mb-6 shadow-lg shadow-purple-500/30">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>

                        <h1 className="text-3xl font-bold text-slate-100 mb-3">
                            Ready to compete? 🏆
                        </h1>
                        <p className="text-slate-400 mb-8 text-lg">
                            Join a group to compare portfolios with friends
                        </p>

                        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
                            {/* Toggle */}
                            <div className="flex gap-2 mb-6">
                                <button
                                    onClick={() => { setGroupMode("create"); setGroupError(""); }}
                                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${groupMode === "create"
                                        ? "bg-emerald-600 text-white"
                                        : "bg-slate-800 text-slate-400 hover:text-white"
                                        }`}
                                >
                                    Create Group
                                </button>
                                <button
                                    onClick={() => { setGroupMode("join"); setGroupError(""); }}
                                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${groupMode === "join"
                                        ? "bg-emerald-600 text-white"
                                        : "bg-slate-800 text-slate-400 hover:text-white"
                                        }`}
                                >
                                    Join Group
                                </button>
                            </div>

                            <div className="space-y-4">
                                <input
                                    type="text"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    placeholder={groupMode === "create" ? "Group name..." : "Enter group name..."}
                                    className="w-full px-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <input
                                    type="password"
                                    value={groupPassword}
                                    onChange={(e) => setGroupPassword(e.target.value)}
                                    placeholder={groupMode === "create" ? "Choose password..." : "Group password..."}
                                    className="w-full px-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />

                                {groupError && (
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                                        {groupError}
                                    </div>
                                )}

                                <button
                                    onClick={handleGroupSubmit}
                                    disabled={isSubmitting}
                                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-lg font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                                >
                                    {isSubmitting ? "Loading..." : groupMode === "create" ? "Create & Enter →" : "Join Group →"}
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => setStep("value")}
                            className="mt-6 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            ← Back
                        </button>
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}
