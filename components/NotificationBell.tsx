"use client";

import { useState, useEffect } from "react";
import { requestPushPermission, onForegroundMessage, saveFcmToken } from "@/lib/firebase";
import { useUser } from "@/lib/hooks/useUser";

export default function NotificationBell() {
    const { currentUser, currentGroup } = useUser();
    const [status, setStatus] = useState<"idle" | "loading" | "enabled" | "denied" | "unsupported">("idle");
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
            setStatus("unsupported");
            return;
        }

        if (Notification.permission === "granted") {
            setStatus("enabled");
            setupListeners();
        } else if (Notification.permission === "denied") {
            setStatus("denied");
        }
    }, []);

    const setupListeners = async () => {
        try {
            await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            onForegroundMessage((payload) => {
                if (Notification.permission === "granted") {
                    new Notification(payload.notification?.title || 'Portfolio League', {
                        body: payload.notification?.body,
                        icon: '/icon-192.png',
                    });
                }
            });
        } catch (err) {
            console.error('Error setting up listeners:', err);
        }
    };

    const handleClick = async () => {
        if (status === "enabled") {
            setShowTooltip(!showTooltip);
            return;
        }

        if (!currentUser || !currentGroup) return;

        setStatus("loading");

        try {
            const token = await requestPushPermission();

            if (!token) {
                setStatus("denied");
                return;
            }

            await saveFcmToken(token, currentUser.id, currentGroup.id);
            setStatus("enabled");
            await setupListeners();
        } catch (err) {
            console.error('Error enabling push:', err);
            setStatus("idle");
        }
    };

    // Hide completely if unsupported
    if (status === "unsupported") return null;

    return (
        <div className="relative">
            <button
                onClick={handleClick}
                onMouseEnter={() => status === "enabled" && setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className={`relative p-2 rounded-lg transition-all ${status === "enabled"
                        ? "text-emerald-400 hover:bg-emerald-500/10"
                        : status === "denied"
                            ? "text-amber-400 hover:bg-amber-500/10"
                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                title={
                    status === "enabled" ? "Notifications enabled" :
                        status === "denied" ? "Notifications blocked" :
                            "Enable notifications"
                }
            >
                {/* Bell icon */}
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                </svg>

                {/* Status indicator dot */}
                {status === "enabled" && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                )}
                {status === "loading" && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full animate-ping" />
                )}
                {status === "idle" && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-slate-500 rounded-full" />
                )}
            </button>

            {/* Tooltip */}
            {showTooltip && status === "enabled" && (
                <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl text-xs text-slate-300 whitespace-nowrap z-50">
                    ✓ Push notifications active
                </div>
            )}
        </div>
    );
}
