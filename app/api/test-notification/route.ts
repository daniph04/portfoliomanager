import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK (singleton pattern)
const initFirebaseAdmin = () => {
    if (admin.apps.length > 0) {
        return admin.apps[0];
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        return null;
    }

    try {
        return admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
        });
    } catch (error) {
        console.error('Failed to initialize Firebase Admin:', error);
        return null;
    }
};

export async function POST(request: NextRequest) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json({ error: 'Missing token' }, { status: 400 });
        }

        const firebaseApp = initFirebaseAdmin();
        if (!firebaseApp) {
            return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
        }

        // Send test notification
        await admin.messaging().send({
            token,
            notification: {
                title: '🔔 Test Notification',
                body: 'Push notifications are working! You will receive alerts when group members trade.',
            },
            webpush: {
                notification: {
                    icon: '/icon-192.png',
                    badge: '/icon-192.png',
                },
            },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Test notification error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to send test notification'
        }, { status: 500 });
    }
}
