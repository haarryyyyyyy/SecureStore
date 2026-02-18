import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import File from '@/models/File';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        let userId: string | null = null;

        // 1. Try Bearer Token (Recovery)
        const authHeader = req.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
                if (decoded.type === 'recovery') {
                    userId = decoded.userId;
                }
            } catch (e) { }
        }

        // 2. Try Cookie (Logged In)
        if (!userId) {
            const cookieStore = cookies();
            const token = (await cookieStore).get('auth_token');
            if (token) {
                try {
                    const decoded: any = jwt.verify(token.value, process.env.JWT_SECRET!);
                    userId = decoded.userId;
                } catch (e) { }
            }
        }

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { updates } = await req.json(); // Array of { id, encryptedKey, keyIv }

        if (!Array.isArray(updates) || updates.length === 0) {
            return NextResponse.json({ message: 'No updates provided' });
        }

        await connectToDatabase();

        // Batch Update
        // Using bulkWrite for performance
        const operations = updates.map((update: any) => ({
            updateOne: {
                filter: { _id: update.id, owner: userId },
                update: {
                    $set: {
                        encryptedKey: update.encryptedKey,
                        keyIv: update.keyIv
                    }
                }
            }
        }));

        const result = await File.bulkWrite(operations);

        return NextResponse.json({
            message: 'Files re-keyed successfully',
            modifiedCount: result.modifiedCount
        });

    } catch (error: any) {
        console.error("Rekey Error:", error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
