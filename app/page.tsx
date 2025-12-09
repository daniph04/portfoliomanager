"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePersistentGroupData } from "@/lib/useGroupData";

export default function LoginPage() {
    const router = useRouter();
    const { helpers, session, isLoading, appState } = usePersistentGroupData();

    const [mode, setMode] = useState<"join" | "create">("join");
    const [groupName, setGroupName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    // If already in a session with a profile, go to dashboard
    useEffect(() => {
        if (!isLoading && session?.groupId && session?.profileId) {
            router.push("/dashboard");
        } else if (!isLoading && session?.groupId && !session?.profileId) {
            router.push("/select-profile");
        }
    }, [isLoading, session, router]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const trimmedName = groupName.trim();
        const trimmedPassword = password.trim();

        if (!trimmedName) {
            setError("Por favor ingresa un nombre de grupo");
            return;
        }
        if (!trimmedPassword) {
            setError("Por favor ingresa una contraseña");
            return;
        }

        if (mode === "join") {
            // Try to find and join existing group
            const group = helpers.findGroup(trimmedName, trimmedPassword);
            if (!group) {
                setError("Grupo no encontrado o contraseña incorrecta");
                return;
            }
            helpers.setSession(group.id, null);
            router.push("/select-profile");
        } else {
            // Create new group
            // Check if group name already exists
            const existingGroup = appState.groups.find(
                g => g.name.toLowerCase() === trimmedName.toLowerCase()
            );
            if (existingGroup) {
                setError("Ya existe un grupo con ese nombre");
                return;
            }

            const newGroup = helpers.createGroup(trimmedName, trimmedPassword);
            helpers.setSession(newGroup.id, null);
            router.push("/select-profile");
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
                        <svg
                            className="w-8 h-8 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                            />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-100">Portfolio League</h1>
                    <p className="text-slate-400 mt-2">Compite con tus amigos</p>
                </div>

                {/* Login Card */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl">
                    {/* Toggle Buttons */}
                    <div className="flex gap-2 mb-6">
                        <button
                            type="button"
                            onClick={() => { setMode("join"); setError(""); }}
                            className={`flex-1 py-2.5 rounded-xl font-medium transition-all ${mode === "join"
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-800 text-slate-400 hover:text-white"
                                }`}
                        >
                            Unirse
                        </button>
                        <button
                            type="button"
                            onClick={() => { setMode("create"); setError(""); }}
                            className={`flex-1 py-2.5 rounded-xl font-medium transition-all ${mode === "create"
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-800 text-slate-400 hover:text-white"
                                }`}
                        >
                            Crear Grupo
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Nombre del grupo
                            </label>
                            <input
                                type="text"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                placeholder={mode === "create" ? "Mi grupo de inversión" : "Nombre del grupo..."}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Contraseña
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={mode === "create" ? "Elige una contraseña" : "Contraseña del grupo..."}
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
                            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                        >
                            {mode === "create" ? "Crear Grupo" : "Unirse al Grupo"}
                        </button>
                    </form>

                    <p className="text-center text-slate-500 text-sm mt-6">
                        {mode === "join"
                            ? "Pide el nombre y contraseña al admin del grupo"
                            : "Crea un grupo y comparte las credenciales"}
                    </p>
                </div>
            </div>
        </div>
    );
}
