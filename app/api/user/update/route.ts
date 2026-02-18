import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    // Removed 'phone' from here
    const { name, gender, country, dob } = await req.json();

    const cookieStore = cookies();
    const token = (await cookieStore).get('auth_token');

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded: any = jwt.verify(token.value, process.env.JWT_SECRET!);
    
    await connectToDatabase();

    await User.findByIdAndUpdate(decoded.userId, {
      name,
      gender,
      country,
      dob,
      isProfileComplete: true 
    });

    return NextResponse.json({ message: 'Profile updated' }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}