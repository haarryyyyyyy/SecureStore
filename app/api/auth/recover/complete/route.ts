import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { sendEmail } from '@/lib/email';
import { emailTemplates } from '@/lib/email-templates';
import { EMAIL_SENDERS } from '@/lib/email-config';

export async function POST(req: Request) {
    try {
        const {
            recoveryToken,
            password,
            vaultSalt,
            vaultVerifier,
            recoverySalt,
            recoveryEncryptedMasterKey
        } = await req.json();

        if (!recoveryToken || !password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const decoded: any = jwt.verify(recoveryToken, process.env.JWT_SECRET!);
        if (decoded.type !== 'recovery') {
            return NextResponse.json({ error: 'Invalid token type' }, { status: 403 });
        }

        await connectToDatabase();

        const hashedPassword = await bcrypt.hash(password, 12);

        // Update User
        await User.updateOne({ _id: decoded.userId }, {
            $set: {
                password: hashedPassword,
                vaultSalt,
                vaultVerifier,
                recoverySalt,
                recoveryEncryptedMasterKey
            }
        });

        // Generate Login Token (Auto-login)
        const authToken = jwt.sign(
            { userId: decoded.userId, email: decoded.email }, // assuming email might not be in token, but userId is key
            process.env.JWT_SECRET!,
            { expiresIn: '7d' }
        );

        // Set Cookie
        const cookieStore = cookies();
        (await cookieStore).set('auth_token', authToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 // 7 days
        });

        // Send Recovery Confirmation
        await sendEmail({
            to: decoded.email,
            subject: "Account Access Restored",
            html: emailTemplates.recoverySuccessEmail(),
            sender: EMAIL_SENDERS.security
        });

        return NextResponse.json({ message: 'Recovery complete' });

    } catch (error: any) {
        console.error("Recovery Complete Error:", error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
