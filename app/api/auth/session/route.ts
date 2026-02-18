// app/api/auth/session/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = (await cookieStore).get('auth_token');

    if (!token) {
      return NextResponse.json({ isAuthenticated: false }, { status: 401 });
    }

    // Verify Token
    const decoded: any = jwt.verify(token.value, process.env.JWT_SECRET!);
    
    await connectToDatabase();
    const user = await User.findById(decoded.userId);

    if (!user) {
       return NextResponse.json({ isAuthenticated: false }, { status: 401 });
    }

    // Return status
    return NextResponse.json({ 
      isAuthenticated: true, 
      isProfileComplete: user.isProfileComplete 
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ isAuthenticated: false }, { status: 401 });
  }
}