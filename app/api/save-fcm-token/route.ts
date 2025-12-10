import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This API saves FCM tokens for push notifications
// Tokens are stored in Supabase for the server to send notifications

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
    try {
        const { token, userId, groupId } = await request.json();

        if (!token || !userId) {
            return NextResponse.json({ error: 'Missing token or userId' }, { status: 400 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Upsert the FCM token (update if exists, insert if new)
        const { error } = await supabase
            .from('fcm_tokens')
            .upsert({
                user_id: userId,
                token: token,
                group_id: groupId,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,token'
            });

        if (error) {
            console.error('Error saving FCM token:', error);
            return NextResponse.json({ error: 'Failed to save token' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('FCM token API error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
