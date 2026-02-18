
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import connectToDatabase from '@/lib/db';
import File from '@/models/File';
import SharedLink from '@/models/SharedLink';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        // 1. Auth Check
        const cookieStore = cookies();
        const token = (await cookieStore).get('auth_token');
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded: any = jwt.verify(token.value, process.env.JWT_SECRET!);
        const userId = decoded.userId;

        await connectToDatabase();

        // 2. Find all files owned by user
        const userFiles = await File.find({ owner: userId }).select('_id');
        const fileIds = userFiles.map(f => f._id);

        if (fileIds.length === 0) {
            return NextResponse.json({ links: [] });
        }

        // 3. Find SharedLinks for these files
        const links = await SharedLink.find({ file: { $in: fileIds } })
            .populate('file', 'name size mimeType')
            .sort({ createdAt: -1 });

        return NextResponse.json({ links });

    } catch (error) {
        console.error('Shared Links List Error:', error);
        return NextResponse.json({ error: 'Failed to fetch shared links' }, { status: 500 });
    }
}
