
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import connectToDatabase from '@/lib/db';
import File from '@/models/File';
import SharedLink from '@/models/SharedLink';

export async function POST(req: Request) {
    try {
        const { fileId, maxDownloads, expiresIn } = await req.json();

        if (!fileId) return NextResponse.json({ error: 'File ID required' }, { status: 400 });

        // 1. Auth Check
        const cookieStore = cookies();
        const token = (await cookieStore).get('auth_token');
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded: any = jwt.verify(token.value, process.env.JWT_SECRET!);
        const userId = decoded.userId;

        await connectToDatabase();

        // 2. Verify Ownership
        const file = await File.findOne({ _id: fileId, owner: userId });
        if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });

        // 3. Create Share Link
        // Check if one already exists? Maybe. For now, let's create a new unique one each time 
        // or return existing if we want to dedupe. Let's always create new for granular control.

        // Calculate Expiration
        let expiresAt = null;
        if (expiresIn) {
            const now = new Date();
            if (expiresIn === '1h') expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
            else if (expiresIn === '1d') expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            else if (expiresIn === '7d') expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            else {
                const customDate = new Date(expiresIn);
                if (!isNaN(customDate.getTime()) && customDate > now) {
                    expiresAt = customDate;
                }
            }
        }

        const shareToken = uuidv4();

        await SharedLink.create({
            file: file._id,
            token: shareToken,
            maxDownloads: maxDownloads ? parseInt(maxDownloads) : null,
            expiresAt
        });

        return NextResponse.json({ token: shareToken });

    } catch (error) {
        console.error('Share Error:', error);
        return NextResponse.json({ error: 'Share failed' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'Link ID required' }, { status: 400 });

        // 1. Auth Check
        const cookieStore = cookies();
        const token = (await cookieStore).get('auth_token');
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded: any = jwt.verify(token.value, process.env.JWT_SECRET!);
        const userId = decoded.userId;

        await connectToDatabase();

        // 2. Find Link and Verify File Ownership
        const link = await SharedLink.findById(id).populate('file');

        if (!link) return NextResponse.json({ error: 'Link not found' }, { status: 404 });

        // Handle case where file might have been deleted but link still exists
        // If file is null, we should probably allow deletion anyway by the link creator?
        // But for now, we assume link creator owner must be logged in user.
        // Wait, if file is deleted, link.file is null. 
        // We should check ownership if file exists. If file doesn't exist, maybe anyone can delete?
        // Or better, check if the user who created the link is the one deleting. 
        // But SharedLink schema DOESN'T store creator, only file ref.
        // So we rely on file.owner. If file is gone, link is orphan. 

        if (link.file && link.file.owner.toString() !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await SharedLink.findByIdAndDelete(id);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Delete Link Error:', error);
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}
