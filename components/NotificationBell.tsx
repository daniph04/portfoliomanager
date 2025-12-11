"use client";

import { useState, useEffect, useRef } from "react";
import { requestPushPermission, onForegroundMessage, saveFcmToken, getMessagingInstance, VAPID_KEY } from "@/lib/firebase";
import { getToken } from "firebase/messaging";
import { useUser } from "@/lib/hooks/useUser";

export default function NotificationBell() {
    const { currentUser, currentGroup } = useUser();
    const [status, setStatus] = useState<"idle" | "loading" | "enabled" | "denied" | "unsupported">("idle");
    const [showPopup, setShowPopup] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
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
                setTestResult(null);
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
        } catch (err) {
            console.error('Error enabling push:', err);
            setStatus("idle");
        }
    };

    const handleTestNotification = async () => {
        setIsTesting(true);
        setTestResult(null);

        try {
            const messagingInstance = await getMessagingInstance();
            if (!messagingInstance) {
                throw new Error("Messaging not available");
            }

            const token = await getToken(messagingInstance, { vapidKey: VAPID_KEY });

            const response = await fetch('/api/test-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });

            if (response.ok) {
                setTestResult("success");
            } else {
                setTestResult("error");
            }
        } catch (err) {
            console.error('Test notification error:', err);
            setTestResult("error");
        } finally {
            setIsTesting(false);
        }
    };

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
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                </svg>

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

            {showPopup && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40 bg-black/50"
                        onClick={() => {
                            setShowPopup(false);
                            setTestResult(null);
                        }}
                    />

                    {/* Bottom Sheet - Mobile Friendly */}
                    <div
                        className="fixed inset-x-0 bottom-0 z-50 transform transition-transform duration-300 ease-out"
                        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                    >
                        <div className="bg-slate-900 border-t border-white/10 rounded-t-3xl shadow-2xl max-h-[70vh] overflow-y-auto">
                            {/* Handle */}
                            <div className="flex justify-center pt-3 pb-2">
                                <div className="w-10 h-1 rounded-full bg-slate-600" />
                            </div>

                            <div className="px-4 pb-6">
                                {/* Header */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                                            />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">Push Notifications</h3>
                                        <p className="text-sm text-slate-400">
                                            {status === "enabled" ? "Notifications are active" : "Stay updated with your group"}
                                        </p>
                                    </div>
                                </div>

                                {status === "enabled" ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                            <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            <span className="text-emerald-400 font-medium">Notifications enabled!</span>
                                        </div>
                                        <p className="text-sm text-slate-400">
                                            You&apos;ll receive alerts when other group members buy, sell, or join.
                                        </p>

                                        <button
                                            onClick={handleTestNotification}
                                            disabled={isTesting}
                                            className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-medium rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isTesting ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-slate-500 border-t-white rounded-full animate-spin" />
                                                    Sending...
                                                </>
                                            ) : (
                                                <>
                                                    <span>🧪</span>
                                                    Send Test Notification
                                                </>
                                            )}
                                        </button>

                                        {testResult === "success" && (
                                            <p className="text-sm text-emerald-400 text-center">✓ Check your notifications!</p>
                                        )}
                                        {testResult === "error" && (
                                            <p className="text-sm text-red-400 text-center">Failed to send. Try again.</p>
                                        )}
                                    </div>
                                ) : status === "denied" ? (
                                    <div className="space-y-4">
                                        <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                            <p className="text-sm text-amber-400">
                                                Notifications are blocked in your browser settings.
                                            </p>
                                        </div>
                                        <p className="text-sm text-slate-400">
                                            To enable, go to your browser settings and allow notifications for this site.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-sm text-slate-300 mb-2">
                                            Get notified when group members:
                                        </p>
                                        <ul className="space-y-3">
                                            <li className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                                                <span className="text-xl">📈</span>
                                                <span className="text-slate-300">Buy new positions</span>
                                            </li>
                                            <li className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                                                <span className="text-xl">📉</span>
                                                <span className="text-slate-300">Sell holdings</span>
                                            </li>
                                            <li className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                                                <span className="text-xl">👋</span>
                                                <span className="text-slate-300">Join the group</span>
                                            </li>
                                        </ul>

                                        <button
                                            onClick={handleEnableClick}
                                            disabled={status === "loading"}
                                            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                                        >
                                            {status === "loading" ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                    </div>
                </>
            )}
        </div>
    );
}
