import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK (singleton pattern)
const initFirebaseAdmin = () => {
    if (admin.apps.length > 0) {
        return admin.apps[0];
    }

    // Check for required environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        console.log('Firebase Admin SDK not configured - missing env vars');
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface NotificationPayload {
    groupId: string;
    senderId: string;
    title: string;
    body: string;
    type: 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAW' | 'JOIN';
    symbol?: string;
}

export async function POST(request: NextRequest) {
    try {
        const payload: NotificationPayload = await request.json();
        const { groupId, senderId, title, body, type, symbol } = payload;

        if (!groupId || !senderId || !title || !body) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get all FCM tokens for the group EXCEPT the sender
        const { data: tokens, error: tokensError } = await supabase
            .from('fcm_tokens')
            .select('token, user_id')
            .eq('group_id', groupId)
            .neq('user_id', senderId);

        if (tokensError) {
            console.error('Error fetching tokens:', tokensError);
            return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 });
        }

        if (!tokens || tokens.length === 0) {
            return NextResponse.json({ success: true, sent: 0, message: 'No recipients' });
        }

        // Initialize Firebase Admin
        const firebaseApp = initFirebaseAdmin();
        if (!firebaseApp) {
            console.log('Firebase Admin not configured, notifications logged only');
            return NextResponse.json({
                success: true,
                sent: 0,
                message: 'Firebase not configured'
            });
        }

        let sentCount = 0;
        const errors: string[] = [];

        // Send to each token using FCM V1 API
        for (const { token } of tokens) {
            try {
                await admin.messaging().send({
                    token,
                    notification: {
                        title,
                        body,
                    },
                    webpush: {
                        notification: {
                            icon: '/icon-192.png',
                            badge: '/icon-192.png',
                        },
                        fcmOptions: {
                            link: `${process.env.NEXT_PUBLIC_APP_URL || 'https://portfoliomanager.vercel.app'}/dashboard`,
                        },
                    },
                    data: {
                        type,
                        symbol: symbol || '',
                        groupId,
                        senderId,
                    },
                });
                sentCount++;
            } catch (err: any) {
                // If token is invalid, we should remove it from the database
                if (err.code === 'messaging/invalid-registration-token' ||
                    err.code === 'messaging/registration-token-not-registered') {
                    await supabase.from('fcm_tokens').delete().eq('token', token);
                    console.log('Removed invalid token:', token.substring(0, 20) + '...');
                }
                errors.push(err.message || String(err));
            }
        }

        return NextResponse.json({
            success: true,
            sent: sentCount,
            total: tokens.length,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        console.error('Send notification API error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
