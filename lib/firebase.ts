// Firebase configuration for Portfolio League
// Push notifications for group activity

import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: "AIzaSyDrAX2h5u4jZMTsPJSxf_SwSsRYfIF6jMM",
    authDomain: "cloud-messaging-9105d.firebaseapp.com",
    projectId: "cloud-messaging-9105d",
    storageBucket: "cloud-messaging-9105d.firebasestorage.app",
    messagingSenderId: "348783336016",
    appId: "1:348783336016:web:c6541cb94c82a2c8300f55",
    measurementId: "G-CQZ426CQT9"
};

// Initialize Firebase (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// VAPID key for web push - from Firebase Console Cloud Messaging settings
export const VAPID_KEY = "BCcIDAf9wqfoaTGB2Jiflu-K7q8oxCgUIDPTTJygpByvlKZVxYfOOCnabFw-VI0rG25TJfYT_RSr0m7IjH2d154";

let messaging: Messaging | null = null;

// Get messaging instance (only on client side)
export const getMessagingInstance = async (): Promise<Messaging | null> => {
    if (typeof window === 'undefined') return null;

    const supported = await isSupported();
    if (!supported) {
        console.log('Firebase Messaging is not supported in this browser');
        return null;
    }

    if (!messaging) {
        messaging = getMessaging(app);
    }
    return messaging;
};

// Request permission and get FCM token
export const requestPushPermission = async (): Promise<string | null> => {
    try {
        const messagingInstance = await getMessagingInstance();
        if (!messagingInstance) return null;

        // Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Notification permission denied');
            return null;
        }

        // Get FCM token
        const token = await getToken(messagingInstance, { vapidKey: VAPID_KEY });
        console.log('FCM Token:', token);

        return token;
    } catch (error) {
        console.error('Error getting push token:', error);
        return null;
    }
};

// Listen for foreground messages
export const onForegroundMessage = async (callback: (payload: any) => void) => {
    const messagingInstance = await getMessagingInstance();
    if (!messagingInstance) return () => { };

    return onMessage(messagingInstance, (payload) => {
        console.log('Foreground message received:', payload);
        callback(payload);
    });
};

// Save FCM token to database (for server to send notifications)
export const saveFcmToken = async (token: string, userId: string, groupId: string) => {
    // This will be called to save the token to Supabase
    // The server will use this token to send notifications
    const response = await fetch('/api/save-fcm-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, userId, groupId }),
    });
    return response.ok;
};

export { app };
