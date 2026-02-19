
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import PendingSignup from '@/models/PendingSignup';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { sendEmail } from '@/lib/email';
import { emailTemplates } from '@/lib/email-templates';
import { EMAIL_SENDERS } from '@/lib/email-config';

export async function POST(req: Request) {
    try {
        const { email, otp } = await req.json();

        if (!email || !otp) {
            return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
        }

        await connectToDatabase();

        // 1. Try to find in PendingSignup (New Flow)
        const pendingUser = await PendingSignup.findOne({
            email,
            otp,
            otpExpires: { $gt: Date.now() }
        }).select('+password');

        let user;

        if (pendingUser) {
            // MOVE to Real User Collection
            user = await User.create({
                email: pendingUser.email,
                password: pendingUser.password, // Already hashed
                isVerified: true,
                hasVault: true,
                vaultSalt: pendingUser.vaultSalt,
                vaultVerifier: pendingUser.vaultVerifier,
                recoverySalt: pendingUser.recoverySalt,
                recoveryEncryptedMasterKey: pendingUser.recoveryEncryptedMasterKey,
                recoveryIv: pendingUser.recoveryIv,
                // We typically don't store OTP in main User table anymore, or reset it
                otp: undefined,
                otpExpires: undefined
            });
            console.log("User Created:", { id: user._id, email: user.email, isVerified: user.isVerified });

            // Delete pending record
            await PendingSignup.deleteOne({ _id: pendingUser._id });

        } else {
            // 2. Fallback: Check existing User collection (Legacy flow / Retry)
            user = await User.findOne({
                email,
                otp,
                otpExpires: { $gt: Date.now() }
            }).select('+otp +otpExpires');

            if (!user) {
                return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
            }

            // Verify Existing User
            user.isVerified = true;
            user.otp = undefined;
            user.otpExpires = undefined;
            await user.save();
        }

        // 3. Send Welcome Email
        await sendEmail({
            to: email,
            subject: "Welcome to SafeCloud",
            html: emailTemplates.welcomeEmail(email),
            sender: EMAIL_SENDERS.onboarding
        });

        // 4. Generate Auth Token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET!,
            { expiresIn: '7d' }
        );

        const cookieStore = cookies();
        (await cookieStore).set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60
        });

        return NextResponse.json({ message: 'Account verified successfully' });

    } catch (error) {
        console.error("Verification Error:", error);
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }
}
