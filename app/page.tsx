"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/hooks/useUser";

export default function LoginPage() {
    const router = useRouter();
    const { isAuthenticated, isLoading, signIn, signUp, currentUser } = useUser();

    const [mode, setMode] = useState<"login" | "register">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // If already authenticated, check setup status
    useEffect(() => {
        if (!isLoading && isAuthenticated && currentUser) {
            // Check if user has completed setup (has cash balance set or holdings)
            if (currentUser.cashBalance > 0) {
                router.push("/groups");
            } else {
                router.push("/setup");
            }
        }
    }, [isLoading, isAuthenticated, currentUser, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            if (mode === "login") {
                const { error } = await signIn(email, password);
                if (error) {
                    setError(error);
                } else {
                    router.push("/groups");
                }
            } else {
                if (!name.trim()) {
                    setError("Please enter your name");
                    setIsSubmitting(false);
                    return;
                }
                const { error } = await signUp(email, password, name.trim());
                if (error) {
                    setError(error);
                } else {
                    setError("Account created! Check your email to confirm or try signing in.");
                    setMode("login");
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setIsSubmitting(false);
        }
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

            <div className="relative z-10 w-full max-w-md">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mb-4 shadow-lg shadow-emerald-500/20">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-100">Portfolio League</h1>
                    <p className="text-slate-400 mt-2">Compete with your friends</p>
                </div>

                {/* Login Card */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl">
                    {/* Toggle Buttons */}
                    <div className="flex gap-2 mb-6">
                        <button
                            type="button"
                            onClick={() => { setMode("login"); setError(""); }}
                            className={`flex-1 py-2.5 rounded-xl font-medium transition-all ${mode === "login"
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-800 text-slate-400 hover:text-white"
                                }`}
                        >
                            Sign In
                        </button>
                        <button
                            type="button"
                            onClick={() => { setMode("register"); setError(""); }}
                            className={`flex-1 py-2.5 rounded-xl font-medium transition-all ${mode === "register"
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-800 text-slate-400 hover:text-white"
                                }`}
                        >
                            Register
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === "register" && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Your Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="What's your name..."
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@email.com"
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                        >
                            {isSubmitting
                                ? "Loading..."
                                : mode === "register"
                                    ? "Create Account"
                                    : "Sign In"
                            }
                        </button>
                    </form>

                    <p className="text-center text-slate-500 text-sm mt-6">
                        {mode === "login"
                            ? "Don't have an account? Register above"
                            : "Password must be at least 6 characters"
                        }
                    </p>
                </div>
            </div>
        </div>
    );
}
