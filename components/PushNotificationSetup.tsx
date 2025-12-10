"use client";

import { useState, useEffect } from "react";
import { requestPushPermission, onForegroundMessage, saveFcmToken, VAPID_KEY } from "@/lib/firebase";
import { useUser } from "@/lib/hooks/useUser";

export default function PushNotificationSetup() {
    const { currentUser, currentGroup } = useUser();
    const [status, setStatus] = useState<"idle" | "loading" | "enabled" | "denied" | "unsupported">("idle");
    const [error, setError] = useState<string | null>(null);

    // Check if push notifications are supported
    useEffect(() => {
        if (typeof window === 'undefined') return;

        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
            setStatus("unsupported");
            return;
        }

        // Check current permission
        if (Notification.permission === "granted") {
            setStatus("enabled");
            // Register service worker and setup listener
            setupPushNotifications();
        } else if (Notification.permission === "denied") {
            setStatus("denied");
        }
    }, []);

    const setupPushNotifications = async () => {
        try {
            // Register service worker
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('Service Worker registered:', registration);

            // Setup foreground message handler
            onForegroundMessage((payload) => {
                // Show notification even when app is in foreground
                if (Notification.permission === "granted") {
                    new Notification(payload.notification?.title || 'Portfolio League', {
                        body: payload.notification?.body,
                        icon: '/icon-192.png',
                    });
                }
            });
        } catch (err) {
            console.error('Error setting up push notifications:', err);
        }
    };

    const handleEnablePush = async () => {
        if (!currentUser || !currentGroup) {
            setError("Please log in first");
            return;
        }

        setStatus("loading");
        setError(null);

        try {
            // Request permission and get token
            const token = await requestPushPermission();

            if (!token) {
                setStatus("denied");
                setError("Permission denied or not supported");
                return;
            }

            // Save token to database
            const saved = await saveFcmToken(token, currentUser.id, currentGroup.id);

            if (saved) {
                setStatus("enabled");
                // Setup listeners
                await setupPushNotifications();
            } else {
                setError("Failed to save notification token");
                setStatus("idle");
            }
        } catch (err) {
            console.error('Error enabling push:', err);
            setError("Failed to enable notifications");
            setStatus("idle");
        }
    };

    if (status === "unsupported") {
        return (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🔔</span>
                    <div>
                        <h3 className="font-medium text-slate-200">Push Notifications</h3>
                        <p className="text-sm text-slate-500">Not supported in this browser</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🔔</span>
                    <div>
                        <h3 className="font-medium text-slate-200">Push Notifications</h3>
                        <p className="text-sm text-slate-500">
                            {status === "enabled"
                                ? "You'll receive alerts when others trade"
                                : status === "denied"
                                    ? "Blocked in browser settings"
                                    : "Get notified when group members trade"}
                        </p>
                    </div>
                </div>

                {status === "enabled" ? (
                    <div className="flex items-center gap-2 text-emerald-400">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium">Enabled</span>
                    </div>
                ) : status === "loading" ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500" />
                ) : status === "denied" ? (
                    <span className="text-sm text-amber-400">Enable in browser</span>
                ) : (
                    <button
                        onClick={handleEnablePush}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Enable
                    </button>
                )}
            </div>

            {error && (
                <p className="mt-2 text-xs text-red-400">{error}</p>
            )}
        </div>
    );
}
