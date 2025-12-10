"use client";

import { useState, useEffect } from "react";
import {
    isNotificationSupported,
    getNotificationPermission,
    requestNotificationPermission,
    getNotificationPreferences,
    saveNotificationPreferences,
    NotificationPreferences,
} from "@/lib/notifications";

export default function NotificationSettings() {
    const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
    const [prefs, setPrefs] = useState<NotificationPreferences>(getNotificationPreferences());
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setPermission(getNotificationPermission());
        setPrefs(getNotificationPreferences());
    }, []);

    const handleEnableNotifications = async () => {
        setIsLoading(true);
        const result = await requestNotificationPermission();
        setPermission(result);

        if (result === "granted") {
            const newPrefs = { ...prefs, enabled: true };
            setPrefs(newPrefs);
            saveNotificationPreferences(newPrefs);
        }
        setIsLoading(false);
    };

    const handleToggle = (key: keyof NotificationPreferences["types"]) => {
        const newPrefs = {
            ...prefs,
            types: { ...prefs.types, [key]: !prefs.types[key] },
        };
        setPrefs(newPrefs);
        saveNotificationPreferences(newPrefs);
    };

    const handleMasterToggle = () => {
        const newPrefs = { ...prefs, enabled: !prefs.enabled };
        setPrefs(newPrefs);
        saveNotificationPreferences(newPrefs);
    };

    if (permission === "unsupported") {
        return (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🔔</span>
                    <div>
                        <h3 className="font-medium text-slate-200">Notifications</h3>
                        <p className="text-sm text-slate-500">Not supported in this browser</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🔔</span>
                    <div>
                        <h3 className="font-medium text-slate-200">Notifications</h3>
                        <p className="text-sm text-slate-500">
                            {permission === "granted"
                                ? "Manage your notification preferences"
                                : "Get alerts for trades and activity"}
                        </p>
                    </div>
                </div>

                {permission === "granted" ? (
                    <button
                        onClick={handleMasterToggle}
                        className={`relative w-12 h-6 rounded-full transition-colors ${prefs.enabled ? "bg-emerald-500" : "bg-slate-700"
                            }`}
                    >
                        <div
                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${prefs.enabled ? "left-7" : "left-1"
                                }`}
                        />
                    </button>
                ) : (
                    <button
                        onClick={handleEnableNotifications}
                        disabled={isLoading}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isLoading ? "..." : "Enable"}
                    </button>
                )}
            </div>

            {permission === "granted" && prefs.enabled && (
                <div className="space-y-3 pt-3 border-t border-slate-800">
                    <label className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">Trades (Buy/Sell)</span>
                        <input
                            type="checkbox"
                            checked={prefs.types.trades}
                            onChange={() => handleToggle("trades")}
                            className="w-4 h-4 accent-emerald-500"
                        />
                    </label>
                    <label className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">Cash (Deposit/Withdraw)</span>
                        <input
                            type="checkbox"
                            checked={prefs.types.cashFlow}
                            onChange={() => handleToggle("cashFlow")}
                            className="w-4 h-4 accent-emerald-500"
                        />
                    </label>
                    <label className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">Group activity</span>
                        <input
                            type="checkbox"
                            checked={prefs.types.groupActivity}
                            onChange={() => handleToggle("groupActivity")}
                            className="w-4 h-4 accent-emerald-500"
                        />
                    </label>
                </div>
            )}

            {permission === "denied" && (
                <p className="text-xs text-amber-400">
                    ⚠️ Notifications blocked. Enable in browser settings.
                </p>
            )}
        </div>
    );
}
