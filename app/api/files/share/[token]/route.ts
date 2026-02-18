import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import File from '@/models/File';
import SharedLink from '@/models/SharedLink';
import { getPresignedDownloadUrl } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
    try {
        const { token } = await params;

        if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

        await connectToDatabase();

        // 1. Find Link
        // We populate 'file' to get file metadata
        const link = await SharedLink.findOne({ token }).populate('file');

        if (!link || !link.file) {
            return NextResponse.json({ error: 'Link not found or expired' }, { status: 404 });
        }

        // 2. Check Expiry
        if (link.expiresAt && new Date() > link.expiresAt) {
            return NextResponse.json({ error: 'Link expired' }, { status: 410 });
        }

        // 3. Check Download Limit (Peeking only)
        // If limit reached, we can still show the page but maybe disable the button? 
        // Or just return error? Let's return the limit status so UI can decide.
        const limitReached = !!(link.maxDownloads && link.downloads >= link.maxDownloads);

        // 4. Increment Views (Async)
        SharedLink.updateOne({ _id: link._id }, { $inc: { views: 1 } }).exec();

        // 5. Return Metadata (NO Download URL yet)
        return NextResponse.json({
            file: {
                name: link.file.name,
                size: link.file.size,
                mimeType: link.file.mimeType,
                iv: link.file.iv
            },
            limitReached
        });

    } catch (error) {
        console.error('Share GET Error:', error);
        return NextResponse.json({ error: 'Failed to load shared file' }, { status: 500 });
    }
}
