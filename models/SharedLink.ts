import mongoose from 'mongoose';

const SharedLinkSchema = new mongoose.Schema({
    file: { type: mongoose.Schema.Types.ObjectId, ref: 'File', required: true },
    token: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date }, // Optional: Auto-expire links
    views: { type: Number, default: 0 },
    maxDownloads: { type: Number, default: null }, // Optional: Max allowed downloads
    downloads: { type: Number, default: 0 }, // Current download count
});

// Auto-expire documents if expiresAt is set
SharedLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.SharedLink || mongoose.model('SharedLink', SharedLinkSchema);
