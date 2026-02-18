import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { sendEmail } from '@/lib/email';
import { emailTemplates } from '@/lib/email-templates';

export async function POST(req: Request) {
    try {
        const {
            currentPassword, newPassword,
            vaultSalt, vaultVerifier,
            recoverySalt, recoveryEncryptedMasterKey, recoveryIv
        } = await req.json();

        if (!currentPassword || !newPassword || newPassword.length < 8) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }

        const cookieStore = cookies();
        const token = (await cookieStore).get('auth_token');

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const decoded: any = jwt.verify(token.value, process.env.JWT_SECRET!);

        await connectToDatabase();

        const user = await User.findById(decoded.userId).select('+password');
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        user.password = hashedPassword;

        // Update Vault & Recovery Params if provided (Re-keying)
        if (vaultSalt && vaultVerifier && recoverySalt && recoveryEncryptedMasterKey && recoveryIv) {
            user.vaultSalt = vaultSalt;
            user.vaultVerifier = vaultVerifier;
            user.recoverySalt = recoverySalt;
            user.recoveryEncryptedMasterKey = recoveryEncryptedMasterKey;
            user.recoveryIv = recoveryIv;
        }

        await user.save();

        // Send Security Alert Email
        await sendEmail({
            to: user.email,
            subject: "Security Alert: Password Changed",
            html: emailTemplates.passwordChangeEmail()
        });

        return NextResponse.json({ message: 'Password updated successfully' });

    } catch (error) {
        console.error('Change Password Error:', error);
        return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }
}
