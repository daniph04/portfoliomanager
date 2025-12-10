"use client";

import { useState, useEffect, useRef } from "react";
import { requestPushPermission, onForegroundMessage, saveFcmToken } from "@/lib/firebase";
import { useUser } from "@/lib/hooks/useUser";

export default function NotificationBell() {
    const { currentUser, currentGroup } = useUser();
    const [status, setStatus] = useState<"idle" | "loading" | "enabled" | "denied" | "unsupported">("idle");
    const [showPopup, setShowPopup] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);

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

    // Close popup when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                setShowPopup(false);
            }
        };

        if (showPopup) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showPopup]);

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

    const handleEnableClick = async () => {
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
            setShowPopup(false);
        } catch (err) {
            console.error('Error enabling push:', err);
            setStatus("idle");
        }
    };

    // Hide completely if unsupported
    if (status === "unsupported") return null;

    return (
        <div className="relative" ref={popupRef}>
            <button
                onClick={() => setShowPopup(!showPopup)}
                className={`relative p-2 rounded-lg transition-all ${status === "enabled"
                        ? "text-emerald-400 hover:bg-emerald-500/10"
                        : status === "denied"
                            ? "text-amber-400 hover:bg-amber-500/10"
                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
            >
                {/* Bell icon */}
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                </svg>

                {/* Status indicator dot */}
                {status === "enabled" && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-400 rounded-full" />
                )}
                {status === "loading" && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full animate-ping" />
                )}
                {status === "idle" && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-slate-500 rounded-full" />
                )}
            </button>

            {/* Popup */}
            {showPopup && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                    <div className="p-4">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">Push Notifications</h3>
                                <p className="text-xs text-slate-400">
                                    {status === "enabled" ? "Active" : "Stay updated"}
                                </p>
                            </div>
                        </div>

                        {/* Content based on status */}
                        {status === "enabled" ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span>Notifications enabled!</span>
                                </div>
                                <p className="text-xs text-slate-400">
                                    You&apos;ll receive alerts when other group members buy, sell, or make changes to their portfolios.
                                </p>
                            </div>
                        ) : status === "denied" ? (
                            <div className="space-y-3">
                                <p className="text-sm text-slate-300">
                                    Notifications are blocked in your browser settings.
                                </p>
                                <p className="text-xs text-amber-400">
                                    To enable, go to your browser settings and allow notifications for this site.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-sm text-slate-300">
                                    Get notified when group members:
                                </p>
                                <ul className="text-xs text-slate-400 space-y-1.5">
                                    <li className="flex items-center gap-2">
                                        <span className="text-emerald-400">📈</span> Buy new positions
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-red-400">📉</span> Sell holdings
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-cyan-400">💰</span> Deposit or withdraw cash
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-purple-400">👋</span> Join the group
                                    </li>
                                </ul>

                                <button
                                    onClick={handleEnableClick}
                                    disabled={status === "loading"}
                                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-medium rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {status === "loading" ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Enabling...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                            </svg>
                                            Enable Notifications
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
