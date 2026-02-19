import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import PendingSignup from '@/models/PendingSignup';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendEmail } from '@/lib/email';
import { emailTemplates } from '@/lib/email-templates';
import { EMAIL_SENDERS } from '@/lib/email-config';

export async function POST(req: Request) {
  try {
    const { email, password, vaultSalt, vaultVerifier, recoverySalt, recoveryEncryptedMasterKey, recoveryIv } = await req.json();

    if (!email || !password || password.length < 8) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    await connectToDatabase();

    // 1. Check if User already exists (Verified)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // 3. Create or Update Pending Signup
    // Upsert: If email exists in pending, update it. If not, create new.
    await PendingSignup.findOneAndUpdate(
      { email },
      {
        email,
        password: hashedPassword,
        otp,
        otpExpires,
        vaultSalt,
        vaultVerifier,
        recoverySalt,
        recoveryEncryptedMasterKey,
        recoveryIv,
        createdAt: Date.now() // Reset TTL
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 4. Send OTP Email
    await sendEmail({
      to: email,
      subject: "Verify your email - SafeCloud",
      html: emailTemplates.otpEmail(otp),
      sender: EMAIL_SENDERS.auth
    });

    return NextResponse.json({ message: 'OTP sent' }, { status: 200 });

  } catch (error: any) {
    console.error("Signup Error:", error);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}