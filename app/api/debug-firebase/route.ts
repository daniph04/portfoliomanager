import { NextResponse } from 'next/server';

// Debug endpoint to check Firebase configuration
export async function GET() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    return NextResponse.json({
        hasProjectId: !!projectId,
        projectId: projectId || 'NOT SET',
        hasClientEmail: !!clientEmail,
        clientEmail: clientEmail ? clientEmail.substring(0, 20) + '...' : 'NOT SET',
        hasPrivateKey: !!privateKey,
        privateKeyLength: privateKey?.length || 0,
        privateKeyStart: privateKey ? privateKey.substring(0, 30) : 'NOT SET',
        privateKeyHasNewlines: privateKey?.includes('\\n') || privateKey?.includes('\n') || false,
    });
}
