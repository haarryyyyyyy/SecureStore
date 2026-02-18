import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import connectToDatabase from '@/lib/db';
import File from '@/models/File';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        let userId: string | null = null;
        let isRecovery = false;

        // 1. Auth Strategy: Cookie (Normal) OR Bearer Token (Recovery)
        const cookieStore = cookies();
        const cookieToken = (await cookieStore).get('auth_token');

        if (cookieToken) {
            try {
                const decoded: any = jwt.verify(cookieToken.value, process.env.JWT_SECRET!);
                userId = decoded.userId;
            } catch (e) { }
        }

        if (!userId) {
            // Check Header for Recovery Token
            const authHeader = req.headers.get('authorization');
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                try {
                    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
                    if (decoded.type === 'recovery') {
                        userId = decoded.userId;
                        isRecovery = true;
                    }
                } catch (e) { }
            }
        }

        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await connectToDatabase();

        const { searchParams } = new URL(req.url);
        const trash = searchParams.get('trash') === 'true';
        const keysOnly = searchParams.get('keysOnly') === 'true';

        // RECOVERY MODE: Fetch ALL keys (trash + normal)
        if (isRecovery && keysOnly) {
            const files = await File.find({ owner: userId }).select('_id encryptedKey keyIv');
            return NextResponse.json({ files });
        }

        // NORMAL MODE
        const query = {
            owner: userId,
            isTrashed: trash ? true : { $ne: true }
        };
        const files = await File.find(query).sort({ createdAt: -1 });

        return NextResponse.json({ files });

    } catch (error) {
        console.error('List Files Error:', error);
        return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
    }
}
