// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// import { serialize } from 'cookie'; // Removed unused import

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    await connectToDatabase();

    // 1. Fetch User (include hidden fields)
    const user = await User.findOne({ email }).select('+password +vaultSalt +vaultVerifier');



    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // 2. CHECK VERIFICATION STATUS
    if (!user.isVerified) {

      return NextResponse.json({ error: 'Please verify your email address to log in.' }, { status: 403 });
    }

    // 2. Generate Token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // 4. PREPARE RESPONSE
    const response = NextResponse.json({
      message: 'Logged in',
      // Send Vault Params for Client-Side Derivation
      vaultSalt: user.vaultSalt,
      vaultVerifier: user.vaultVerifier,
      isProfileComplete: user.isProfileComplete || false
    }, { status: 200 });

    // 3. Set Cookie using Next.js API
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;

  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}