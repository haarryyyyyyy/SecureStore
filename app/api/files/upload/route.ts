import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import connectToDatabase from '@/lib/db';
import File from '@/models/File';
import { r2, R2_BUCKET } from '@/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

export async function POST(req: Request) {
    try {
        // 1. Auth Check
        const cookieStore = cookies();
        const token = (await cookieStore).get('auth_token');
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded: any = jwt.verify(token.value, process.env.JWT_SECRET!);
        const userId = decoded.userId;

        // 2. Parse Form Data
        const formData = await req.formData();
        const file = formData.get('file') as Blob;
        const metadataStr = formData.get('metadata') as string;

        if (!file || !metadataStr) {
            return NextResponse.json({ error: 'Missing file or metadata' }, { status: 400 });
        }

        const { name, size, mimeType, encryptedKey, iv, keyIv } = JSON.parse(metadataStr);

        // 2.1 Check Storage Limit (1GB)
        await connectToDatabase();
        const ONE_GB = 1024 * 1024 * 1024;

        const usageStats = await File.aggregate([
            { $match: { owner: new mongoose.Types.ObjectId(userId) } },
            { $group: { _id: null, totalSize: { $sum: "$size" } } }
        ]);

        const currentUsage = usageStats.length > 0 ? usageStats[0].totalSize : 0;

        if (currentUsage + size > ONE_GB) {
            return NextResponse.json({ error: 'Storage quota exceeded (1GB limit).' }, { status: 403 });
        }

        // 3. Generate R2 Key (Random UUID for storage)
        const r2Key = uuidv4();

        // 4. Upload to R2
        // Convert Blob to ArrayBuffer -> Buffer for AWS SDK
        const buffer = Buffer.from(await file.arrayBuffer());

        const command = new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: r2Key,
            Body: buffer,
            ContentType: 'application/octet-stream', // Generic binary, since it's encrypted
            Metadata: {
                originalName: name, // limit chars if necessary, but good for debugging
                owner: userId
            }
        });

        await r2.send(command);

        // 5. Save to Database
        await connectToDatabase();

        const newFile = await File.create({
            name,
            size,
            mimeType,
            r2Key,
            encryptedKey,
            iv,
            keyIv, // Save the Key IV
            owner: userId
        });

        return NextResponse.json({ message: 'File uploaded successfully', file: newFile });

    } catch (error: any) {
        console.error('Upload Error:', error);
        return NextResponse.json({ error: 'Upload failed: ' + error.message }, { status: 500 });
    }
}

// Next.js config to increase body size limit if needed (default is usually 4MB, might need more)
export const config = {
    api: {
        bodyParser: false, // We handle formData manually? No, Next 13 App Router handles it.
        // Actually, App Router doesn't use 'config' export for size limits the same way.
        // We typically accept defaults or configure in next.config.js
    },
};
