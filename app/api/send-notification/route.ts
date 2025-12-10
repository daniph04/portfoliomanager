import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This API sends push notifications to all group members except the sender
// Called when someone buys, sells, deposits, withdraws, or joins

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface NotificationPayload {
    groupId: string;
    senderId: string;  // Who triggered the action (will be excluded from notifications)
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
            .neq('user_id', senderId);  // Exclude sender

        if (tokensError) {
            console.error('Error fetching tokens:', tokensError);
            return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 });
        }

        if (!tokens || tokens.length === 0) {
            return NextResponse.json({ success: true, sent: 0, message: 'No recipients' });
        }

        // Send notifications via FCM HTTP v1 API
        // Note: For production, you'd use Firebase Admin SDK
        // This is a simplified version using the legacy HTTP API
        const fcmServerKey = process.env.FCM_SERVER_KEY;

        if (!fcmServerKey) {
            console.log('FCM_SERVER_KEY not configured, skipping push');
            return NextResponse.json({
                success: true,
                sent: 0,
                message: 'FCM not configured - notifications logged only'
            });
        }

        let sentCount = 0;
        const errors: string[] = [];

        for (const { token } of tokens) {
            try {
                const response = await fetch('https://fcm.googleapis.com/fcm/send', {
                    method: 'POST',
                    headers: {
                        'Authorization': `key=${fcmServerKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        to: token,
                        notification: {
                            title,
                            body,
                            icon: '/icon-192.png',
                            click_action: `${process.env.NEXT_PUBLIC_APP_URL || 'https://portfoliomanager.vercel.app'}/dashboard`,
                        },
                        data: {
                            type,
                            symbol,
                            groupId,
                            senderId,
                        },
                    }),
                });

                if (response.ok) {
                    sentCount++;
                } else {
                    const errorText = await response.text();
                    errors.push(errorText);
                }
            } catch (err) {
                errors.push(String(err));
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
