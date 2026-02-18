
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import SharedLink from '@/models/SharedLink';
import File from '@/models/File'; // Needed for population? Mongoose should handle it.
import { getPresignedDownloadUrl } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
    try {
        const { token } = await params;

        if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

        await connectToDatabase();

        // 1. Find Link
        const link = await SharedLink.findOne({ token }).populate('file');

        if (!link || !link.file) {
            return NextResponse.json({ error: 'Link not found or expired' }, { status: 404 });
        }

        // 2. Check Expiry
        if (link.expiresAt && new Date() > link.expiresAt) {
            return NextResponse.json({ error: 'Link expired' }, { status: 410 });
        }

        // 3. STRICT CHECK: Download Limit
        if (link.maxDownloads && link.downloads >= link.maxDownloads) {
            return NextResponse.json({ error: 'Download limit reached' }, { status: 403 });
        }

        // 4. Increment Downloads
        await SharedLink.updateOne({ _id: link._id }, { $inc: { downloads: 1 } });

        // 5. Generate Presigned URL
        const downloadUrl = await getPresignedDownloadUrl(link.file.r2Key);

        return NextResponse.json({ downloadUrl });

    } catch (error) {
        console.error('Share Download Error:', error);
        return NextResponse.json({ error: 'Failed to initiate download' }, { status: 500 });
    }
}
