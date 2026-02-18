import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        await connectToDatabase();

        // 1. Find User (Include hidden recovery fields)
        const user = await User.findOne({ email }).select('+recoverySalt +recoveryEncryptedMasterKey +recoveryIv');

        if (!user) {
            // Return fake success to prevent email enumeration, OR return 404 if we don't care about that for this MVP
            // For UX friendless in this project, we'll return 404 so existing check logic works
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (!user.recoverySalt || !user.recoveryEncryptedMasterKey || !user.recoveryIv) {
            return NextResponse.json({
                error: 'Account recovery is not available for this account. Please create a new account to enable modern security features.'
            }, { status: 400 });
        }

        // 2. Generate Temporary Recovery Token
        // This allows the client to call the re-keying endpoints
        const recoveryToken = jwt.sign(
            { userId: user._id, type: 'recovery' },
            process.env.JWT_SECRET!,
            { expiresIn: '15m' }
        );

        return NextResponse.json({
            recoverySalt: user.recoverySalt,
            recoveryEncryptedMasterKey: user.recoveryEncryptedMasterKey,
            recoveryIv: user.recoveryIv,
            recoveryToken
        });

    } catch (error: any) {
        console.error("Recovery Init Error:", error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
