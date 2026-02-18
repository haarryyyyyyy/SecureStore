import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import File from '@/models/File';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    try {
        const {
            vaultSalt,
            vaultVerifier,
            recoverySalt,
            recoveryEncryptedMasterKey,
            files
        } = await req.json();

        if (!vaultSalt || !vaultVerifier || !recoverySalt || !recoveryEncryptedMasterKey) {
            return NextResponse.json({ error: 'Missing vault parameters' }, { status: 400 });
        }

        const cookieStore = cookies();
        const token = (await cookieStore).get('auth_token');

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const decoded: any = jwt.verify(token.value, process.env.JWT_SECRET!);

        await connectToDatabase();

        // 1. Update User Credentials
        const user = await User.findById(decoded.userId);
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        user.vaultSalt = vaultSalt;
        user.vaultVerifier = vaultVerifier;
        user.recoverySalt = recoverySalt;
        user.recoveryEncryptedMasterKey = recoveryEncryptedMasterKey;
        await user.save();

        // 2. Bulk Update Files
        // files is an array of { id, encryptedKey, iv }
        if (files && files.length > 0) {
            if (files.length > 1000) {
                // In a real app, we'd handle this with a job queue or batches
                console.warn("Large batch update processing...");
            }

            const bulkOps = files.map((file: any) => ({
                updateOne: {
                    filter: { _id: file.id, owner: user._id },
                    update: {
                        encryptedKey: file.encryptedKey,
                        iv: file.iv // IV usually doesn't change for the key wrap unless we regenerate it, which we should
                    }
                }
            }));

            await File.bulkWrite(bulkOps);
        }

        return NextResponse.json({ success: true, message: 'Keys rotated successfully' });

    } catch (error) {
        console.error('Rotate Keys Error:', error);
        return NextResponse.json({ error: 'Key rotation failed' }, { status: 500 });
    }
}
