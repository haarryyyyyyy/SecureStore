import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import connectToDatabase from '@/lib/db';
import File from '@/models/File';
import { r2, R2_BUCKET } from '@/lib/r2';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const fileId = searchParams.get('id');
        const emptyTrash = searchParams.get('emptyTrash') === 'true';

        if (!fileId && !emptyTrash) return NextResponse.json({ error: 'File ID or emptyTrash flag required' }, { status: 400 });

        // 1. Auth Check - Duplicate logic, middleware would be better but keeping it simple for now
        const cookieStore = cookies();
        const token = (await cookieStore).get('auth_token');
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded: any = jwt.verify(token.value, process.env.JWT_SECRET!);
        const userId = decoded.userId;

        await connectToDatabase();

        // 1.5 Handle Empty Trash
        if (emptyTrash) {
            const trashedFiles = await File.find({ owner: userId, isTrashed: true });

            if (trashedFiles.length === 0) {
                return NextResponse.json({ message: 'Trash is already empty' });
            }

            // Delete from R2
            await Promise.all(trashedFiles.map(async (file) => {
                try {
                    const command = new DeleteObjectCommand({
                        Bucket: R2_BUCKET,
                        Key: file.r2Key,
                    });
                    await r2.send(command);
                } catch (e) {
                    console.error(`Failed to delete R2 object ${file.r2Key}`, e);
                }
            }));

            // Delete from DB
            await File.deleteMany({ owner: userId, isTrashed: true });

            return NextResponse.json({ message: 'Trash emptied successfully' });
        }

        // 2. Find File & Verify Ownership
        const file = await File.findOne({ _id: fileId, owner: userId });
        if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });

        // 3. Determine Action
        const permanent = searchParams.get('permanent') === 'true';
        const restore = searchParams.get('restore') === 'true';

        if (restore) {
            // RESTORE ACTION
            await File.updateOne({ _id: fileId }, {
                $set: { isTrashed: false },
                $unset: { trashedAt: "" }
            });
            return NextResponse.json({ message: 'File restored successfully' });
        } else if (!permanent) {
            // SOFT DELETE (TRASH)

            await File.updateOne({ _id: fileId }, {
                $set: { isTrashed: true, trashedAt: new Date() }
            });
            return NextResponse.json({ message: 'File moved to trash' });
        }

        // PERMANENT DELETE
        // 4. Delete from R2 (Cloudflare)
        try {
            const command = new DeleteObjectCommand({
                Bucket: R2_BUCKET,
                Key: file.r2Key,
            });
            await r2.send(command);

        } catch (r2Error) {
            console.error("R2 Delete Error (Proceeding with DB delete):", r2Error);
        }

        // 5. Delete from MongoDB
        await File.deleteOne({ _id: fileId });

        return NextResponse.json({ message: 'File deleted successfully' });

    } catch (error) {
        console.error('Delete Error:', error);
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}
